"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { useDb } from "@/lib/demo/store";
import { EmptyState, PageHeader } from "@/components/ui";
import { FreelancerCard } from "@/components/cards";
import { Loading } from "@/components/guards";
import { Pager, pageCount, paginate, usePage } from "@/components/pager";

export default function Freelancers() {
  const db = useDb();
  const [q, setQ] = useState("");
  const [qd, setQd] = useState("");
  const [page, setPage] = usePage(qd);
  useEffect(() => { const t = setTimeout(() => setQd(q), 250); return () => clearTimeout(t); }, [q]);
  const rows = useMemo(() => {
    const k = qd.trim().toLowerCase();
    return db.users
      .filter((u) => u.isFreelancer && !u.suspended && u.headline && (!k || [u.name, u.headline, ...u.skills].join(" ").toLowerCase().includes(k)))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }, [db, qd]);
  return (
    <>
      <PageHeader title="Find freelancers" subtitle="Browse profiles by skill and experience. Profiles with a headline are listed." />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-6"><label className="sr-only" htmlFor="fq">Search freelancers</label><input id="fq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, headline or skill" className="input" /></form>
        {!db.ready ? <Loading /> : rows.length === 0 ? (
          <EmptyState icon={Users} title="No freelancers found" body="Freelancer profiles appear here once people join and add a headline." action={{ href: "/signup?role=freelancer", label: "Join as a freelancer" }} />
        ) : (
          <><ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{paginate(rows, page).map((f) => <li key={f.id}><FreelancerCard f={f} /></li>)}</ul><Pager page={page} pages={pageCount(rows.length)} onPage={setPage} /></>
        )}
      </div>
    </>
  );
}
