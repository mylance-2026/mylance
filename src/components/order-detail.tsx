"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useState } from "react";
import { Star } from "lucide-react";
import {
  approveOrder, cancelOrder, deliverOrder, openDispute, payOrderLocal, requestCancellation, requestRevision, startConversation, startOrder, submitReview,
} from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { label, money } from "@/lib/format";
import { Field } from "./ui";
import { Loading } from "./guards";
import { StatusBadge } from "./cards";
import { useResult } from "./toast";

export function OrderDetail({ id }: { id: string }) {
  const { db, user, ready } = useSession();
  const router = useRouter();
  const toast = useResult();
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  if (!ready) return <Loading />;
  const o = db.orders.find((x) => x.id === id);
  if (!o || !user || (o.clientId !== user.id && o.freelancerId !== user.id && !user.isAdmin)) notFound();

  const isClient = o.clientId === user.id;
  const isFreelancer = o.freelancerId === user.id;
  const cur = o.currency;
  const other = db.users.find((u) => u.id === (isClient ? o.freelancerId : o.clientId));
  const myReview = db.reviews.find((r) => r.orderId === o.id && r.fromId === user.id);
  const reviews = db.reviews.filter((r) => r.orderId === o.id);
  const total = o.baseMinor + o.clientFeeMinor;
  const s = o.status;
  const act = (r: ReturnType<typeof approveOrder>, ok: string) => toast(r, ok);

  const message = () => {
    if (!other) return;
    const r = startConversation(other.id, o.title);
    if (toast(r)) router.push(`/dashboard/messages?c=${(r as { data: string }).data}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{o.title}</h1><StatusBadge status={s} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-semibold">Requirements</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{o.requirements}</p>
          </section>

          <section className="card space-y-4 p-6">
            <h2 className="font-semibold">Actions</h2>
            {s === "pending_payment" && isClient && (
              <div className="space-y-2">
                <p className="text-sm text-muted">Pay {money(total, cur)} to start the order. Real payments are not connected, so this confirms a local test payment only.</p>
                <button className="btn-primary" onClick={() => act(payOrderLocal(o.id), "Test payment confirmed.")}>Pay (local test)</button>
              </div>
            )}
            {s === "pending_payment" && isFreelancer && <p className="text-sm text-muted">Waiting for the client to pay.</p>}
            {s === "payment_confirmed" && isFreelancer && <button className="btn-primary" onClick={() => act(startOrder(o.id), "Work started.")}>Start work</button>}
            {s === "payment_confirmed" && !isFreelancer && <p className="text-sm text-muted">Payment confirmed. Waiting for the freelancer to start.</p>}
            {(s === "in_progress" || s === "revision_requested") && isFreelancer && (
              <div className="space-y-3">
                <Field id="notes" label="Delivery notes" hint="Private file upload will be available once storage is connected."><textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" /></Field>
                <button className="btn-primary" onClick={() => { if (act(deliverOrder(o.id, notes), "Delivery submitted.")) setNotes(""); }}>Submit delivery</button>
              </div>
            )}
            {(s === "in_progress" || s === "revision_requested") && !isFreelancer && <p className="text-sm text-muted">The freelancer is working on this order.</p>}
            {s === "delivered" && isClient && (
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" onClick={() => act(approveOrder(o.id), "Order completed.")}>Approve delivery</button>
                <button className="btn-secondary" onClick={() => { const n = prompt(`Revision notes (${o.revisionsAllowed - o.revisionsUsed} left)`); if (n !== null) act(requestRevision(o.id, n), "Revision requested."); }}>Request revision</button>
              </div>
            )}
            {s === "delivered" && !isClient && <p className="text-sm text-muted">Waiting for the client to review the delivery.</p>}
            <div className="flex flex-wrap gap-3">
              {s === "pending_payment" && (isClient || user.isAdmin) && <button className="btn-secondary" onClick={() => confirm("Cancel this order?") && act(cancelOrder(o.id), "Order cancelled.")}>Cancel order</button>}
              {["in_progress", "delivered", "revision_requested"].includes(s) && (isClient || isFreelancer) && (
                <button className="btn-secondary" onClick={() => { const r = prompt("Why are you opening a dispute?"); if (r !== null) act(openDispute(o.id, r), "Dispute opened. The Mylance team will review it."); }}>Open dispute</button>
              )}
              {["payment_confirmed", "in_progress", "delivered", "revision_requested"].includes(s) && (isClient || isFreelancer) && (
                <button className="btn-secondary" onClick={() => { const r = prompt("Why do you want to cancel? The other party will be notified."); if (r !== null) act(requestCancellation(o.id, r), "Cancellation request sent."); }}>Request cancellation</button>
              )}
              {other && <button className="btn-secondary" onClick={message}>Message {other.name}</button>}
            </div>
            {s === "disputed" && <p className="text-sm text-warning">This order is in dispute. An administrator will review it.</p>}
          </section>

          {o.deliveries.length > 0 && (
            <section className="card p-6">
              <h2 className="font-semibold">Deliveries</h2>
              <ul className="mt-3 space-y-3">{o.deliveries.map((d, i) => <li key={d.id} className="rounded-2xl border border-line p-4 text-sm"><p className="text-xs text-muted">Delivery {i + 1} · {new Date(d.at).toLocaleString()}</p><p className="mt-1 whitespace-pre-line">{d.notes}</p></li>)}</ul>
            </section>
          )}

          {s === "completed" && (isClient || isFreelancer) && (
            <section className="card space-y-3 p-6">
              <h2 className="font-semibold">Review</h2>
              {myReview ? <p className="text-sm text-muted">You rated this order {myReview.rating}/5.</p> : (
                <>
                  <fieldset><legend className="label">Rating</legend>
                    <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating >= n} onClick={() => setRating(n)}><Star size={26} className={rating >= n ? "fill-warning text-warning" : "text-muted"} /></button>)}</div>
                  </fieldset>
                  <Field id="rv" label="Feedback"><textarea id="rv" rows={3} value={text} onChange={(e) => setText(e.target.value)} className="input" /></Field>
                  <button className="btn-primary" onClick={() => act(submitReview(o.id, rating, text), "Review submitted.")}>Submit review</button>
                </>
              )}
              {reviews.filter((r) => r.fromId !== user.id).map((r) => <p key={r.id} className="text-sm text-muted">{db.users.find((u) => u.id === r.fromId)?.name} rated you {r.rating}/5{r.text ? `: ${r.text}` : ""}</p>)}
            </section>
          )}

          <section className="card p-6">
            <h2 className="font-semibold">Activity</h2>
            <ol className="mt-4 space-y-4 border-l border-line pl-5">
              {o.events.map((e, i) => (
                <li key={i} className="relative"><span aria-hidden className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" /><p className="text-sm">{e.text}</p><p className="text-xs text-muted">{new Date(e.at).toLocaleString()}</p></li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="card h-fit p-6">
          <h2 className="font-semibold">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{isClient ? "Freelancer" : "Client"}</dt><dd>{other?.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Status</dt><dd>{label(s)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Deadline</dt><dd>{o.deadline}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Revisions</dt><dd>{o.revisionsUsed}/{o.revisionsAllowed}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Price</dt><dd>{money(o.baseMinor, cur)}</dd></div>
            {!isFreelancer && <div className="flex justify-between"><dt className="text-muted">Client fee ({o.clientFeeBps / 100}%)</dt><dd>{money(o.clientFeeMinor, cur)}</dd></div>}
            {!isFreelancer && <div className="flex justify-between border-t border-line pt-2 font-bold"><dt>Client total</dt><dd>{money(total, cur)}</dd></div>}
            {!isClient && <div className="flex justify-between"><dt className="text-muted">Your fee ({o.freelancerFeeBps / 100}%)</dt><dd>−{money(o.freelancerFeeMinor, cur)}</dd></div>}
            {!isClient && <div className="flex justify-between border-t border-line pt-2 font-bold"><dt>You receive</dt><dd>{money(o.baseMinor - o.freelancerFeeMinor, cur)}</dd></div>}
          </dl>
          <Link href="/dashboard/orders" className="mt-4 block text-sm text-accent hover:underline">Back to orders</Link>
        </aside>
      </div>
    </div>
  );
}
