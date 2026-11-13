-- Mylance core schema.
-- Money = bigint minor units + explicit currency. Fees are read from platform_settings, never from callers.
-- Users act through RLS + narrow column grants + a few security-definer functions.
-- Payments, ledger, payouts review and admin tooling run only with the service role (server side).
-- Run once in the Supabase SQL editor on an empty project.

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- reference data ----------
create table categories (slug text primary key, name text not null);
insert into categories (slug, name) values
  ('development','Development & IT'),('design','Design & Creative'),('writing','Writing & Content'),
  ('marketing','Digital Marketing'),('video','Video & Animation'),('audio','Music & Audio'),
  ('business','Business & Admin'),('data','Data & Analytics'),('translation','Translation'),('mobile','Mobile Apps');

create table platform_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
insert into platform_settings (key, value) values
  ('fees', '{"client_fee_bps":400,"freelancer_fee_bps":400}'),
  ('moderation', '{"require":false}');

-- ---------- identity ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  headline text not null default '' check (char_length(headline) <= 120),
  bio text not null default '' check (char_length(bio) <= 2000),
  country text not null default '' check (char_length(country) in (0, 2)),
  level text not null default 'intermediate' check (level in ('entry','intermediate','expert')),
  timezone text not null default '',
  available boolean not null default true,
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  is_client boolean not null default true,
  is_freelancer boolean not null default false,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

-- Admin role is separate from user-editable profiles; nobody but the service role can write it.
create table admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());

create function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from admin_users where user_id = auth.uid()) $$;
create function is_active() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and not suspended) $$;

create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare base text; uname text; n int := 0; v_role text;
begin
  base := regexp_replace(lower(coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1))), '[^a-z0-9_]+', '_', 'g');
  base := trim(both '_' from base);
  if length(base) < 3 then base := base || '_user'; end if;
  base := left(base, 24);
  uname := base;
  while exists (select 1 from profiles where username = uname) loop n := n + 1; uname := base || n; end loop;
  v_role := coalesce(new.raw_user_meta_data->>'role', 'client');
  insert into profiles (id, username, display_name, is_client, is_freelancer)
  values (new.id, uname, left(coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)), 80), v_role <> 'freelancer', v_role <> 'client');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  url text not null default '' check (url = '' or url ~* '^https?://'),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);
create function limit_portfolio() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from portfolio_items where profile_id = new.profile_id) >= 12 then raise exception 'portfolio_limit'; end if;
  return new;
end $$;
create trigger portfolio_limit before insert on portfolio_items for each row execute function limit_portfolio();

