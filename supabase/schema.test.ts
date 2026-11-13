import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { canTransition, ORDER_STATUSES, type Actor } from "../src/lib/domain/order-state";

/**
 * Runs the real migration in an in-process Postgres (PGlite) and checks the security model.
 * Supabase-specific pieces (auth.users, auth.uid(), the anon/authenticated/service_role roles) are stubbed below.
 * This is a strong check of RLS, grants and functions, but it is NOT your live Supabase project.
 */
let db: PGlite;
const migration = readFileSync(new URL("./migrations/0001_core_schema.sql", import.meta.url), "utf8");

const SHIM = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
`;

let current = "service";
async function as(who: string | "anon" | "service") {
  current = who;
  await db.exec("reset role");
  if (who === "service") { await db.query("select set_config('request.jwt.claim.sub', '', false)"); await db.exec("set role service_role"); return; }
  if (who === "anon") { await db.query("select set_config('request.jwt.claim.sub', '', false)"); await db.exec("set role anon"); return; }
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [who]);
  await db.exec("set role authenticated");
}
const q = async <T = Record<string, unknown>>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows;
const fails = async (p: Promise<unknown>, match?: RegExp) => {
  let err: unknown;
  try { await p; } catch (e) { err = e; }
  expect(err, "expected the statement to be rejected").toBeDefined();
  if (match) expect(String((err as Error).message)).toMatch(match);
};

const U: Record<string, string> = {};
async function addUser(name: string, role = "both") {
  await db.exec("reset role");
  const r = await q<{ id: string }>("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [`${name}@t.dev`, JSON.stringify({ name, role })]);
  U[name] = r[0].id;
  return r[0].id;
}
async function newService(seller: string, title = "Landing page build", status = "published") {
  await as(U[seller]);
  const [s] = await q<{ id: string }>(
    "insert into services (seller_id, category_slug, slug, title, description, status) values ($1,'development',$2,$3,'A responsive landing page for your product.',$4) returning id",
    [U[seller], title.toLowerCase().replace(/\W+/g, "-") + Math.random().toString(36).slice(2, 6), title, status]);
  await q("insert into service_packages (service_id, tier, price_minor, currency, delivery_days, revisions) values ($1,'basic',10000,'USD',3,1)", [s.id]);
  return s.id;
}
const orderRow = async (id: string) => {
  const prev = current;
  await as("service");
  const row = (await q<Record<string, unknown>>("select * from orders where id=$1", [id]))[0];
  await as(prev);
  return row;
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SHIM);
  await db.exec(migration);
  await db.exec(`grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role;`);
  for (const n of ["fiona", "carl", "eve", "admin"]) await addUser(n);
  await db.exec(`insert into admin_users (user_id) values ('${U.admin}')`);
}, 60_000);

describe("identity and privileges", () => {
  it("creates a profile with a unique username for every new auth user", async () => {
    await addUser("fiona2");
    await db.exec("reset role");
    await db.exec(`update auth.users set raw_user_meta_data='{"name":"Fiona"}' where id='${U.fiona2}'`);
    const r = await q<{ username: string }>("select username from profiles order by username");
    expect(new Set(r.map((x) => x.username)).size).toBe(r.length);
    const [c] = await q<{ is_client: boolean; is_freelancer: boolean }>("select is_client,is_freelancer from profiles where id=$1", [U.fiona]);
    expect(c).toEqual({ is_client: true, is_freelancer: true });
  });
  it("lets users edit their own profile but not protected fields or other people", async () => {
    await as(U.carl);
    await q("update profiles set headline='Hello' where id=$1", [U.carl]);
    await fails(q("update profiles set suspended=true where id=$1", [U.carl]), /permission denied/);
    const other = await db.query("update profiles set headline='hacked' where id=$1 returning id", [U.fiona]);
    expect(other.rows).toHaveLength(0);
    await fails(q("insert into profiles (id, username, display_name) values (gen_random_uuid(),'zzz','z')"), /permission denied/);
  });
  it("hides admin_users and blocks self-promotion", async () => {
    await as(U.carl);
    await fails(q("select * from admin_users"), /permission denied/);
    await fails(q("insert into admin_users (user_id) values ($1)", [U.carl]), /permission denied/);
    expect((await q<{ a: boolean }>("select is_admin() a"))[0].a).toBe(false);
    await as(U.admin);
    expect((await q<{ a: boolean }>("select is_admin() a"))[0].a).toBe(true);
  });
  it("hides suspended profiles from everyone else and blocks their writes", async () => {
    await addUser("sam");
    await as("service");
    await q("update profiles set suspended=true where id=$1", [U.sam]);
    await as(U.carl);
    expect(await q("select id from profiles where id=$1", [U.sam])).toHaveLength(0);
    await as(U.sam);
    expect(await q("select id from profiles where id=$1", [U.sam])).toHaveLength(1);
    await fails(q("insert into portfolio_items (profile_id,title) values ($1,'Work')", [U.sam]), /row-level security/);
  });
  it("lets anonymous visitors write only contact messages", async () => {
    await as("anon");
    await q("insert into contact_messages (name,email,message) values ('A','a@b.co','Hello there, I have a question.')");
    await fails(q("select * from contact_messages"), /permission denied/);
    await fails(q("insert into contact_messages (name,email,message) values ('A','not-an-email','Hello there, I have a question.')"), /check constraint/);
    await fails(q("insert into categories (slug,name) values ('x','x')"), /permission denied/);
  });
});

describe("services", () => {
  it("auto-approves per settings, hides drafts and protects moderation", async () => {
    const pub = await newService("fiona", "Public service");
    const draft = await newService("fiona", "Draft service", "draft");
    await as("anon");
    const ids = (await q<{ id: string }>("select id from services")).map((r) => r.id);
    expect(ids).toContain(pub);
    expect(ids).not.toContain(draft);
    expect(await q("select * from service_packages where service_id=$1", [draft])).toHaveLength(0);
    await as(U.fiona);
    await fails(q("update services set moderation='approved' where id=$1", [draft]), /permission denied/);
    await fails(q("update services set status='rejected' where id=$1", [draft]), /row-level security/);
    await q("update services set status='published' where id=$1", [draft]);
  });
  it("turns on moderation from platform settings", async () => {
    await as("service");
    await q(`update platform_settings set value='{"require":true}' where key='moderation'`);
    const pending = await newService("fiona", "Needs review");
    await as("anon");
    expect((await q("select id from services where id=$1", [pending])).length).toBe(0);
    await as("service");
    await q(`update platform_settings set value='{"require":false}' where key='moderation'`);
    await q("update services set moderation='approved' where id=$1", [pending]);
    await as("anon");
    expect((await q("select id from services where id=$1", [pending])).length).toBe(1);
  });
  it("blocks other users from editing a service or its packages", async () => {
    const s = await newService("fiona", "Protected service");
    await as(U.carl);
    expect((await db.query("update services set title='Stolen title' where id=$1 returning id", [s])).rows).toHaveLength(0);
    await fails(q("insert into service_packages (service_id,tier,price_minor,currency,delivery_days) values ($1,'premium',1,'USD',1)", [s]), /row-level security/);
    expect((await db.query("delete from service_packages where service_id=$1 returning id", [s])).rows).toHaveLength(0);
  });
  it("keeps favourites private and limits portfolio items to 12", async () => {
    const s = await newService("fiona", "Favourite me");
    await as(U.carl);
    await q("insert into favourites (user_id, service_id) values ($1,$2)", [U.carl, s]);
    await fails(q("insert into favourites (user_id, service_id) values ($1,$2)", [U.eve, s]), /row-level security/);
    await as(U.eve);
    expect(await q("select * from favourites")).toHaveLength(0);
    await as(U.eve);
    for (let i = 0; i < 12; i++) await q("insert into portfolio_items (profile_id,title,url) values ($1,$2,'https://e.com')", [U.eve, `Item ${i}`]);
    await fails(q("insert into portfolio_items (profile_id,title) values ($1,'One too many')", [U.eve]), /portfolio_limit/);
    await as(U.fiona);
    await fails(q("insert into portfolio_items (profile_id,title,url) values ($1,'Bad','javascript:alert(1)')", [U.fiona]), /check constraint/);
    await as(U.eve);
    await fails(q("insert into portfolio_items (profile_id,title) values ($1,'Not mine')", [U.carl]), /row-level security/);
  });
});

describe("orders, fees and the state machine", () => {
  let service: string;
  beforeAll(async () => { service = await newService("fiona", "Order me"); });

  it("rejects direct writes to orders and payments", async () => {
    await as(U.carl);
    await fails(q("insert into orders (client_id, freelancer_id, service_id, title, currency, base_minor, client_fee_bps, freelancer_fee_bps, client_fee_minor, freelancer_fee_minor) values ($1,$2,$3,'x','USD',1,0,0,0,0)", [U.carl, U.fiona, service]), /permission denied/);
    await fails(q("update orders set status='completed'"), /permission denied/);
    await fails(q("insert into payments (order_id, provider, amount_minor, currency) values (gen_random_uuid(),'x',1,'USD')"), /permission denied/);
  });
  it("freezes fees from settings at order time, ignoring later changes", async () => {
    await as(U.carl);
    const [o1] = await q<{ id: string }>("select place_service_order($1,'basic','Please build my landing page') id", [service]);
    let o = await orderRow(o1.id);
    expect([o.client_fee_bps, o.freelancer_fee_bps, o.client_fee_minor, o.freelancer_fee_minor, o.base_minor]).toEqual([400, 400, 400, 400, 10000]);
    await as("service");
    await q(`update platform_settings set value='{"client_fee_bps":250,"freelancer_fee_bps":1000}' where key='fees'`);
    await as(U.carl);
    const [o2] = await q<{ id: string }>("select place_service_order($1,'basic','Another order for the same service') id", [service]);
    o = await orderRow(o2.id);
    expect([o.client_fee_bps, o.freelancer_fee_bps, o.client_fee_minor, o.freelancer_fee_minor]).toEqual([250, 1000, 250, 1000]);
    expect((await orderRow(o1.id)).client_fee_bps).toBe(400);
    await as("service");
    await q(`update platform_settings set value='{"client_fee_bps":400,"freelancer_fee_bps":400}' where key='fees'`);
  });
  it("refuses invalid orders", async () => {
    const draft = await newService("fiona", "Not for sale", "draft");
    await as(U.carl);
    await fails(q("select place_service_order($1,'basic','Please build my landing page')", [draft]), /service_unavailable/);
    await fails(q("select place_service_order($1,'premium','Please build my landing page')", [service]), /package_not_found/);
    await fails(q("select place_service_order($1,'basic','short')", [service]), /requirements_too_short/);
    await as(U.fiona);
    await fails(q("select place_service_order($1,'basic','Please build my landing page')", [service]), /own_service/);
    await as("anon");
    await fails(q("select place_service_order($1,'basic','Please build my landing page')", [service]), /permission denied/);
  });
  it("walks the full lifecycle with the right actor at each step", async () => {
    await as(U.carl);
    const [{ id }] = await q<{ id: string }>("select place_service_order($1,'basic','Please build my landing page') id", [service]);
    const st = async () => (await orderRow(id)).status;
    await as(U.carl);
    await fails(q("select order_transition($1,'payment_confirmed')", [id]), /system_only/);
    await fails(q("select system_order_transition($1,'payment_confirmed')", [id]), /permission denied/);
    await as(U.fiona);
    await fails(q("select order_transition($1,'in_progress')", [id]), /illegal_transition/);   // unpaid
    await as("service");
    await q("select system_order_transition($1,'payment_confirmed')", [id]);
    await as(U.eve);
    await fails(q("select order_transition($1,'cancelled')", [id]), /not_found/);                // stranger
    await as(U.carl);
    await fails(q("select order_transition($1,'in_progress')", [id]), /illegal_transition/);    // client cannot start
    await as(U.fiona);
    await q("select order_transition($1,'in_progress')", [id]);
    await fails(q("select order_transition($1,'delivered','')", [id]), /delivery_notes_required/);
    await q("select order_transition($1,'delivered','First delivery')", [id]);
    await fails(q("select order_transition($1,'completed')", [id]), /illegal_transition/);      // cannot approve own work
    await as(U.carl);
    await q("select order_transition($1,'revision_requested','tweak')", [id]);
    await as(U.fiona);
    await q("select order_transition($1,'delivered','Second delivery')", [id]);
    await as(U.carl);
    await fails(q("select order_transition($1,'revision_requested','again')", [id]), /no_revisions_left/);
    await q("select order_transition($1,'completed')", [id]);
    expect(await st()).toBe("completed");
    await fails(q("select order_transition($1,'cancelled')", [id]), /illegal_transition/);
    await as(U.carl);
    expect(await q("select * from order_deliveries where order_id=$1", [id])).toHaveLength(2);
    expect((await q("select * from order_events where order_id=$1", [id])).length).toBeGreaterThan(5);
    await as(U.eve);
    expect(await q("select * from orders where id=$1", [id])).toHaveLength(0);
    expect(await q("select * from order_events where order_id=$1", [id])).toHaveLength(0);
  });
  it("matches the TypeScript order state machine exactly", async () => {
    await as("service");
    const rows = await q<{ from_status: string; to_status: string; actor: string }>("select * from order_transitions");
    const dbSet = new Set(rows.map((r) => `${r.from_status}>${r.to_status}>${r.actor}`));
    const tsSet = new Set<string>();
    for (const f of ORDER_STATUSES) for (const t of ORDER_STATUSES) for (const a of ["client", "freelancer", "system", "admin"] as Actor[]) if (canTransition(f, t, a)) tsSet.add(`${f}>${t}>${a}`);
    expect([...dbSet].sort()).toEqual([...tsSet].sort());
  });
});

describe("reviews, disputes and payouts", () => {
  async function completedOrder(price = 10000) {
    const s = await newService("fiona", "Review me " + Math.random().toString(36).slice(2, 5));
    await as(U.carl);
    const [{ id }] = await q<{ id: string }>("select place_service_order($1,'basic','Please build my landing page') id", [s]);
    await as("service"); await q("select system_order_transition($1,'payment_confirmed')", [id]);
    await as(U.fiona); await q("select order_transition($1,'in_progress')", [id]); await q("select order_transition($1,'delivered','done')", [id]);
    await as(U.carl); await q("select order_transition($1,'completed')", [id]);
    void price;
    return id;
  }
  it("allows one review per side, only on completed orders, only between the parties", async () => {
    const s = await newService("fiona", "Unfinished");
    await as(U.carl);
    const [{ id: open }] = await q<{ id: string }>("select place_service_order($1,'basic','Please build my landing page') id", [s]);
    await fails(q("insert into reviews (order_id,from_id,to_id,rating) values ($1,$2,$3,5)", [open, U.carl, U.fiona]), /row-level security/);
    const id = await completedOrder();
    await as(U.carl);
    await q("insert into reviews (order_id,from_id,to_id,rating,text) values ($1,$2,$3,5,'Great')", [id, U.carl, U.fiona]);
    await fails(q("insert into reviews (order_id,from_id,to_id,rating) values ($1,$2,$3,4)", [id, U.carl, U.fiona]), /duplicate key/);
    await fails(q("insert into reviews (order_id,from_id,to_id,rating) values ($1,$2,$3,9)", [id, U.carl, U.fiona]), /check constraint/);
    await as(U.eve);
    await fails(q("insert into reviews (order_id,from_id,to_id,rating) values ($1,$2,$3,5)", [id, U.eve, U.fiona]), /row-level security/);
    await as(U.fiona);
    await fails(q("insert into reviews (order_id,from_id,to_id,rating) values ($1,$2,$3,5)", [id, U.fiona, U.eve]), /row-level security/); // wrong counterparty
    await fails(q("insert into reviews (order_id,from_id,to_id,rating) values ($1,$2,$3,5)", [id, U.carl, U.fiona]), /row-level security/); // spoofed author
    await q("insert into reviews (order_id,from_id,to_id,rating) values ($1,$2,$3,5)", [id, U.fiona, U.carl]);
  });
  it("opens and resolves disputes, with a refund only by an admin", async () => {
    const s = await newService("fiona", "Dispute me");
    await as(U.carl);
    const [{ id }] = await q<{ id: string }>("select place_service_order($1,'basic','Please build my landing page') id", [s]);
    await as("service");
    await q("select system_order_transition($1,'payment_confirmed')", [id]);
    await q("insert into payments (order_id, provider, provider_ref, status, amount_minor, currency) values ($1,'test','ref-1','succeeded',10400,'USD')", [id]);
    await as(U.fiona); await q("select order_transition($1,'in_progress')", [id]);
    await as(U.carl);
    await fails(q("select order_transition($1,'disputed')", [id]), /use_open_dispute/);
    await fails(q("select open_dispute($1,'bad')", [id]), /reason_too_short/);
    const [{ d }] = await q<{ d: string }>("select open_dispute($1,'The work was never delivered') d", [id]);
    expect((await orderRow(id)).status).toBe("disputed");
    await fails(q("select resolve_dispute($1,'refunded')", [d]), /forbidden/);
    await as(U.admin);
    await q("select resolve_dispute($1,'refunded')", [d]);
    expect((await orderRow(id)).status).toBe("refunded");
    await as("service");
    expect((await q<{ status: string }>("select status from payments where order_id=$1", [id]))[0].status).toBe("refunded");
    await as(U.admin);
    await fails(q("select resolve_dispute($1,'completed')", [d]), /not_found/);
  });
  it("pays out only the available balance, net of the frozen freelancer fee", async () => {
    await as(U.fiona);
    const before = (await q<{ b: string }>("select my_available_balance('USD') b"))[0].b;
    const id = await completedOrder();
    void id;
    await as(U.fiona);
    const after = BigInt((await q<{ b: string }>("select my_available_balance('USD') b"))[0].b);
    expect(after - BigInt(before)).toBe(9600n);
    await fails(q("select request_payout($1,'USD')", [after + 1n]), /insufficient_balance/);
    await fails(q("select request_payout(0,'USD')"), /bad_amount/);
    await q("select request_payout($1,'USD')", [after]);
    expect(String((await q<{ b: string }>("select my_available_balance('USD') b"))[0].b)).toBe("0");
    await fails(q("select request_payout(1,'USD')"), /insufficient_balance/);
    await as(U.carl);
    expect(await q("select * from payouts")).toHaveLength(0);
    await fails(q("insert into payouts (user_id, amount_minor, currency) values ($1,1,'USD')", [U.carl]), /permission denied/);
  });
  it("keeps the ledger append-only", async () => {
    await as("service");
    await q("insert into ledger_entries (journal_id, account, debit_minor, currency) values (gen_random_uuid(),'cash',100,'USD')");
    await fails(q("update ledger_entries set debit_minor=1"), /immutable/);
    await fails(q("delete from ledger_entries"), /immutable/);
    await as(U.carl);
    await fails(q("select * from ledger_entries"), /permission denied/);
  });
});

describe("projects and proposals", () => {
  async function publishedProject(owner = "carl") {
    await as(U[owner]);
    const [p] = await q<{ id: string }>("insert into projects (owner_id,title,description,budget_type,budget_min_minor,budget_max_minor,currency,status) values ($1,'Marketing website','Need a marketing website built with SEO.','fixed',10000,50000,'USD','published') returning id", [U[owner]]);
    return p.id;
  }
  const propose = (who: string, project: string, price = 30000) =>
    q<{ id: string }>("insert into proposals (project_id,freelancer_id,cover_letter,price_minor,currency,delivery_days) values ($1,$2,'I can build this for you quickly and well.',$3,'USD',7) returning id", [project, U[who], price]);

  it("lets only open, foreign projects receive one active proposal per freelancer", async () => {
    const pj = await publishedProject();
    await as(U.carl);
    await fails(propose("carl", pj), /row-level security/);              // own project
    await as(U.fiona);
    await propose("fiona", pj);
    await fails(propose("fiona", pj), /duplicate key/);                  // second active proposal
    await as(U.carl);
    await fails(q("insert into proposals (project_id,freelancer_id,cover_letter,price_minor,currency,delivery_days,status) values ($1,$2,'I can build this for you quickly and well.',1,'USD',1,'accepted')", [pj, U.eve]), /row-level security/);
    const draft = (await q<{ id: string }>("insert into projects (owner_id,title,description,budget_type,currency) values ($1,'Draft project','This project is still a draft only.','fixed','USD') returning id", [U.carl]))[0].id;
    await as(U.eve);
    await fails(propose("eve", draft), /row-level security/);            // project not open
    expect(await q("select id from projects where id=$1", [draft])).toHaveLength(0);
  });
  it("reads proposals and projects without policy recursion, and keeps them private", async () => {
    const pj = await publishedProject();
    await as(U.fiona); await propose("fiona", pj);
    await as(U.carl);
    expect((await q("select * from proposals where project_id=$1", [pj])).length).toBe(1);
    await as(U.fiona);
    expect((await q("select * from proposals where project_id=$1", [pj])).length).toBe(1);
    await as(U.eve);
    expect(await q("select * from proposals where project_id=$1", [pj])).toHaveLength(0);
    expect((await q("select * from notifications")).length).toBe(0);
  });
  it("lets the owner shortlist, and the freelancer only withdraw", async () => {
    const pj = await publishedProject();
    await as(U.fiona); const [pr] = await propose("fiona", pj);
    await as(U.carl);
    await q("update proposals set status='shortlisted' where id=$1", [pr.id]);
    await fails(q("update proposals set status='accepted' where id=$1", [pr.id]), /row-level security/);
    await fails(q("update proposals set price_minor=1 where id=$1", [pr.id]), /permission denied/);
    await as(U.fiona);
    await fails(q("update proposals set status='accepted' where id=$1", [pr.id]), /row-level security/);
    await q("update proposals set status='withdrawn' where id=$1", [pr.id]);
  });
  it("accepts exactly one proposal atomically and creates a frozen-fee order", async () => {
    const pj = await publishedProject();
    await as(U.fiona); const [a] = await propose("fiona", pj, 30000);
    await as(U.eve); const [b] = await propose("eve", pj, 20000);
    await as(U.eve);
    await fails(q("select accept_proposal($1)", [a.id]), /forbidden/);
    await as(U.carl);
    const [{ id: oid }] = await q<{ id: string }>("select accept_proposal($1) id", [a.id]);
    await fails(q("select accept_proposal($1)", [b.id]), /not_acceptable/);
    await fails(q("select accept_proposal($1)", [a.id]), /not_acceptable/);
    const o = await orderRow(oid);
    expect([o.base_minor, o.client_fee_minor, o.freelancer_fee_minor, o.client_id, o.freelancer_id]).toEqual([30000, 1200, 1200, U.carl, U.fiona]);
    await as("service");
    const states = await q<{ id: string; status: string }>("select id,status from proposals where project_id=$1", [pj]);
    expect(states.find((s) => s.id === a.id)?.status).toBe("accepted");
    expect(states.find((s) => s.id === b.id)?.status).toBe("rejected");
    expect((await q<{ status: string }>("select status from projects where id=$1", [pj]))[0].status).toBe("in_progress");
    await as(U.fiona);
    expect(await q("select id from projects where id=$1", [pj])).toHaveLength(1); // accepted freelancer keeps access
  });
});

describe("messaging and notifications", () => {
  it("keeps conversations private and prevents spoofed senders", async () => {
    await as(U.carl);
    const [{ c }] = await q<{ c: string }>("select start_conversation($1,'Landing page') c", [U.fiona]);
    const [{ c: again }] = await q<{ c: string }>("select start_conversation($1,'Other topic') c", [U.fiona]);
    expect(again).toBe(c);                                                    // reuses the pair
    await fails(q("select start_conversation($1,'x')", [U.carl]), /self_conversation/);
    await q("insert into messages (conversation_id,sender_id,body) values ($1,$2,'Hello Fiona')", [c, U.carl]);
    await fails(q("insert into messages (conversation_id,sender_id,body) values ($1,$2,'Spoof')", [c, U.fiona]), /row-level security/);
    await fails(q("insert into messages (conversation_id,sender_id,body) values ($1,$2,'   ')", [c, U.carl]), /check constraint/);
    await as(U.eve);
    expect(await q("select * from conversations")).toHaveLength(0);
    expect(await q("select * from messages")).toHaveLength(0);
    await fails(q("insert into messages (conversation_id,sender_id,body) values ($1,$2,'Intruder')", [c, U.eve]), /row-level security/);
    await as(U.fiona);
    expect(await q("select * from messages where conversation_id=$1", [c])).toHaveLength(1);
    await q("insert into conversation_reads (conversation_id,user_id) values ($1,$2)", [c, U.fiona]);
    await fails(q("insert into conversation_reads (conversation_id,user_id) values ($1,$2)", [c, U.carl]), /row-level security/);
    const notes = await q<{ id: string; text: string }>("select id,text from notifications where text like 'New message%'");
    expect(notes.length).toBeGreaterThan(0);
    await q("update notifications set read=true where id=$1", [notes[0].id]);
    await fails(q("update notifications set text='x'"), /permission denied/);
    await fails(q("insert into notifications (user_id,text) values ($1,'forged')", [U.fiona]), /permission denied/);
    await as(U.eve);
    expect(await q("select * from notifications where text like 'New message%'")).toHaveLength(0);
  });
  it("lets users report services but only admins read other people's reports", async () => {
    const s = await newService("fiona", "Report me");
    await as(U.carl);
    await q("insert into reports (reporter_id,service_id,reason) values ($1,$2,'This looks like a scam listing.')", [U.carl, s]);
    await as(U.eve);
    expect(await q("select * from reports")).toHaveLength(0);
    await as(U.admin);
    expect((await q("select * from reports")).length).toBe(1);
    expect(Array.isArray(await q("select * from audit_logs"))).toBe(true);
    await as(U.carl);
    await fails(q("insert into audit_logs (action) values ('x')"), /permission denied/);
    expect((await q("select * from audit_logs")).length).toBe(0);
  });
});
