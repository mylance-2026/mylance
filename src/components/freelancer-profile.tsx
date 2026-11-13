"use client";

import { notFound, useRouter } from "next/navigation";
import { Globe, Languages, MapPin, Star } from "lucide-react";
import { isPublic, startConversation } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { ServiceCard } from "./cards";
import { Loading } from "./guards";
import { useResult } from "./toast";

export function FreelancerProfile({ username }: { username: string }) {
  const { db, user, ready } = useSession();
  const router = useRouter();
  const toast = useResult();
  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><Loading /></div>;
  const f = db.users.find((u) => u.username === username);
  if (!f || f.suspended) notFound();
  const services = db.services.filter((s) => s.sellerId === f.id && isPublic(s));
  const reviews = db.reviews.filter((r) => r.toId === f.id && db.orders.find((o) => o.id === r.orderId)?.freelancerId === f.id);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const completed = db.orders.filter((o) => o.freelancerId === f.id && o.status === "completed").length;

  const contact = () => {
    if (!user) return router.push(`/login?next=/freelancers/${f.username}`);
    const r = startConversation(f.id, "Profile enquiry");
    if (toast(r)) router.push(`/dashboard/messages?c=${(r as { data: string }).data}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <section className="card flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
        <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-gradient-to-b from-accent to-primary-hover text-3xl font-bold shadow-[inset_0_2px_0_rgba(255,255,255,0.5)]">{f.name[0]?.toUpperCase()}</span>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{f.name}</h1>
          <p className="mt-1 text-muted">{f.headline || "No headline yet"}</p>
          <p className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
            {f.country && <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden />{f.country}</span>}
            {f.languages.length > 0 && <span className="inline-flex items-center gap-1"><Languages size={14} aria-hidden />{f.languages.join(", ")}</span>}
            <span className="inline-flex items-center gap-1"><Globe size={14} aria-hidden />{f.level}</span>
            {reviews.length > 0 && <span className="inline-flex items-center gap-1"><Star size={14} className="text-warning" aria-hidden />{avg.toFixed(1)} ({reviews.length})</span>}
            {completed > 0 && <span>{completed} completed order{completed === 1 ? "" : "s"}</span>}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <span className={`glossy-pill px-3 py-1 text-xs ${f.available ? "text-success" : "text-muted"}`}>{f.available ? "Available for work" : "Unavailable"}</span>
          {user?.id !== f.id && <button className="btn-primary" onClick={contact}>Contact</button>}
        </div>
      </section>
      {(f.bio || f.skills.length > 0) && (
        <section className="card p-6">
          <h2 className="text-lg font-semibold">About</h2>
          {f.bio && <p className="mt-2 whitespace-pre-line text-muted">{f.bio}</p>}
          <ul className="mt-4 flex flex-wrap gap-2">{f.skills.map((k) => <li key={k} className="glossy-pill px-3 py-1 text-xs">{k}</li>)}</ul>
        </section>
      )}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Services</h2>
        {services.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{services.map((s) => <li key={s.id}><ServiceCard s={s} seller={f} /></li>)}</ul> : <p className="text-sm text-muted">No published services.</p>}
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Portfolio</h2>
        {(f.portfolio ?? []).length === 0 ? <p className="text-sm text-muted">No portfolio items yet.</p> : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(f.portfolio ?? []).map((p) => (
              <li key={p.id} className="card p-5">
                <h3 className="font-semibold">{p.title}</h3>
                {p.description && <p className="mt-2 text-sm text-muted">{p.description}</p>}
                {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="mt-3 inline-block break-all text-sm text-accent hover:underline">View work</a>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-xl font-semibold">Reviews</h2>
        {reviews.length === 0 ? <p className="text-sm text-muted">No verified reviews yet.</p> : (
          <ul className="space-y-3">{reviews.map((r) => <li key={r.id} className="card p-4"><p className="flex items-center gap-1 text-sm font-medium"><Star size={14} className="text-warning" aria-hidden />{r.rating}/5 <span className="text-muted">· {db.users.find((u) => u.id === r.fromId)?.name}</span></p>{r.text && <p className="mt-2 text-sm text-muted">{r.text}</p>}</li>)}</ul>
        )}
      </section>
    </div>
  );
}
