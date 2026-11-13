"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { useSession } from "@/lib/demo/store";
import { money } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { Loading } from "@/components/guards";
import { StatusBadge } from "@/components/cards";

export default function MyProjects() {
  const { db, user } = useSession();
  const mine = db.projects.filter((p) => p.ownerId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const bids = db.proposals.filter((p) => p.freelancerId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!db.ready) return <Loading />;
  return (
    <>
      <div className="mb-6 flex items-center justify-between"><h1 className="text-2xl font-bold">Projects</h1><Link href="/projects/new" className="btn-primary">New project</Link></div>
      <h2 className="mb-3 font-semibold">Projects I posted</h2>
      {mine.length === 0 ? <EmptyState icon={FolderKanban} title="No projects yet" body="Projects you publish, and the proposals you receive, appear here." action={{ href: "/projects/new", label: "Start a project" }} /> : (
        <ul className="space-y-3">
          {mine.map((p) => {
            const n = db.proposals.filter((x) => x.projectId === p.id).length;
            return <li key={p.id}><Link href={`/dashboard/projects/${p.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-semibold">{p.title}</p><p className="text-sm text-muted">{n} proposal{n === 1 ? "" : "s"}</p></div><StatusBadge status={p.status} /></Link></li>;
          })}
        </ul>
      )}
      <h2 className="mb-3 mt-8 font-semibold">My proposals</h2>
      {bids.length === 0 ? <p className="text-sm text-muted">You have not submitted any proposals. <Link className="text-accent hover:underline" href="/projects">Browse projects</Link></p> : (
        <ul className="space-y-3">
          {bids.map((b) => {
            const p = db.projects.find((x) => x.id === b.projectId);
            return <li key={b.id}><Link href={`/projects/${b.projectId}`} className="card flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-semibold">{p?.title ?? "Project"}</p><p className="text-sm text-muted">{money(b.priceMinor, b.currency)} · {b.days} days</p></div><StatusBadge status={b.status} /></Link></li>;
          })}
        </ul>
      )}
    </>
  );
}
