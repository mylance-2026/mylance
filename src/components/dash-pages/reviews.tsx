"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useSession } from "@/lib/demo/store";
import { EmptyState } from "@/components/ui";
import { Loading } from "@/components/guards";

export default function Reviews() {
  const { db, user } = useSession();
  if (!db.ready) return <Loading />;
  const received = db.reviews.filter((r) => r.toId === user?.id);
  const toLeave = db.orders.filter((o) => o.status === "completed" && (o.clientId === user?.id || o.freelancerId === user?.id) && !db.reviews.some((r) => r.orderId === o.id && r.fromId === user?.id));
  const avg = received.length ? received.reduce((a, r) => a + r.rating, 0) / received.length : 0;
  const name = (id: string) => db.users.find((u) => u.id === id)?.name;
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Reviews</h1>
      {toLeave.length > 0 && (
        <section className="mb-8"><h2 className="mb-3 font-semibold">Waiting for your review</h2>
          <ul className="space-y-3">{toLeave.map((o) => <li key={o.id}><Link href={`/dashboard/orders/${o.id}`} className="card flex items-center justify-between p-4 text-sm"><span>{o.title}</span><span className="text-accent">Leave a review</span></Link></li>)}</ul>
        </section>
      )}
      <h2 className="mb-3 font-semibold">Received {received.length > 0 && <span className="text-sm font-normal text-muted">· {avg.toFixed(1)} average</span>}</h2>
      {received.length === 0 ? <EmptyState icon={Star} title="No reviews yet" body="You can review the other party once an order is completed." /> : (
        <ul className="space-y-3">{received.map((r) => <li key={r.id} className="card p-4"><p className="flex items-center gap-1 text-sm font-medium"><Star size={14} className="text-warning" aria-hidden />{r.rating}/5 <span className="text-muted">· {name(r.fromId)}</span></p>{r.text && <p className="mt-2 text-sm text-muted">{r.text}</p>}</li>)}</ul>
      )}
    </>
  );
}
