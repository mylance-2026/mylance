"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderSearch } from "lucide-react";
import { CATEGORIES } from "@/lib/site";
import { useDb } from "@/lib/demo/store";
import { EmptyState, PageHeader } from "@/components/ui";
import { ProjectCard } from "@/components/cards";
import { Loading } from "@/components/guards";
import { Pager, pageCount, paginate, usePage } from "@/components/pager";

export default function Projects() {
  const db = useDb();
  const [q, setQ] = useState("");
  const [qd, setQd] = useState("");
  const [cat, setCat] = useState("");
  const [page, setPage] = usePage(`${qd}|${cat}`);
  useEffect(() => { const t = setTimeout(() => setQd(q), 250); return () => clearTimeout(t); }, [q]);
  const rows = useMemo(() => {
    const k = qd.trim().toLowerCase();
    return db.projects
      .filter((p) => p.status === "published" && (cat ? p.categorySlug === cat : true) && (!k || [p.title, p.description, ...p.skills].join(" ").toLowerCase().includes(k)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  }, [db, qd, cat]);
  return (
    <>
      <PageHeader title="Browse projects" subtitle="Open briefs from clients. Submit a proposal to get hired." />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-6 grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="sr-only" htmlFor="pq">Search projects</label>
          <input id="pq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects or skills" className="input" />
          <label className="sr-only" htmlFor="pc">Category</label>
          <select id="pc" value={cat} onChange={(e) => setCat(e.target.value)} className="input"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        </form>
        {!db.ready ? <Loading /> : rows.length === 0 ? (
          <EmptyState icon={FolderSearch} title="No open projects" body="Public projects posted by clients appear here for freelancers to bid on." action={{ href: "/projects/new", label: "Post a project" }} />
        ) : (
          <>
            <ul className="grid gap-4 md:grid-cols-2">{paginate(rows, page).map((p) => <li key={p.id}><ProjectCard p={p} /></li>)}</ul>
            <Pager page={page} pages={pageCount(rows.length)} onPage={setPage} />
          </>
        )}
      </div>
    </>
  );
}
