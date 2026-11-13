import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The local preview store needs a browser-like environment.
const mem = new Map<string, string>();
vi.stubGlobal("window", { addEventListener: () => {} });
vi.stubGlobal("localStorage", {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
});
vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "1");

type Actions = typeof import("./actions");
type Store = typeof import("./store");
let A: Actions;
let S: Store;

const pkg = (price: number) => ({ tier: "basic" as const, priceMinor: price, currency: "USD", deliveryDays: 3, revisions: 1, description: "", features: [] });
const svc = { title: "Landing page build", description: "A responsive landing page for your product.", categorySlug: "development", tags: [], requirements: "", packages: [pkg(10000)] };
const proj = { title: "Marketing website", description: "Need a marketing website built with SEO.", categorySlug: "development", skills: [], budgetType: "fixed" as const, minMinor: 10000, maxMinor: 50000, currency: "USD", deadline: "" };

function user(name: string, role: "client" | "freelancer" | "both" = "both") {
  const r = A.signUp({ name, email: `${name.toLowerCase()}@test.dev`, password: "password123", role });
  expect(r.ok).toBe(true);
  return S.read().sessionUserId!;
}
const as = (name: string) => expect(A.logIn(`${name.toLowerCase()}@test.dev`, "password123").ok).toBe(true);

beforeAll(async () => {
  S = await import("./store");
  A = await import("./actions");
});
beforeEach(() => S.resetLocalData());

describe("registration and auth", () => {
  it("rejects duplicates, short passwords and bad logins", () => {
    user("Alice");
    expect(A.signUp({ name: "Alice2", email: "alice@test.dev", password: "password123", role: "client" }).ok).toBe(false);
    expect(A.signUp({ name: "Bob", email: "bob@test.dev", password: "short", role: "client" }).ok).toBe(false);
    expect(A.logIn("alice@test.dev", "wrong-password").ok).toBe(false);
  });
  it("blocks every action when logged out", () => {
    expect(A.logOut().ok).toBe(true);
    expect(A.saveService(svc, true).ok).toBe(false);
  });
  it("blocks suspended users", () => {
    user("Admin"); expect(A.claimAdminLocal().ok).toBe(true);
    const bad = user("Mallory");
    as("Admin");
    expect(A.setSuspended(bad, true).ok).toBe(true);
    expect(A.logIn("mallory@test.dev", "password123").ok).toBe(false);
  });
});