-- ---------- services ----------
create table services (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  category_slug text not null references categories(slug),
  slug text unique not null,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 20 and 8000),
  tags text[] not null default '{}',
  requirements text not null default '',
  status text not null default 'draft' check (status in ('draft','published','paused','archived','rejected')),
  moderation text not null default 'pending' check (moderation in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index services_public_idx on services (category_slug, created_at desc) where status = 'published' and moderation = 'approved';
create trigger services_updated before update on services for each row execute function set_updated_at();

create function services_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.moderation := case when coalesce((select (value->>'require')::boolean from platform_settings where key = 'moderation'), false) then 'pending' else 'approved' end;
  update profiles set is_freelancer = true where id = new.seller_id;
  return new;
end $$;
create trigger services_set_moderation before insert on services for each row execute function services_before_insert();

create table service_packages (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  tier text not null check (tier in ('basic','standard','premium')),
  price_minor bigint not null check (price_minor > 0),
  currency char(3) not null,
  delivery_days int not null check (delivery_days between 1 and 365),
  revisions int not null default 1 check (revisions >= 0),
  description text not null default '',
  features text[] not null default '{}',
  unique (service_id, tier)
);

create table favourites (
  user_id uuid not null references profiles(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, service_id)
);

-- ---------- projects & proposals ----------
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  category_slug text references categories(slug),
  title text not null check (char_length(title) between 5 and 150),
  description text not null check (char_length(description) between 20 and 10000),
  skills text[] not null default '{}',
  budget_type text not null check (budget_type in ('fixed','hourly')),
  budget_min_minor bigint not null default 0 check (budget_min_minor >= 0),
  budget_max_minor bigint not null default 0,
  currency char(3) not null,
  deadline date,
  visibility text not null default 'public' check (visibility in ('public','private')),
  status text not null default 'draft' check (status in ('draft','published','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (budget_max_minor >= budget_min_minor)
);
create index projects_open_idx on projects (created_at desc) where status = 'published' and visibility = 'public';
create trigger projects_updated before update on projects for each row execute function set_updated_at();

create table proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  freelancer_id uuid not null references profiles(id) on delete cascade,
  cover_letter text not null check (char_length(cover_letter) between 20 and 5000),
  price_minor bigint not null check (price_minor > 0),
  currency char(3) not null,
  delivery_days int not null check (delivery_days > 0),
  status text not null default 'submitted' check (status in ('submitted','viewed','shortlisted','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index proposals_one_active on proposals (project_id, freelancer_id) where status in ('submitted','viewed','shortlisted');
create unique index proposals_one_accepted on proposals (project_id) where status = 'accepted';
create trigger proposals_updated before update on proposals for each row execute function set_updated_at();

-- Helpers bypass RLS so policies on projects and proposals cannot recurse into each other.
create function owns_project(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from projects where id = p and owner_id = auth.uid()) $$;
create function project_is_open(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from projects where id = p and status = 'published') $$;
create function is_project_freelancer(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from proposals where project_id = p and freelancer_id = auth.uid() and status = 'accepted') $$;

create function notify_new_proposal() returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; ttl text;
begin
  select owner_id, title into owner, ttl from projects where id = new.project_id;
  insert into notifications (user_id, text, href) values (owner, 'New proposal on "' || ttl || '"', '/dashboard/projects/' || new.project_id);
  return new;
end $$;

-- ---------- orders ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id),
  freelancer_id uuid not null references profiles(id),
  service_id uuid references services(id),
  tier text,
  proposal_id uuid unique references proposals(id),
  title text not null,
  requirements text not null default '',
  status text not null default 'pending_payment' check (status in
    ('pending_payment','payment_confirmed','in_progress','delivered','revision_requested','completed','cancelled','refunded','disputed')),
  currency char(3) not null,
  base_minor bigint not null check (base_minor > 0),
  -- fee breakdown is frozen when the order is created
  client_fee_bps int not null check (client_fee_bps between 0 and 10000),
  freelancer_fee_bps int not null check (freelancer_fee_bps between 0 and 10000),
  client_fee_minor bigint not null check (client_fee_minor >= 0),
  freelancer_fee_minor bigint not null check (freelancer_fee_minor >= 0),
  deadline date,
  revisions_allowed int not null default 1,
  revisions_used int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (client_id <> freelancer_id),
  check ((service_id is not null) <> (proposal_id is not null)),
  check (revisions_used <= revisions_allowed)
);
create index orders_client_idx on orders (client_id, created_at desc);
create index orders_freelancer_idx on orders (freelancer_id, created_at desc);
create trigger orders_updated before update on orders for each row execute function set_updated_at();

create table order_events (id bigint generated always as identity primary key, order_id uuid not null references orders(id) on delete cascade, text text not null, created_at timestamptz not null default now());
create table order_deliveries (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade, notes text not null, created_at timestamptz not null default now());

-- Mirror of src/lib/domain/order-state.ts (a test keeps them identical).
create table order_transitions (from_status text not null, to_status text not null, actor text not null, primary key (from_status, to_status, actor));
insert into order_transitions values
  ('pending_payment','payment_confirmed','system'),('pending_payment','cancelled','client'),('pending_payment','cancelled','admin'),
  ('payment_confirmed','in_progress','freelancer'),('payment_confirmed','in_progress','system'),('payment_confirmed','cancelled','admin'),
  ('payment_confirmed','refunded','admin'),('payment_confirmed','refunded','system'),
  ('in_progress','delivered','freelancer'),('in_progress','cancelled','admin'),('in_progress','disputed','client'),('in_progress','disputed','freelancer'),
  ('delivered','completed','client'),('delivered','completed','system'),('delivered','revision_requested','client'),
  ('delivered','disputed','client'),('delivered','disputed','freelancer'),
  ('revision_requested','delivered','freelancer'),('revision_requested','disputed','client'),('revision_requested','disputed','freelancer'),
  ('disputed','completed','admin'),('disputed','refunded','admin'),('disputed','cancelled','admin');

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  provider text not null, provider_ref text,
  status text not null default 'created' check (status in ('created','pending','succeeded','failed','refund_pending','partially_refunded','refunded')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
create table payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null, provider_event_id text not null,
  payment_id uuid references payments(id),
  payload jsonb not null, received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);
create table ledger_entries (
  id bigint generated always as identity primary key,
  journal_id uuid not null, order_id uuid references orders(id),
  account text not null, debit_minor bigint not null default 0 check (debit_minor >= 0),
  credit_minor bigint not null default 0 check (credit_minor >= 0),
  currency char(3) not null, created_at timestamptz not null default now(),
  check ((debit_minor > 0) <> (credit_minor > 0))
);
create function ledger_immutable() returns trigger language plpgsql as $$
begin raise exception 'ledger_entries are immutable'; end $$;
create trigger ledger_no_update before update or delete on ledger_entries for each row execute function ledger_immutable();

create table payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  status text not null default 'pending' check (status in ('pending','paid','rejected')),
  created_at timestamptz not null default now()
);

create table disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  opened_by uuid not null references profiles(id),
  reason text not null check (char_length(reason) >= 10),
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text not null default '',
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  from_id uuid not null references profiles(id),
  to_id uuid not null references profiles(id),
  rating int not null check (rating between 1 and 5),
  text text not null default '' check (char_length(text) <= 2000),
  created_at timestamptz not null default now(),
  unique (order_id, from_id)
);

