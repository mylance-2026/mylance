"use client";

import { calculateFees } from "../domain/fees";
import { canAcceptProposal, canSubmitProposal, isActiveProposal } from "../domain/proposal";
import { assertTransition, type Actor } from "../domain/order-state";
import type { OrderStatus } from "../types";
import { DEMO, mutate, now, read, uid, type Db, type OrderRec, type User, type ServiceRec } from "./store";

export type Res<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
const ok = <T,>(data: T): Res<T> => ({ ok: true, data });
const fail = (error: string): Res<never> => ({ ok: false, error });

/** Runs a mutation with a guard; `fn` throws Error(message) to reject. */
function run<T>(fn: (d: Db, me: User | null) => T, opts: { auth?: boolean } = { auth: true }): Res<T> {
  if (!DEMO) return fail("The backend is not connected yet (local preview mode is off).");
  const before = read();
  const me = before.users.find((u) => u.id === before.sessionUserId) ?? null;
  if (opts.auth !== false && !me) return fail("Please log in first.");
  if (me?.suspended) return fail("This account is suspended.");
  let out: T | undefined;
  try {
    mutate((d) => {
      const m = d.users.find((u) => u.id === d.sessionUserId) ?? null;
      out = fn(d, m);
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Something went wrong.");
  }
  return ok(out as T);
}

const weakHash = (s: string) => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return String(h); };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";
const must = <T,>(v: T | undefined | null, msg: string): T => { if (v == null) throw new Error(msg); return v; };
const log = (d: Db, actor: string, action: string, entity: string) => d.audit.unshift({ id: uid(), at: now(), actor, action, entity });
const notify = (d: Db, userId: string, text: string, href: string) => d.notifs.unshift({ id: uid(), userId, text, href, read: false, at: now() });
const ev = (o: OrderRec, text: string) => o.events.push({ at: now(), text });

// ---------- auth ----------
export function signUp(i: { name: string; email: string; password: string; role: "client" | "freelancer" | "both" }) {
  return run((d) => {
    const email = i.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email.");
    if (i.password.length < 8) throw new Error("Password must be at least 8 characters.");
    if (!i.name.trim()) throw new Error("Enter your name.");
    if (d.users.some((u) => u.email === email)) throw new Error("An account with this email already exists.");
    let username = slug(i.name).replace(/-/g, "_");
    if (username.length < 3) username += "_user";
    while (d.users.some((u) => u.username === username)) username += Math.floor(Math.random() * 10);
    const u: User = {
      id: uid(), email, pw: weakHash(i.password), name: i.name.trim(), username,
      isClient: i.role !== "freelancer", isFreelancer: i.role !== "client", isAdmin: false, suspended: false,
      country: "", headline: "", bio: "", skills: [], languages: [], level: "intermediate", timezone: "", available: true, createdAt: now(),
    };
    d.users.push(u);
    d.sessionUserId = u.id;
    return u.id;
  }, { auth: false });
}
export function logIn(email: string, password: string) {
  return run((d) => {
    const u = must(d.users.find((x) => x.email === email.trim().toLowerCase() && x.pw === weakHash(password)), "Incorrect email or password.");
    if (u.suspended) throw new Error("This account is suspended.");
    d.sessionUserId = u.id;
    return u.id;
  }, { auth: false });
}
export const logOut = () => run((d) => { d.sessionUserId = null; }, { auth: false });
/** Preview only: lets you try the admin area. The real backend grants admin server-side. */
export const claimAdminLocal = () => run((d, me) => { must(me, "Log in first.").isAdmin = true; log(d, me!.id, "admin.claim_local", "user"); });

export function updateProfile(p: Partial<Pick<User, "name" | "username" | "country" | "headline" | "bio" | "skills" | "languages" | "level" | "timezone" | "available" | "isClient" | "isFreelancer">>) {
  return run((d, me) => {
    const u = must(me, "Log in first.");
    if (p.username !== undefined) {
      if (!/^[a-z0-9_]{3,30}$/.test(p.username)) throw new Error("Username: 3–30 characters, a–z, 0–9 and underscore.");
      if (d.users.some((x) => x.username === p.username && x.id !== u.id)) throw new Error("That username is taken.");
    }
    if (p.name !== undefined && !p.name.trim()) throw new Error("Name is required.");
    if (p.bio && p.bio.length > 2000) throw new Error("Biography is too long.");
    Object.assign(u, p);
  });
}
export function deleteAccount() {
  return run((d, me) => {
    const id = must(me, "Log in first.").id;
    if (d.orders.some((o) => (o.clientId === id || o.freelancerId === id) && !["completed", "cancelled", "refunded"].includes(o.status)))
      throw new Error("Finish or cancel your active orders before deleting your account.");
    d.users = d.users.filter((u) => u.id !== id);
    d.services = d.services.filter((s) => s.sellerId !== id);
    d.favs = d.favs.filter((f) => f.userId !== id);
    d.sessionUserId = null;
  });
}

export function addPortfolioItem(i: { title: string; url: string; description: string }) {
  return run((d, me) => {
    const u = must(me, "Log in first.");
    if (i.title.trim().length < 2) throw new Error("Give the item a title.");
    let url = i.url.trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    try { if (url) new URL(url); } catch { throw new Error("Enter a valid link."); }
    if ((u.portfolio ?? []).length >= 12) throw new Error("You can list up to 12 portfolio items.");
    u.portfolio = [...(u.portfolio ?? []), { id: uid(), title: i.title.trim().slice(0, 80), url, description: i.description.trim().slice(0, 500) }];
  });
}
export function removePortfolioItem(id: string) {
  return run((d, me) => { const u = must(me, "Log in first."); u.portfolio = (u.portfolio ?? []).filter((p) => p.id !== id); });
}
export function toggleFavourite(serviceId: string) {
  return run((d, me) => {
    const u = must(me, "Log in first.");
    must(d.services.find((s) => s.id === serviceId), "Service not found.");
    const i = d.favs.findIndex((f) => f.userId === u.id && f.serviceId === serviceId);
    if (i >= 0) { d.favs.splice(i, 1); return false; }
    d.favs.push({ userId: u.id, serviceId });
    return true;
  });
}
/** Preview only: no email is sent, so the token is returned for the page to show. */
export function requestPasswordReset(email: string) {
  return run((d) => {
    const u = d.users.find((x) => x.email === email.trim().toLowerCase());
    if (!u) return "";
    const token = uid();
    d.resets = [...d.resets.filter((r) => r.userId !== u.id), { token, userId: u.id, at: now() }];
    return token;
  }, { auth: false });
}
export function resetPassword(token: string, password: string) {
  return run((d) => {
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    const r = must(d.resets.find((x) => x.token === token), "This reset link is invalid or already used.");
    if (Date.now() - new Date(r.at).getTime() > 3600_000) throw new Error("This reset link has expired.");
    must(d.users.find((u) => u.id === r.userId), "Account not found.").pw = weakHash(password);
    d.resets = d.resets.filter((x) => x.token !== token);
  }, { auth: false });
}

// ---------- services ----------
export function saveService(i: Omit<ServiceRec, "id" | "slug" | "sellerId" | "status" | "moderation" | "createdAt"> & { id?: string }, publish: boolean) {
  return run((d, me) => {
    const u = must(me, "Log in first.");
    if (i.title.trim().length < 5) throw new Error("Title must be at least 5 characters.");
    if (!i.categorySlug) throw new Error("Choose a category.");
    if (i.description.trim().length < 20) throw new Error("Describe the service in at least 20 characters.");
    if (!i.packages.length) throw new Error("Add at least one package with a price.");
    for (const p of i.packages) if (p.priceMinor <= 0 || p.deliveryDays < 1) throw new Error("Each package needs a price and delivery time.");
    u.isFreelancer = true;
    let s = i.id ? d.services.find((x) => x.id === i.id && x.sellerId === u.id) : undefined;
    if (!s) {
      let sl = slug(i.title);
      while (d.services.some((x) => x.slug === sl)) sl += "-" + Math.floor(Math.random() * 1000);
      s = { id: uid(), slug: sl, sellerId: u.id, status: "draft", moderation: "pending", createdAt: now(), ...i } as ServiceRec;
      d.services.push(s);
    } else Object.assign(s, i);
    if (publish) {
      s.status = "published";
      s.moderation = d.settings.requireModeration ? "pending" : "approved";
      log(d, u.id, "service.publish", s.id);
    } else s.status = "draft";
    return s.slug;
  });
}
export function setServiceStatus(id: string, status: ServiceRec["status"]) {
  return run((d, me) => { const s = must(d.services.find((x) => x.id === id && x.sellerId === me!.id), "Service not found."); s.status = status; });
}
export function moderateService(id: string, approve: boolean) {
  return run((d, me) => {
    if (!me!.isAdmin) throw new Error("Admins only.");
    const s = must(d.services.find((x) => x.id === id), "Service not found.");
    s.moderation = approve ? "approved" : "rejected";
    if (!approve) s.status = "rejected";
    notify(d, s.sellerId, `Your service "${s.title}" was ${approve ? "approved" : "rejected"}.`, "/dashboard/services");
    log(d, me!.id, approve ? "service.approve" : "service.reject", s.id);
  });
}
export const isPublic = (s: ServiceRec) => s.status === "published" && s.moderation === "approved";

// ---------- orders ----------
function createOrder(d: Db, p: { clientId: string; freelancerId: string; title: string; baseMinor: number; currency: string; requirements: string; days: number; revisions: number; serviceId?: string; tier?: string; proposalId?: string; projectId?: string }) {
  const f = calculateFees(BigInt(p.baseMinor), p.currency, { clientFeeBps: d.settings.clientFeeBps, freelancerFeeBps: d.settings.freelancerFeeBps });
  const o: OrderRec = {
    id: uid(), clientId: p.clientId, freelancerId: p.freelancerId, title: p.title, serviceId: p.serviceId, tier: p.tier,
    proposalId: p.proposalId, projectId: p.projectId, status: "pending_payment", currency: p.currency, baseMinor: p.baseMinor,
    clientFeeBps: f.clientFeeBps, freelancerFeeBps: f.freelancerFeeBps, clientFeeMinor: Number(f.clientFee), freelancerFeeMinor: Number(f.freelancerFee),
    requirements: p.requirements, deadline: new Date(Date.now() + p.days * 86400000).toISOString().slice(0, 10),
    revisionsAllowed: p.revisions, revisionsUsed: 0, deliveries: [], events: [], createdAt: now(),
  };
  ev(o, "Order created");
  d.orders.push(o);
  notify(d, p.freelancerId, `New order: ${p.title}`, `/dashboard/orders/${o.id}`);
  return o;
}
export function placeServiceOrder(serviceId: string, tier: string, requirements: string) {
  return run((d, me) => {
    const u = must(me, "Log in first.");
    const s = must(d.services.find((x) => x.id === serviceId), "Service not found.");
    if (!isPublic(s)) throw new Error("This service is not available.");
    if (s.sellerId === u.id) throw new Error("You cannot buy your own service.");
    const p = must(s.packages.find((x) => x.tier === tier), "Package not found.");
    if (requirements.trim().length < 10) throw new Error("Describe what you need (at least 10 characters).");
    u.isClient = true;
    return createOrder(d, { clientId: u.id, freelancerId: s.sellerId, title: `${s.title} (${p.tier})`, baseMinor: p.priceMinor, currency: p.currency, requirements, days: p.deliveryDays, revisions: p.revisions, serviceId: s.id, tier: p.tier }).id;
  });
}

function actorOf(o: OrderRec, me: User): Actor {
  if (o.clientId === me.id) return "client";
  if (o.freelancerId === me.id) return "freelancer";
  if (me.isAdmin) return "admin";
  throw new Error("You are not part of this order.");
}
function transition(d: Db, me: User, id: string, to: OrderStatus, text: string, as?: Actor) {
  const o = must(d.orders.find((x) => x.id === id), "Order not found.");
  const actor = as ?? actorOf(o, me);
  assertTransition(o.status, to, actor);
  o.status = to;
  ev(o, text);
  const other = o.clientId === me.id ? o.freelancerId : o.clientId;
  if (other !== me.id) notify(d, other, `${o.title}: ${text}`, `/dashboard/orders/${o.id}`);
  return o;
}

/** Local preview stand-in for a verified payment webhook. Never moves money. */
export function payOrderLocal(id: string) {
  return run((d, me) => {
    const o = must(d.orders.find((x) => x.id === id), "Order not found.");
    if (o.clientId !== me!.id) throw new Error("Only the client can pay for this order.");
    transition(d, me!, id, "payment_confirmed", "Payment confirmed (local preview)", "system");
    d.payments.push({ id: uid(), orderId: id, ref: "LOCAL-" + uid().slice(0, 8), status: "succeeded", amountMinor: o.baseMinor + o.clientFeeMinor, currency: o.currency, at: now() });
  });
}
export const startOrder = (id: string) => run((d, me) => { transition(d, me!, id, "in_progress", "Work started"); });
export function deliverOrder(id: string, notes: string) {
  return run((d, me) => {
    if (notes.trim().length < 3) throw new Error("Add delivery notes.");
    const o = transition(d, me!, id, "delivered", "Delivery submitted");
    o.deliveries.push({ id: uid(), notes: notes.trim(), at: now() });
  });
}
export const approveOrder = (id: string) => run((d, me) => { transition(d, me!, id, "completed", "Delivery approved. Order completed"); });
export function requestRevision(id: string, note: string) {
  return run((d, me) => {
    const o = must(d.orders.find((x) => x.id === id), "Order not found.");
    if (o.revisionsUsed >= o.revisionsAllowed) throw new Error("No revisions left on this order.");
    transition(d, me!, id, "revision_requested", `Revision requested${note.trim() ? ": " + note.trim() : ""}`);
    o.revisionsUsed += 1;
  });
}
export function cancelOrder(id: string) {
  return run((d, me) => {
    const o = must(d.orders.find((x) => x.id === id), "Order not found.");
    if (o.status !== "pending_payment" && !me!.isAdmin) throw new Error("Paid orders can only be cancelled through a dispute.");
    transition(d, me!, id, "cancelled", "Order cancelled");
  });
}
export function requestCancellation(id: string, reason: string) {
  return run((d, me) => {
    const o = must(d.orders.find((x) => x.id === id), "Order not found.");
    if (o.clientId !== me!.id && o.freelancerId !== me!.id) throw new Error("Not your order.");
    if (!["payment_confirmed", "in_progress", "delivered", "revision_requested"].includes(o.status)) throw new Error("Cancellation can only be requested on active paid orders.");
    if (reason.trim().length < 10) throw new Error("Explain why (at least 10 characters).");
    ev(o, `Cancellation requested: ${reason.trim()}`);
    notify(d, o.clientId === me!.id ? o.freelancerId : o.clientId, `Cancellation requested on "${o.title}". Open a dispute if you cannot agree.`, `/dashboard/orders/${o.id}`);
  });
}
export function openDispute(id: string, reason: string) {
  return run((d, me) => {
    if (reason.trim().length < 10) throw new Error("Explain the problem (at least 10 characters).");
    transition(d, me!, id, "disputed", "Dispute opened");
    d.disputes.push({ id: uid(), orderId: id, openedBy: me!.id, reason: reason.trim(), status: "open", resolution: "", at: now() });
  });
}
export function resolveDispute(id: string, outcome: "completed" | "refunded" | "cancelled") {
  return run((d, me) => {
    if (!me!.isAdmin) throw new Error("Admins only.");
    const dp = must(d.disputes.find((x) => x.id === id), "Dispute not found.");
    transition(d, me!, dp.orderId, outcome, `Dispute resolved: ${outcome}`, "admin");
    if (outcome === "refunded") for (const p of d.payments) if (p.orderId === dp.orderId) p.status = "refunded";
    dp.status = "resolved"; dp.resolution = outcome;
    log(d, me!.id, "dispute.resolve", dp.id);
  });
}

// ---------- projects & proposals ----------
export function saveProject(i: { title: string; description: string; categorySlug: string; skills: string[]; budgetType: "fixed" | "hourly"; minMinor: number; maxMinor: number; currency: string; deadline: string }, publish: boolean) {
  return run((d, me) => {
    if (i.title.trim().length < 5) throw new Error("Title must be at least 5 characters.");
    if (i.description.trim().length < 20) throw new Error("Describe the project in at least 20 characters.");
    if (!i.categorySlug) throw new Error("Choose a category.");
    if (i.maxMinor < i.minMinor) throw new Error("Maximum budget must be at least the minimum.");
    const p = { id: uid(), ownerId: me!.id, status: publish ? "published" : "draft", createdAt: now(), ...i } as Db["projects"][number];
    d.projects.push(p);
    me!.isClient = true;
    return p.id;
  });
}
export function publishProject(id: string) { return run((d, me) => { must(d.projects.find((p) => p.id === id && p.ownerId === me!.id), "Project not found.").status = "published"; }); }
export function cancelProject(id: string) { return run((d, me) => { must(d.projects.find((p) => p.id === id && p.ownerId === me!.id), "Project not found.").status = "cancelled"; }); }

export function submitProposal(i: { projectId: string; cover: string; priceMinor: number; days: number }) {
  return run((d, me) => {
    const pj = must(d.projects.find((p) => p.id === i.projectId), "Project not found.");
    const chk = canSubmitProposal({ projectOwnerId: pj.ownerId, projectStatus: pj.status, freelancerId: me!.id, existingActiveProposal: d.proposals.some((x) => x.projectId === pj.id && x.freelancerId === me!.id && isActiveProposal(x.status)) });
    if (!chk.ok) throw new Error({ own_project: "You cannot bid on your own project.", project_not_open: "This project is not open for proposals.", duplicate: "You already have an active proposal on this project." }[chk.reason!] ?? "Not allowed.");
    if (i.cover.trim().length < 20) throw new Error("Cover letter must be at least 20 characters.");
    if (!(i.priceMinor > 0) || !(i.days >= 1)) throw new Error("Enter a price and delivery time.");
    me!.isFreelancer = true;
    d.proposals.push({ id: uid(), projectId: pj.id, freelancerId: me!.id, cover: i.cover.trim(), priceMinor: i.priceMinor, currency: pj.currency, days: i.days, status: "submitted", createdAt: now() });
    notify(d, pj.ownerId, `New proposal on "${pj.title}"`, `/dashboard/projects/${pj.id}`);
  });
}
export function setProposalStatus(id: string, status: "viewed" | "shortlisted" | "rejected" | "withdrawn") {
  return run((d, me) => {
    const p = must(d.proposals.find((x) => x.id === id), "Proposal not found.");
    const pj = must(d.projects.find((x) => x.id === p.projectId), "Project not found.");
    if (status === "withdrawn") { if (p.freelancerId !== me!.id) throw new Error("Not your proposal."); }
    else if (pj.ownerId !== me!.id) throw new Error("Only the project owner can do this.");
    if (!isActiveProposal(p.status)) throw new Error("This proposal is no longer active.");
    p.status = status;
    if (status !== "withdrawn") notify(d, p.freelancerId, `Your proposal on "${pj.title}" was ${status}.`, `/projects/${pj.id}`);
  });
}
export function acceptProposal(id: string) {
  return run((d, me) => {
    const p = must(d.proposals.find((x) => x.id === id), "Proposal not found.");
    const pj = must(d.projects.find((x) => x.id === p.projectId), "Project not found.");
    if (!canAcceptProposal(me!.id, pj.ownerId, p.status)) throw new Error("This proposal cannot be accepted.");
    if (pj.status !== "published" || d.proposals.some((x) => x.projectId === pj.id && x.status === "accepted")) throw new Error("This project already has an accepted proposal.");
    p.status = "accepted";
    for (const o of d.proposals) if (o.projectId === pj.id && o.id !== p.id && isActiveProposal(o.status)) { o.status = "rejected"; notify(d, o.freelancerId, `Your proposal on "${pj.title}" was not selected.`, `/projects/${pj.id}`); }
    pj.status = "in_progress";
    log(d, me!.id, "proposal.accept", p.id);
    const o = createOrder(d, { clientId: pj.ownerId, freelancerId: p.freelancerId, title: pj.title, baseMinor: p.priceMinor, currency: p.currency, requirements: pj.description, days: p.days, revisions: 2, proposalId: p.id, projectId: pj.id });
    notify(d, p.freelancerId, `Your proposal on "${pj.title}" was accepted.`, `/dashboard/orders/${o.id}`);
    return o.id;
  });
}

// ---------- messaging ----------
export function startConversation(otherId: string, context: string) {
  return run((d, me) => {
    if (otherId === me!.id) throw new Error("You cannot message yourself.");
    must(d.users.find((u) => u.id === otherId), "User not found.");
    let c = d.convs.find((x) => (x.a === me!.id && x.b === otherId) || (x.b === me!.id && x.a === otherId));
    if (!c) { c = { id: uid(), a: me!.id, b: otherId, context, messages: [], reads: {} }; d.convs.push(c); }
    return c.id;
  });
}
export function sendMessage(convId: string, text: string) {
  return run((d, me) => {
    const c = must(d.convs.find((x) => x.id === convId && (x.a === me!.id || x.b === me!.id)), "Conversation not found.");
    const t = text.trim();
    if (!t) throw new Error("Write a message first.");
    if (t.length > 4000) throw new Error("Message is too long.");
    c.messages.push({ id: uid(), from: me!.id, text: t, at: now() });
    c.reads[me!.id] = now();
    notify(d, c.a === me!.id ? c.b : c.a, `New message from ${me!.name}`, `/dashboard/messages?c=${c.id}`);
  });
}
export function markConversationRead(convId: string) {
  const db = read();
  const me = db.sessionUserId;
  if (!me) return;
  const c = db.convs.find((x) => x.id === convId);
  if (!c || (c.reads[me] && c.messages.every((m) => m.at <= c.reads[me]))) return;
  mutate((d) => { const x = d.convs.find((k) => k.id === convId); if (x) x.reads[me] = now(); });
}

// ---------- reviews, notifications, reports, contact ----------
export function submitReview(orderId: string, rating: number, text: string) {
  return run((d, me) => {
    const o = must(d.orders.find((x) => x.id === orderId), "Order not found.");
    if (o.clientId !== me!.id && o.freelancerId !== me!.id) throw new Error("You are not part of this order.");
    if (o.status !== "completed") throw new Error("You can review only completed orders.");
    if (d.reviews.some((r) => r.orderId === orderId && r.fromId === me!.id)) throw new Error("You already reviewed this order.");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Choose a rating from 1 to 5.");
    const to = o.clientId === me!.id ? o.freelancerId : o.clientId;
    d.reviews.push({ id: uid(), orderId, fromId: me!.id, toId: to, rating, text: text.trim().slice(0, 2000), at: now() });
    notify(d, to, `You received a ${rating}-star review.`, "/dashboard/reviews");
  });
}
export const markNotifRead = (id: string) => run((d, me) => { const n = d.notifs.find((x) => x.id === id && x.userId === me!.id); if (n) n.read = true; });
export const markAllNotifsRead = () => run((d, me) => { d.notifs.forEach((n) => { if (n.userId === me!.id) n.read = true; }); });
export function reportService(serviceId: string, reason: string) {
  return run((d, me) => {
    if (reason.trim().length < 5) throw new Error("Tell us what is wrong.");
    d.reports.push({ id: uid(), reporterId: me!.id, serviceId, reason: reason.trim(), status: "open", at: now() });
  });
}
export const resolveReport = (id: string) => run((d, me) => { if (!me!.isAdmin) throw new Error("Admins only."); const r = must(d.reports.find((x) => x.id === id), "Report not found."); r.status = "resolved"; log(d, me!.id, "report.resolve", id); });
export function sendContact(name: string, email: string, message: string) {
  return run((d) => {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || message.trim().length < 10) throw new Error("Fill in your name, a valid email and a message of at least 10 characters.");
    d.contacts.push({ id: uid(), name: name.trim(), email, message: message.trim(), at: now() });
  }, { auth: false });
}

