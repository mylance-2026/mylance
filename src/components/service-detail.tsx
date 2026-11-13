"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, Flag, MessageSquare, RefreshCw, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { reportService, startConversation, isPublic } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { money } from "@/lib/format";
import { Loading } from "./guards";
import { useResult } from "./toast";
import { CATEGORIES } from "@/lib/site";

export function ServiceDetail({ slug }: { slug: string }) {
  const { db, user, ready } = useSession();
  const router = useRouter();
  const toast = useResult();
  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><Loading /></div>;
  const s = db.services.find((x) => x.slug === slug);
  const seller = s && db.users.find((u) => u.id === s.sellerId);
  const canSee = s && (isPublic(s) || user?.id === s.sellerId || user?.isAdmin);
  if (!s || !seller || !canSee) notFound();

  const own = user?.id === s.sellerId;
  const orderIds = new Set(db.orders.filter((o) => o.serviceId === s.id).map((o) => o.id));
  const reviews = db.reviews.filter((r) => orderIds.has(r.orderId) && r.toId === s.sellerId);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const cat = CATEGORIES.find((c) => c.slug === s.categorySlug)?.name;

  const contact = () => {
    const r = startConversation(s.sellerId, s.title);
    if (toast(r)) router.push(`/dashboard/messages?c=${(r as { data: string }).data}`);
  };
  const report = () => {
    const reason = prompt("What is wrong with this service?");
    if (reason) toast(reportService(s.id, reason), "Report sent. Thank you.");
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <div>
        {!isPublic(s) && <p className="glossy-pill mb-4 inline-block px-4 py-1.5 text-xs text-warning">Not public: {s.status} / {s.moderation}</p>}
        <h1 className="text-3xl font-bold tracking-tight">{s.title}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>by <Link className="text-accent hover:underline" href={`/freelancers/${seller.username}`}>{seller.name}</Link></span>
          {cat && <span>· {cat}</span>}
          {reviews.length > 0 && <span className="inline-flex items-center gap-1"><Star size={14} className="text-warning" aria-hidden />{avg.toFixed(1)} ({reviews.length})</span>}
        </p>
        <div className="card mt-6 h-64 bg-gradient-to-br from-primary/40 to-elevated" aria-hidden />
        <h2 className="mt-8 text-xl font-semibold">About this service</h2>
        <p className="mt-3 whitespace-pre-line leading-7 text-muted">{s.description}</p>
        {s.requirements && (<><h2 className="mt-8 text-xl font-semibold">What the seller needs from you</h2><p className="mt-3 whitespace-pre-line text-muted">{s.requirements}</p></>)}
        {s.tags.length > 0 && <ul className="mt-6 flex flex-wrap gap-2">{s.tags.map((t) => <li key={t} className="glossy-pill px-3 py-1 text-xs">{t}</li>)}</ul>}
        <h2 className="mt-8 text-xl font-semibold">Reviews</h2>
        {reviews.length === 0 ? <p className="mt-3 text-sm text-muted">No reviews yet. Reviews appear only after completed orders.</p> : (
          <ul className="mt-3 space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="card p-4">
                <p className="flex items-center gap-1 text-sm font-medium"><Star size={14} className="text-warning" aria-hidden />{r.rating}/5 <span className="text-muted">· {db.users.find((u) => u.id === r.fromId)?.name}</span></p>
                {r.text && <p className="mt-2 text-sm text-muted">{r.text}</p>}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          {!own && <button className="btn-secondary" onClick={user ? contact : () => router.push(`/login?next=/services/${s.slug}`)}><MessageSquare size={16} aria-hidden /> Contact seller</button>}
          {!own && user && <button className="btn-secondary" onClick={report}><Flag size={16} aria-hidden /> Report</button>}
          {own && <Link href="/dashboard/services" className="btn-secondary">Manage my services</Link>}
        </div>
      </div>
      <aside aria-label="Packages" className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
        {s.packages.map((p) => (
          <section key={p.tier} className="card p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold capitalize">{p.tier}</h3>
              <span className="text-xl font-bold">{money(p.priceMinor, p.currency)}</span>
            </div>
            {p.description && <p className="mt-2 text-sm text-muted">{p.description}</p>}
            <p className="mt-3 flex gap-4 text-sm">
              <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden />{p.deliveryDays} days</span>
              <span className="inline-flex items-center gap-1"><RefreshCw size={14} aria-hidden />{p.revisions} revisions</span>
            </p>
            {p.features.length > 0 && <ul className="mt-3 space-y-1 text-sm text-muted">{p.features.map((f) => <li key={f} className="flex gap-2"><Check size={14} className="mt-1 shrink-0 text-success" aria-hidden />{f}</li>)}</ul>}
            {own ? <p className="mt-4 text-xs text-muted">You cannot buy your own service.</p> : isPublic(s) ? <Link href={`/services/${s.slug}/checkout?tier=${p.tier}`} className="btn-primary mt-4 w-full">Continue</Link> : null}
          </section>
        ))}
      </aside>
    </div>
  );
}