-- ---------- messaging, notifications, misc ----------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  context text not null default '',
  created_at timestamptz not null default now(),
  check (user_a <> user_b)
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_conv_idx on messages (conversation_id, created_at);
create table conversation_reads (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  text text not null, href text not null default '/dashboard',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

create function notify_new_message() returns trigger language plpgsql security definer set search_path = public as $$
declare c conversations; other uuid; nm text;
begin
  select * into c from conversations where id = new.conversation_id;
  other := case when c.user_a = new.sender_id then c.user_b else c.user_a end;
  select display_name into nm from profiles where id = new.sender_id;
  insert into notifications (user_id, text, href) values (other, 'New message from ' || nm, '/dashboard/messages?c=' || c.id);
  return new;
end $$;
create trigger messages_notify after insert on messages for each row execute function notify_new_message();
create trigger proposals_notify after insert on proposals for each row execute function notify_new_proposal();

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  reason text not null check (char_length(reason) between 10 and 1000),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (email ~ '^\S+@\S+\.\S+$' and char_length(email) <= 200),
  message text not null check (char_length(message) between 10 and 4000),
  created_at timestamptz not null default now()
);
create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid, action text not null, entity text, entity_id text, detail jsonb,
  created_at timestamptz not null default now()
);

-- ---------- functions (security definer; the only way to create or move orders) ----------
create function _notify_order(o orders, p_actor text, p_text text) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_actor <> 'client' then insert into notifications (user_id, text, href) values (o.client_id, p_text, '/dashboard/orders/' || o.id); end if;
  if p_actor <> 'freelancer' then insert into notifications (user_id, text, href) values (o.freelancer_id, p_text, '/dashboard/orders/' || o.id); end if;
end $$;