// ---------- payouts & balances ----------
export function balanceOf(db: Db, userId: string, currency = "USD") {
  const earned = db.orders.filter((o) => o.freelancerId === userId && o.status === "completed" && o.currency === currency).reduce((s, o) => s + o.baseMinor - o.freelancerFeeMinor, 0);
  const pending = db.orders.filter((o) => o.freelancerId === userId && ["payment_confirmed", "in_progress", "delivered", "revision_requested", "disputed"].includes(o.status) && o.currency === currency).reduce((s, o) => s + o.baseMinor - o.freelancerFeeMinor, 0);
  const paidOut = db.payouts.filter((p) => p.userId === userId && p.currency === currency && p.status === "paid").reduce((s, p) => s + p.amountMinor, 0);
  const requested = db.payouts.filter((p) => p.userId === userId && p.currency === currency && p.status === "pending").reduce((s, p) => s + p.amountMinor, 0);
  return { available: earned - paidOut - requested, pending, paidOut, requested };
}
export function requestPayout(amountMinor: number, currency = "USD") {
  return run((d, me) => {
    const b = balanceOf(d, me!.id, currency);
    if (!(amountMinor > 0)) throw new Error("Enter an amount.");
    if (amountMinor > b.available) throw new Error("That is more than your available balance.");
    d.payouts.push({ id: uid(), userId: me!.id, amountMinor, currency, status: "pending", at: now() });
  });
}
export function reviewPayout(id: string, approve: boolean) {
  return run((d, me) => {
    if (!me!.isAdmin) throw new Error("Admins only.");
    const p = must(d.payouts.find((x) => x.id === id && x.status === "pending"), "Payout not found.");
    p.status = approve ? "paid" : "rejected";
    notify(d, p.userId, `Your payout request was ${approve ? "approved (local preview, no money moved)" : "rejected"}.`, "/dashboard/earnings");
    log(d, me!.id, approve ? "payout.approve" : "payout.reject", id);
  });
}

// ---------- admin ----------
export function setSuspended(userId: string, suspended: boolean) {
  return run((d, me) => {
    if (!me!.isAdmin) throw new Error("Admins only.");
    if (userId === me!.id) throw new Error("You cannot suspend yourself.");
    must(d.users.find((u) => u.id === userId), "User not found.").suspended = suspended;
    log(d, me!.id, suspended ? "user.suspend" : "user.restore", userId);
  });
}
export function updateSettings(clientFeeBps: number, freelancerFeeBps: number, requireModeration: boolean) {
  return run((d, me) => {
    if (!me!.isAdmin) throw new Error("Admins only.");
    for (const v of [clientFeeBps, freelancerFeeBps]) if (!Number.isInteger(v) || v < 0 || v > 10000) throw new Error("Fee must be between 0% and 100%.");
    d.settings = { clientFeeBps, freelancerFeeBps, requireModeration };
    log(d, me!.id, "settings.update", `fees ${clientFeeBps}/${freelancerFeeBps} bps, moderation ${requireModeration}`);
  });
}
