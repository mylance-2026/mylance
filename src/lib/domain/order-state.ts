export const ORDER_STATUSES = [
  "pending_payment", "payment_confirmed", "in_progress", "delivered",
  "revision_requested", "completed", "cancelled", "refunded", "disputed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Actor = "client" | "freelancer" | "system" | "admin";

const T: Record<OrderStatus, Partial<Record<OrderStatus, Actor[]>>> = {
  pending_payment: { payment_confirmed: ["system"], cancelled: ["client", "admin"] },
  payment_confirmed: { in_progress: ["freelancer", "system"], cancelled: ["admin"], refunded: ["admin", "system"] },
  in_progress: { delivered: ["freelancer"], cancelled: ["admin"], disputed: ["client", "freelancer"] },
  delivered: { completed: ["client", "system"], revision_requested: ["client"], disputed: ["client", "freelancer"] },
  revision_requested: { delivered: ["freelancer"], disputed: ["client", "freelancer"] },
  disputed: { completed: ["admin"], refunded: ["admin"], cancelled: ["admin"] },
  completed: {},
  cancelled: {},
  refunded: {},
};

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor): boolean {
  return T[from][to]?.includes(actor) ?? false;
}
export function assertTransition(from: OrderStatus, to: OrderStatus, actor: Actor): void {
  if (!canTransition(from, to, actor)) throw new Error(`Illegal transition ${from} -> ${to} by ${actor}`);
}