describe("service order lifecycle", () => {
  function setup() {
    user("Fiona"); expect(A.saveService(svc, true).ok).toBe(true);
    user("Carl");
    const s = S.read().services[0];
    return s;
  }
  it("runs order -> pay -> deliver -> revision -> approve -> review -> payout", () => {
    const s = setup();
    const placed = A.placeServiceOrder(s.id, "basic", "Please build it for me");
    expect(placed.ok).toBe(true);
    const id = (placed as { data: string }).data;
    const o = () => S.read().orders.find((x) => x.id === id)!;
    expect(o().status).toBe("pending_payment");
    expect([o().clientFeeMinor, o().freelancerFeeMinor]).toEqual([400, 400]);

    // freelancer cannot start before payment, nobody but client can pay
    as("Fiona");
    expect(A.startOrder(id).ok).toBe(false);
    expect(A.payOrderLocal(id).ok).toBe(false);

    as("Carl");
    expect(A.payOrderLocal(id).ok).toBe(true);
    expect(A.payOrderLocal(id).ok).toBe(false); // replay is rejected
    expect(S.read().payments).toHaveLength(1);
    expect(S.read().payments[0].amountMinor).toBe(10400);

    as("Fiona");
    expect(A.startOrder(id).ok).toBe(true);
    expect(A.deliverOrder(id, "First delivery").ok).toBe(true);
    expect(A.approveOrder(id).ok).toBe(false); // freelancer cannot approve own work

    as("Carl");
    expect(A.requestRevision(id, "tweak").ok).toBe(true);
    as("Fiona");
    expect(A.deliverOrder(id, "Second delivery").ok).toBe(true);
    as("Carl");
    expect(A.requestRevision(id, "again").ok).toBe(false); // revision allowance used
    expect(A.submitReview(id, 5, "").ok).toBe(false); // not completed yet
    expect(A.approveOrder(id).ok).toBe(true);
    expect(o().status).toBe("completed");

    expect(A.submitReview(id, 5, "Great").ok).toBe(true);
    expect(A.submitReview(id, 4, "dup").ok).toBe(false);
    expect(A.submitReview(id, 9, "bad").ok).toBe(false);

    as("Fiona");
    const bal = A.balanceOf(S.read(), S.read().sessionUserId!);
    expect(bal.available).toBe(9600);
    expect(A.requestPayout(9700).ok).toBe(false);
    expect(A.requestPayout(9600).ok).toBe(true);
    expect(A.balanceOf(S.read(), S.read().sessionUserId!).available).toBe(0);
  });
  it("prevents buying your own service and hides unpublished ones", () => {
    const s = setup();
    as("Fiona");
    expect(A.placeServiceOrder(s.id, "basic", "my own service").ok).toBe(false);
    expect(A.setServiceStatus(s.id, "paused").ok).toBe(true);
    as("Carl");
    expect(A.placeServiceOrder(s.id, "basic", "needs to be rejected").ok).toBe(false);
  });
  it("cancellation requests need a paid order, a reason and a participant", () => {
    const s = setup();
    const id = (A.placeServiceOrder(s.id, "basic", "Build me a thing now") as { data: string }).data;
    expect(A.requestCancellation(id, "changed my mind about it").ok).toBe(false); // unpaid
    expect(A.payOrderLocal(id).ok).toBe(true);
    expect(A.requestCancellation(id, "short").ok).toBe(false);
    expect(A.requestCancellation(id, "changed my mind about it").ok).toBe(true);
    expect(S.read().orders.find((x) => x.id === id)!.status).toBe("payment_confirmed"); // request only, no state change
    user("Eve");
    expect(A.requestCancellation(id, "I am not part of this").ok).toBe(false);
  });
  it("strangers cannot touch an order", () => {
    const s = setup();
    const id = (A.placeServiceOrder(s.id, "basic", "Build me a thing now") as { data: string }).data;
    user("Eve");
    expect(A.cancelOrder(id).ok).toBe(false);
    expect(A.openDispute(id, "I am not part of this").ok).toBe(false);
  });
  it("admin resolves a dispute with a refund", () => {
    const s = setup();
    const id = (A.placeServiceOrder(s.id, "basic", "Build me a thing now") as { data: string }).data;
    A.payOrderLocal(id);
    as("Fiona"); A.startOrder(id);
    as("Carl");
    expect(A.openDispute(id, "Seller is not responding").ok).toBe(true);
    user("Root"); A.claimAdminLocal();
    const dp = S.read().disputes[0];
    expect(A.resolveDispute(dp.id, "refunded").ok).toBe(true);
    expect(S.read().orders[0].status).toBe("refunded");
    expect(S.read().payments[0].status).toBe("refunded");
    as("Carl");
    expect(A.resolveDispute(dp.id, "completed").ok).toBe(false); // non-admin
  });
});

describe("projects and proposals", () => {
  it("accepts exactly one proposal and rejects the rest", () => {
    user("Olive"); const pid = (A.saveProject(proj, true) as { data: string }).data;
    user("Fred");
    const bid = { projectId: pid, cover: "I can build this for you quickly.", priceMinor: 20000, days: 5 };
    expect(A.submitProposal(bid).ok).toBe(true);
    expect(A.submitProposal(bid).ok).toBe(false); // duplicate
    user("Gina"); expect(A.submitProposal({ ...bid, priceMinor: 25000 }).ok).toBe(true);

    as("Olive");
    expect(A.submitProposal(bid).ok).toBe(false); // own project
    const [p1, p2] = S.read().proposals;
    const r = A.acceptProposal(p1.id);
    expect(r.ok).toBe(true);
    expect(A.acceptProposal(p2.id).ok).toBe(false); // second award blocked
    const st = S.read();
    expect(st.proposals.map((p) => p.status)).toEqual(["accepted", "rejected"]);
    expect(st.projects[0].status).toBe("in_progress");
    expect(st.orders).toHaveLength(1);
    expect(st.orders[0].baseMinor).toBe(20000);
  });
  it("only the owner can accept", () => {
    user("Olive"); const pid = (A.saveProject(proj, true) as { data: string }).data;
    user("Fred"); A.submitProposal({ projectId: pid, cover: "I can build this for you quickly.", priceMinor: 20000, days: 5 });
    expect(A.acceptProposal(S.read().proposals[0].id).ok).toBe(false);
  });
  it("validates inputs", () => {
    user("Olive");
    expect(A.saveProject({ ...proj, title: "x" }, true).ok).toBe(false);
    expect(A.saveProject({ ...proj, maxMinor: 1 }, true).ok).toBe(false);
  });
});