create function _apply_transition(p_order uuid, p_to text, p_actor text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'not_found'; end if;
  if not exists (select 1 from order_transitions t where t.from_status = o.status and t.to_status = p_to and t.actor = p_actor) then
    raise exception 'illegal_transition % -> % by %', o.status, p_to, p_actor;
  end if;
  if p_to = 'revision_requested' then
    if o.revisions_used >= o.revisions_allowed then raise exception 'no_revisions_left'; end if;
    update orders set revisions_used = revisions_used + 1 where id = o.id;
  end if;
  if p_to = 'delivered' then
    if char_length(btrim(coalesce(p_note, ''))) = 0 then raise exception 'delivery_notes_required'; end if;
    insert into order_deliveries (order_id, notes) values (o.id, btrim(p_note));
  end if;
  update orders set status = p_to where id = o.id;
  insert into order_events (order_id, text) values (o.id, replace(p_to, '_', ' ') || case when btrim(coalesce(p_note,'')) <> '' then ': ' || btrim(p_note) else '' end);
  perform _notify_order(o, p_actor, 'Order "' || o.title || '" is now ' || replace(p_to, '_', ' '));
end $$;

create function order_transition(p_order uuid, p_to text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare o orders; a text;
begin
  select * into o from orders where id = p_order;
  if not found then raise exception 'not_found'; end if;
  a := case when auth.uid() = o.client_id then 'client' when auth.uid() = o.freelancer_id then 'freelancer' when is_admin() then 'admin' end;
  if a is null then raise exception 'not_found'; end if;
  if a <> 'admin' and not is_active() then raise exception 'suspended'; end if;
  if p_to = 'disputed' then raise exception 'use_open_dispute'; end if;
  if p_to = 'payment_confirmed' then raise exception 'system_only'; end if;
  perform _apply_transition(p_order, p_to, a, p_note);
end $$;

-- Service role only (payment webhooks / jobs).
create function system_order_transition(p_order uuid, p_to text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
begin perform _apply_transition(p_order, p_to, 'system', p_note); end $$;

create function _frozen_fees(base bigint, out client_bps int, out freelancer_bps int, out client_fee bigint, out freelancer_fee bigint)
language plpgsql stable security definer set search_path = public as $$
declare f jsonb;
begin
  select value into f from platform_settings where key = 'fees';
  client_bps := (f->>'client_fee_bps')::int; freelancer_bps := (f->>'freelancer_fee_bps')::int;
  client_fee := (base * client_bps + 5000) / 10000;          -- half-up, integer only
  freelancer_fee := (base * freelancer_bps + 5000) / 10000;
end $$;

create function place_service_order(p_service uuid, p_tier text, p_requirements text) returns uuid
language plpgsql security definer set search_path = public as $$
declare s services; pk service_packages; ft record; oid uuid;
begin
  if auth.uid() is null or not is_active() then raise exception 'not_allowed'; end if;
  select * into s from services where id = p_service;
  if not found or s.status <> 'published' or s.moderation <> 'approved' then raise exception 'service_unavailable'; end if;
  if s.seller_id = auth.uid() then raise exception 'own_service'; end if;
  select * into pk from service_packages where service_id = s.id and tier = p_tier;
  if not found then raise exception 'package_not_found'; end if;
  if char_length(btrim(coalesce(p_requirements, ''))) < 10 then raise exception 'requirements_too_short'; end if;
  select * into ft from _frozen_fees(pk.price_minor);
  insert into orders (client_id, freelancer_id, service_id, tier, title, requirements, currency, base_minor,
                      client_fee_bps, freelancer_fee_bps, client_fee_minor, freelancer_fee_minor, deadline, revisions_allowed)
  values (auth.uid(), s.seller_id, s.id, pk.tier, s.title || ' (' || pk.tier || ')', btrim(p_requirements), pk.currency, pk.price_minor,
          ft.client_bps, ft.freelancer_bps, ft.client_fee, ft.freelancer_fee, current_date + pk.delivery_days, pk.revisions)
  returning id into oid;
  insert into order_events (order_id, text) values (oid, 'order placed');
  insert into notifications (user_id, text, href) values (s.seller_id, 'New order: ' || s.title, '/dashboard/orders/' || oid);
  update profiles set is_client = true where id = auth.uid();
  return oid;
end $$;

create function accept_proposal(p_proposal uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare pr proposals; pj projects; oid uuid; ft record;
begin
  select * into pr from proposals where id = p_proposal for update;
  if not found then raise exception 'not_found'; end if;
  select * into pj from projects where id = pr.project_id for update;
  if pj.owner_id is distinct from auth.uid() or not is_active() then raise exception 'forbidden'; end if;
  if pj.status <> 'published' or pr.status not in ('submitted','viewed','shortlisted') then raise exception 'not_acceptable'; end if;
  select * into ft from _frozen_fees(pr.price_minor);
  update proposals set status = 'accepted' where id = pr.id;
  update proposals set status = 'rejected' where project_id = pj.id and id <> pr.id and status in ('submitted','viewed','shortlisted');
  update projects set status = 'in_progress' where id = pj.id;
  insert into orders (client_id, freelancer_id, proposal_id, title, requirements, currency, base_minor,
                      client_fee_bps, freelancer_fee_bps, client_fee_minor, freelancer_fee_minor, deadline)
  values (pj.owner_id, pr.freelancer_id, pr.id, pj.title, pj.description, pr.currency, pr.price_minor,
          ft.client_bps, ft.freelancer_bps, ft.client_fee, ft.freelancer_fee, current_date + pr.delivery_days)
  returning id into oid;
  insert into order_events (order_id, text) values (oid, 'order created from accepted proposal');
  insert into notifications (user_id, text, href) values (pr.freelancer_id, 'Your proposal for "' || pj.title || '" was accepted', '/dashboard/orders/' || oid);
  insert into audit_logs (actor_id, action, entity, entity_id) values (auth.uid(), 'proposal.accept', 'proposal', pr.id::text);
  return oid;
end $$;

create function open_dispute(p_order uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare o orders; a text; did uuid;
begin
  select * into o from orders where id = p_order;
  if not found then raise exception 'not_found'; end if;
  a := case when auth.uid() = o.client_id then 'client' when auth.uid() = o.freelancer_id then 'freelancer' end;
  if a is null or not is_active() then raise exception 'not_found'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 10 then raise exception 'reason_too_short'; end if;
  perform _apply_transition(p_order, 'disputed', a, p_reason);
  insert into disputes (order_id, opened_by, reason) values (p_order, auth.uid(), btrim(p_reason)) returning id into did;
  return did;
end $$;

create function resolve_dispute(p_dispute uuid, p_outcome text) returns void
language plpgsql security definer set search_path = public as $$
declare d disputes;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_outcome not in ('completed','refunded','cancelled') then raise exception 'bad_outcome'; end if;
  select * into d from disputes where id = p_dispute for update;
  if not found or d.status <> 'open' then raise exception 'not_found'; end if;
  perform _apply_transition(d.order_id, p_outcome, 'admin', 'dispute resolved');
  if p_outcome = 'refunded' then update payments set status = 'refunded' where order_id = d.order_id; end if;
  update disputes set status = 'resolved', resolution = p_outcome where id = d.id;
  insert into audit_logs (actor_id, action, entity, entity_id) values (auth.uid(), 'dispute.resolve', 'dispute', d.id::text);
end $$;

create function _available_balance(p_user uuid, p_currency text) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(base_minor - freelancer_fee_minor) from orders where freelancer_id = p_user and status = 'completed' and currency = p_currency), 0)
       - coalesce((select sum(amount_minor) from payouts where user_id = p_user and currency = p_currency and status in ('pending','paid')), 0)
$$;
create function my_available_balance(p_currency text default 'USD') returns bigint
language sql stable security definer set search_path = public as $$ select _available_balance(auth.uid(), p_currency) $$;

create function request_payout(p_amount bigint, p_currency text default 'USD') returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if auth.uid() is null or not is_active() then raise exception 'not_allowed'; end if;
  perform 1 from profiles where id = auth.uid() for update;   -- serialise concurrent requests
  if p_amount is null or p_amount <= 0 then raise exception 'bad_amount'; end if;
  if p_amount > _available_balance(auth.uid(), p_currency) then raise exception 'insufficient_balance'; end if;
  insert into payouts (user_id, amount_minor, currency) values (auth.uid(), p_amount, p_currency) returning id into pid;
  return pid;
end $$;

create function start_conversation(p_other uuid, p_context text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null or not is_active() then raise exception 'not_allowed'; end if;
  if p_other = auth.uid() then raise exception 'self_conversation'; end if;
  if not exists (select 1 from profiles where id = p_other and not suspended) then raise exception 'not_found'; end if;
  select id into cid from conversations
   where (user_a = auth.uid() and user_b = p_other) or (user_a = p_other and user_b = auth.uid()) order by created_at limit 1;
  if cid is null then
    insert into conversations (user_a, user_b, context) values (auth.uid(), p_other, left(coalesce(p_context, ''), 120)) returning id into cid;
  end if;
  return cid;
end $$;

-- ---------- privileges ----------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on function is_admin(), is_active(), owns_project(uuid), project_is_open(uuid), is_project_freelancer(uuid) to anon, authenticated;
grant execute on function place_service_order(uuid, text, text), accept_proposal(uuid), order_transition(uuid, text, text),
  open_dispute(uuid, text), resolve_dispute(uuid, text), my_available_balance(text), request_payout(bigint, text), start_conversation(uuid, text) to authenticated;
grant execute on function system_order_transition(uuid, text, text) to service_role;

grant select on categories, platform_settings, profiles, services, service_packages, portfolio_items, projects, reviews to anon, authenticated;
grant insert on contact_messages to anon, authenticated;
grant select on proposals, orders, order_events, order_deliveries, payments, payouts, disputes, conversations, messages,
  conversation_reads, notifications, reports, favourites, audit_logs to authenticated;

grant update (display_name, username, headline, bio, country, level, timezone, available, skills, languages, is_client, is_freelancer) on profiles to authenticated;
grant insert (seller_id, category_slug, slug, title, description, tags, requirements, status) on services to authenticated;
grant update (category_slug, title, description, tags, requirements, status) on services to authenticated;
grant insert (service_id, tier, price_minor, currency, delivery_days, revisions, description, features) on service_packages to authenticated;
grant update (tier, price_minor, currency, delivery_days, revisions, description, features) on service_packages to authenticated;
grant delete on service_packages to authenticated;
grant insert (profile_id, title, url, description), update (title, url, description), delete on portfolio_items to authenticated;
grant insert (user_id, service_id), delete on favourites to authenticated;
grant insert (owner_id, category_slug, title, description, skills, budget_type, budget_min_minor, budget_max_minor, currency, deadline, visibility, status),
      update (category_slug, title, description, skills, budget_type, budget_min_minor, budget_max_minor, currency, deadline, visibility, status) on projects to authenticated;
grant insert (project_id, freelancer_id, cover_letter, price_minor, currency, delivery_days, status), update (status) on proposals to authenticated;
grant insert (order_id, from_id, to_id, rating, text) on reviews to authenticated;
grant insert (user_a, user_b, context) on conversations to authenticated;
grant insert (conversation_id, sender_id, body) on messages to authenticated;
grant insert (conversation_id, user_id, read_at), update (read_at) on conversation_reads to authenticated;
grant update (read) on notifications to authenticated;
grant insert (reporter_id, service_id, reason) on reports to authenticated;

-- ---------- row level security ----------
alter table categories enable row level security;
alter table platform_settings enable row level security;
alter table profiles enable row level security;
alter table admin_users enable row level security;
alter table portfolio_items enable row level security;
alter table services enable row level security;
alter table service_packages enable row level security;
alter table favourites enable row level security;
alter table projects enable row level security;
alter table proposals enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table order_deliveries enable row level security;
alter table order_transitions enable row level security;
alter table payments enable row level security;
alter table payment_events enable row level security;
alter table ledger_entries enable row level security;
alter table payouts enable row level security;
alter table disputes enable row level security;
alter table reviews enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table conversation_reads enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
alter table contact_messages enable row level security;
alter table audit_logs enable row level security;
-- admin_users, order_transitions, payment_events, ledger_entries, contact_messages (read): no select policy => service role only.

create policy categories_read on categories for select using (true);
create policy settings_read on platform_settings for select using (key = 'fees');

create policy profiles_read on profiles for select using (not suspended or id = auth.uid() or is_admin());
create policy profiles_update_own on profiles for update using (id = auth.uid() and not suspended) with check (id = auth.uid());

create policy portfolio_read on portfolio_items for select using (true);
create policy portfolio_insert on portfolio_items for insert with check (profile_id = auth.uid() and is_active());
create policy portfolio_update on portfolio_items for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy portfolio_delete on portfolio_items for delete using (profile_id = auth.uid());

create policy services_read on services for select using ((status = 'published' and moderation = 'approved') or seller_id = auth.uid() or is_admin());
create policy services_insert on services for insert with check (seller_id = auth.uid() and is_active() and status in ('draft','published','paused','archived'));
create policy services_update on services for update using (seller_id = auth.uid() and is_active()) with check (seller_id = auth.uid() and status in ('draft','published','paused','archived'));

create policy packages_read on service_packages for select using (exists (select 1 from services s where s.id = service_id));
create policy packages_insert on service_packages for insert with check (exists (select 1 from services s where s.id = service_id and s.seller_id = auth.uid()) and is_active());
create policy packages_update on service_packages for update using (exists (select 1 from services s where s.id = service_id and s.seller_id = auth.uid()))
  with check (exists (select 1 from services s where s.id = service_id and s.seller_id = auth.uid()));
create policy packages_delete on service_packages for delete using (exists (select 1 from services s where s.id = service_id and s.seller_id = auth.uid()));

create policy fav_read on favourites for select using (user_id = auth.uid());
create policy fav_insert on favourites for insert with check (user_id = auth.uid() and is_active());
create policy fav_delete on favourites for delete using (user_id = auth.uid());

create policy projects_read on projects for select using ((status = 'published' and visibility = 'public') or owner_id = auth.uid() or is_project_freelancer(id) or is_admin());
create policy projects_insert on projects for insert with check (owner_id = auth.uid() and is_active() and status in ('draft','published'));
create policy projects_update on projects for update using (owner_id = auth.uid() and is_active() and status in ('draft','published'))
  with check (owner_id = auth.uid() and status in ('draft','published','cancelled'));

create policy proposals_read on proposals for select using (freelancer_id = auth.uid() or owns_project(project_id) or is_admin());
create policy proposals_insert on proposals for insert with check (
  freelancer_id = auth.uid() and is_active() and status = 'submitted' and project_is_open(project_id) and not owns_project(project_id));
create policy proposals_withdraw on proposals for update using (freelancer_id = auth.uid() and status in ('submitted','viewed','shortlisted'))
  with check (freelancer_id = auth.uid() and status = 'withdrawn');
create policy proposals_owner_update on proposals for update using (owns_project(project_id) and status in ('submitted','viewed','shortlisted'))
  with check (owns_project(project_id) and status in ('viewed','shortlisted','rejected'));

create policy orders_read on orders for select using (client_id = auth.uid() or freelancer_id = auth.uid() or is_admin());
create policy order_events_read on order_events for select using (exists (select 1 from orders o where o.id = order_id));
create policy order_deliveries_read on order_deliveries for select using (exists (select 1 from orders o where o.id = order_id));
create policy payments_read on payments for select using (exists (select 1 from orders o where o.id = order_id));
create policy payouts_read on payouts for select using (user_id = auth.uid() or is_admin());
create policy disputes_read on disputes for select using (exists (select 1 from orders o where o.id = order_id));

create policy reviews_read on reviews for select using (true);
create policy reviews_insert on reviews for insert with check (
  from_id = auth.uid() and is_active() and exists (
    select 1 from orders o where o.id = order_id and o.status = 'completed'
      and ((o.client_id = auth.uid() and o.freelancer_id = to_id) or (o.freelancer_id = auth.uid() and o.client_id = to_id))));

create policy conv_read on conversations for select using (user_a = auth.uid() or user_b = auth.uid());
create policy conv_insert on conversations for insert with check ((user_a = auth.uid() or user_b = auth.uid()) and is_active());
create policy msg_read on messages for select using (exists (select 1 from conversations c where c.id = conversation_id));
create policy msg_insert on messages for insert with check (sender_id = auth.uid() and is_active() and exists (select 1 from conversations c where c.id = conversation_id));
create policy reads_read on conversation_reads for select using (user_id = auth.uid());
create policy reads_insert on conversation_reads for insert with check (user_id = auth.uid() and exists (select 1 from conversations c where c.id = conversation_id));
create policy reads_update on conversation_reads for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notif_read on notifications for select using (user_id = auth.uid());
create policy notif_update on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy reports_read on reports for select using (reporter_id = auth.uid() or is_admin());
create policy reports_insert on reports for insert with check (reporter_id = auth.uid() and is_active());
create policy contact_insert on contact_messages for insert with check (true);
create policy audit_read on audit_logs for select using (is_admin());
