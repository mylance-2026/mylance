import Link from "next/link";
import { Clock, Wallet } from "lucide-react";
import type { ProjectRec, ServiceRec, User } from "@/lib/demo/store";
import { label, money } from "@/lib/format";
import { FavButton } from "./fav-button";

export function ServiceCard({ s, seller }: { s: ServiceRec; seller?: User }) {
  const from = s.packages.reduce((m, p) => Math.min(m, p.priceMinor), Infinity);
  return (
    <div className="relative h-full">
      <Link href={`/services/${s.slug}`} className="card flex h-full flex-col p-5 transition-transform hover:-translate-y-0.5">
        <div className="mb-4 h-32 rounded-2xl bg-gradient-to-br from-primary/40 to-elevated" aria-hidden />
        <h3 className="font-semibold">{s.title}</h3>
        {seller && <p className="mt-1 text-sm text-muted">by {seller.name}</p>}
        <p className="mt-auto pt-4 text-sm"><span className="text-muted">Starting at</span> <strong>{money(from, s.packages[0].currency)}</strong></p>
      </Link>
      <FavButton serviceId={s.id} />
    </div>
  );
}

export function FreelancerCard({ f }: { f: User }) {
  return (
    <Link href={`/freelancers/${f.username}`} className="card flex h-full flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-accent to-primary-hover font-bold">{f.name[0]?.toUpperCase()}</span>
      <div><h3 className="font-semibold">{f.name}</h3><p className="text-sm text-muted">{f.headline || "No headline yet"}</p></div>
      <ul className="flex flex-wrap gap-2">{f.skills.slice(0, 6).map((k) => <li key={k} className="glossy-pill px-3 py-1 text-xs">{k}</li>)}</ul>
    </Link>
  );
}

export function ProjectCard({ p }: { p: ProjectRec }) {
  return (
    <Link href={`/projects/${p.id}`} className="card flex h-full flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5">
      <h3 className="font-semibold">{p.title}</h3>
      <p className="line-clamp-2 text-sm text-muted">{p.description}</p>
      <ul className="flex flex-wrap gap-2">{p.skills.map((k) => <li key={k} className="glossy-pill px-3 py-1 text-xs">{k}</li>)}</ul>
      <p className="mt-auto flex flex-wrap gap-4 pt-2 text-sm text-muted">
        <span className="inline-flex items-center gap-1"><Wallet size={14} aria-hidden />{money(p.minMinor, p.currency)} – {money(p.maxMinor, p.currency)} ({label(p.budgetType)})</span>
        {p.deadline && <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden />{p.deadline}</span>}
      </p>
    </Link>
  );
}

const TONE: Record<string, string> = {
  completed: "text-success", delivered: "text-accent", in_progress: "text-accent", payment_confirmed: "text-accent",
  published: "text-success", accepted: "text-success", paid: "text-success", resolved: "text-success",
  pending_payment: "text-warning", revision_requested: "text-warning", pending: "text-warning", submitted: "text-warning", open: "text-warning", shortlisted: "text-accent",
  disputed: "text-danger", rejected: "text-danger", cancelled: "text-muted", refunded: "text-muted", draft: "text-muted", withdrawn: "text-muted", paused: "text-muted", archived: "text-muted",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`glossy-pill inline-block px-3 py-1 text-xs font-medium ${TONE[status] ?? "text-fg"}`}>{label(status)}</span>;
}
