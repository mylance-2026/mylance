"use client";

import { useSyncExternalStore } from "react";
import type { OrderStatus, Package } from "../types";

/**
 * Local preview data layer. Everything lives in this browser's localStorage so the whole
 * frontend can be exercised end to end before the real backend exists. It is enabled only
 * with NEXT_PUBLIC_DEMO_MODE=1 and must be replaced by the server-backed adapter.
 * Nothing here moves real money.
 */
export const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
const KEY = "mylance.local.v1";

export interface User {
  id: string; email: string; pw: string; name: string; username: string;
  isClient: boolean; isFreelancer: boolean; isAdmin: boolean; suspended: boolean;
  country: string; headline: string; bio: string; skills: string[]; languages: string[];
  level: string; timezone: string; available: boolean; createdAt: string;
  portfolio?: PortfolioItem[];
}
export interface PortfolioItem { id: string; title: string; url: string; description: string }
export interface FavRec { userId: string; serviceId: string }
export interface ResetRec { token: string; userId: string; at: string }
export interface ServiceRec {
  id: string; slug: string; sellerId: string; title: string; description: string; categorySlug: string;
  tags: string[]; requirements: string; packages: Package[];
  status: "draft" | "published" | "paused" | "archived" | "rejected";
  moderation: "pending" | "approved" | "rejected"; createdAt: string;
}
export interface ProjectRec {
  id: string; ownerId: string; title: string; description: string; categorySlug: string; skills: string[];
  budgetType: "fixed" | "hourly"; minMinor: number; maxMinor: number; currency: string; deadline: string;
  status: "draft" | "published" | "in_progress" | "completed" | "cancelled"; createdAt: string;
}
export interface ProposalRec {
  id: string; projectId: string; freelancerId: string; cover: string; priceMinor: number; currency: string;
  days: number; status: "submitted" | "viewed" | "shortlisted" | "accepted" | "rejected" | "withdrawn"; createdAt: string;
}
export interface OrderRec {
  id: string; clientId: string; freelancerId: string; title: string;
  serviceId?: string; tier?: string; proposalId?: string; projectId?: string;
  status: OrderStatus; currency: string; baseMinor: number;
  clientFeeBps: number; freelancerFeeBps: number; clientFeeMinor: number; freelancerFeeMinor: number;
  requirements: string; deadline: string; revisionsAllowed: number; revisionsUsed: number;
  deliveries: { id: string; notes: string; at: string }[];
  events: { at: string; text: string }[]; createdAt: string;
}
export interface PaymentRec { id: string; orderId: string; ref: string; status: "succeeded" | "refunded"; amountMinor: number; currency: string; at: string }
export interface ConvRec { id: string; a: string; b: string; context: string; messages: { id: string; from: string; text: string; at: string }[]; reads: Record<string, string> }
export interface NotifRec { id: string; userId: string; text: string; href: string; read: boolean; at: string }
export interface ReviewRec { id: string; orderId: string; fromId: string; toId: string; rating: number; text: string; at: string }
export interface PayoutRec { id: string; userId: string; amountMinor: number; currency: string; status: "pending" | "paid" | "rejected"; at: string }
export interface DisputeRec { id: string; orderId: string; openedBy: string; reason: string; status: "open" | "resolved"; resolution: string; at: string }
export interface ReportRec { id: string; reporterId: string; serviceId: string; reason: string; status: "open" | "resolved"; at: string }
export interface AuditRec { id: string; at: string; actor: string; action: string; entity: string }
export interface ContactRec { id: string; name: string; email: string; message: string; at: string }

export interface Db {
  ready: boolean;
  sessionUserId: string | null;
  users: User[]; services: ServiceRec[]; projects: ProjectRec[]; proposals: ProposalRec[];
  orders: OrderRec[]; payments: PaymentRec[]; convs: ConvRec[]; notifs: NotifRec[]; reviews: ReviewRec[];
  favs: FavRec[]; resets: ResetRec[];
  payouts: PayoutRec[]; disputes: DisputeRec[]; reports: ReportRec[]; audit: AuditRec[]; contacts: ContactRec[];
  settings: { clientFeeBps: number; freelancerFeeBps: number; requireModeration: boolean };
}

const blank = (ready: boolean): Db => ({
  ready, sessionUserId: null, users: [], services: [], projects: [], proposals: [], orders: [], payments: [],
  convs: [], notifs: [], reviews: [], favs: [], resets: [], payouts: [], disputes: [], reports: [], audit: [], contacts: [],
  settings: { clientFeeBps: 400, freelancerFeeBps: 400, requireModeration: false },
});
const EMPTY = blank(false);

export const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
export const now = () => new Date().toISOString();

let cache: Db = EMPTY;
let loaded = false;
const subs = new Set<() => void>();

function load(): Db {
  const base = blank(true);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...base, ...JSON.parse(raw), ready: true };
  } catch {
    /* corrupted or blocked storage: start clean */
  }
  return base;
}
function persist(d: Db) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...d, ready: undefined })); } catch { /* storage full or blocked */ }
}
const emit = () => subs.forEach((s) => s());

function snapshot(): Db {
  if (!loaded && typeof window !== "undefined") {
    cache = load();
    loaded = true;
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) { cache = load(); emit(); }
    });
  }
  return cache;
}

export function mutate(fn: (d: Db) => void) {
  const next = structuredClone(snapshot());
  fn(next);
  cache = next;
  persist(next);
  emit();
}
export function read(): Db { return snapshot(); }

export function useDb(): Db {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, snapshot, () => EMPTY);
}
export function useSession() {
  const db = useDb();
  const user = db.users.find((u) => u.id === db.sessionUserId) ?? null;
  return { db, user, ready: db.ready };
}

export function resetLocalData() {
  cache = blank(true);
  persist(cache);
  emit();
}