describe("portfolio, favourites and password reset", () => {
  it("manages portfolio items with validation", () => {
    user("Pia");
    expect(A.addPortfolioItem({ title: "x", url: "", description: "" }).ok).toBe(false);
    expect(A.addPortfolioItem({ title: "Site", url: "http://", description: "" }).ok).toBe(false);
    expect(A.addPortfolioItem({ title: "Site", url: "example.com/work", description: "d" }).ok).toBe(true);
    const item = S.read().users.find((u) => u.name === "Pia")!.portfolio![0];
    expect(item.url).toBe("https://example.com/work");
    expect(A.removePortfolioItem(item.id).ok).toBe(true);
    expect(S.read().users.find((u) => u.name === "Pia")!.portfolio).toHaveLength(0);
  });
  it("toggles favourites per user and needs login", () => {
    user("Fay"); expect(A.saveService(svc, true).ok).toBe(true);
    const id = S.read().services[0].id;
    user("Cy");
    expect(A.toggleFavourite(id)).toMatchObject({ ok: true, data: true });
    expect(S.read().favs).toHaveLength(1);
    expect(A.toggleFavourite(id)).toMatchObject({ ok: true, data: false });
    expect(S.read().favs).toHaveLength(0);
    expect(A.toggleFavourite("missing").ok).toBe(false);
    expect(A.logOut().ok).toBe(true);
    expect(A.toggleFavourite(id).ok).toBe(false);
  });
  it("resets a password once with a valid token", () => {
    user("Rita");
    expect(A.logOut().ok).toBe(true);
    expect((A.requestPasswordReset("nobody@test.dev") as { data: string }).data).toBe("");
    const token = (A.requestPasswordReset("rita@test.dev") as { data: string }).data;
    expect(token).not.toBe("");
    expect(A.resetPassword("bad", "newpassword1").ok).toBe(false);
    expect(A.resetPassword(token, "short").ok).toBe(false);
    expect(A.resetPassword(token, "newpassword1").ok).toBe(true);
    expect(A.resetPassword(token, "newpassword2").ok).toBe(false); // single use
    expect(A.logIn("rita@test.dev", "password123").ok).toBe(false);
    expect(A.logIn("rita@test.dev", "newpassword1").ok).toBe(true);
  });
});

describe("messaging", () => {
  it("only participants can read or write", () => {
    const a = user("Ann"); const b = user("Ben"); user("Cy");
    as("Ann");
    const c = (A.startConversation(b, "hi") as { data: string }).data;
    expect(A.sendMessage(c, "hello").ok).toBe(true);
    expect(A.sendMessage(c, "   ").ok).toBe(false);
    as("Cy");
    expect(A.sendMessage(c, "intruder").ok).toBe(false);
    expect(A.startConversation(a, "x").ok).toBe(true);
    expect(S.read().convs).toHaveLength(2);
    as("Ben");
    expect(S.read().notifs.filter((n) => n.userId === b)).toHaveLength(1);
  });
});

describe("admin and settings", () => {
  it("only admins change fees and moderate", () => {
    user("Ann");
    expect(A.updateSettings(500, 500, false).ok).toBe(false);
    expect(A.claimAdminLocal().ok).toBe(true);
    expect(A.updateSettings(500, 300, true).ok).toBe(true);
    expect(A.updateSettings(20000, 0, false).ok).toBe(false);
    expect(S.read().audit.length).toBeGreaterThan(0);
  });
  it("freezes fees per order and honours moderation", () => {
    user("Admin"); A.claimAdminLocal(); A.updateSettings(500, 300, true);
    user("Fiona"); A.saveService(svc, true);
    const s = S.read().services[0];
    expect(s.moderation).toBe("pending");
    user("Carl");
    expect(A.placeServiceOrder(s.id, "basic", "waiting on moderation").ok).toBe(false);
    as("Admin"); expect(A.moderateService(s.id, true).ok).toBe(true);
    as("Carl");
    const id = (A.placeServiceOrder(s.id, "basic", "now it is approved") as { data: string }).data;
    as("Admin"); A.updateSettings(100, 100, false);
    const o = S.read().orders.find((x) => x.id === id)!;
    expect([o.clientFeeMinor, o.freelancerFeeMinor]).toEqual([500, 300]);
  });
});
