"use client";

import Link from "next/link";
import { useSession } from "@/lib/demo/store";
import { balanceOf } from "@/lib/demo/actions";
import { money } from "@/lib/format";
import { Loading } from "@/components/guards";

export default function Overview() {
  const { db, user } = useSession();
  if (!db.ready || !user) return <Loading />;
  const orders = db.orders.filter((o) => o.clientId === user.id || o.freelancerId === user.id);
  const active = orders.filter((o) => ["pending_payment", "payment_confirmed", "in_progress", "delivered", "revision_requested", "disputed"].includes(o.status)).length;
  const myServices = db.services.filter((s) => s.sellerId === user.id).length;
  const myProjects = db.projects.filter((p) => p.ownerId === user.id).length;
  const unread = db.notifs.filter((n) => n.userId === user.id && !n.read).length;
  const bal = balanceOf(db, user.id);
  const stats: [string, string][] = [["Active orders", String(active)], ["Completed orders", String(orders.filter((o) => o.status === "completed").length)], ["My services", String(myServices)], ["My projects", String(myProjects)], ["Unread notifications", String(unread)], ["Available balance (USD)", money(bal.available, "USD")]];
  const profileDone = Boolean(user.headline && user.skills.length && user.country);
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Welcome, {user.name}</h1>
      <p className="mb-6 text-sm text-muted">Here is where things stand.</p>
      {!profileDone && <p className="card mb-6 p-4 text-sm">Complete your profile (headline, skills and country) to stand out. <Link className="text-accent hover:underline" href="/dashboard/settings">Open settings</Link></p>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stats.map(([k, v]) => <li key={k} className="card p-5"><p className="text-sm text-muted">{k}</p><p className="mt-2 text-2xl font-bold">{v}</p></li>)}</ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/explore" className="btn-primary">Explore services</Link>
        <Link href="/projects/new" className="btn-secondary">Start a project</Link>
        <Link href="/dashboard/services/new" className="btn-secondary">Create a service</Link>
        <Link href="/projects" className="btn-secondary">Browse projects</Link>
      </div>
    </>
  );
}
