"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { setServiceStatus } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { EmptyState } from "@/components/ui";
import { Loading } from "@/components/guards";
import { StatusBadge } from "@/components/cards";
import { useResult } from "@/components/toast";

export default function Services() {
  const { db, user } = useSession();
  const toast = useResult();
  const rows = db.services.filter((s) => s.sellerId === user?.id);
  return (
    <>
      <div className="mb-6 flex items-center justify-between"><h1 className="text-2xl font-bold">My services</h1><Link href="/dashboard/services/new" className="btn-primary">New service</Link></div>
      {!db.ready ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon={Package} title="No services yet" body="Create a service with Basic, Standard and Premium packages." action={{ href: "/dashboard/services/new", label: "Create a service" }} />
      ) : (
        <ul className="space-y-3">
          {rows.map((s) => (
            <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <div><p className="font-semibold">{s.title}</p><p className="mt-1 flex gap-2"><StatusBadge status={s.status} />{s.status === "published" && s.moderation !== "approved" && <StatusBadge status={s.moderation} />}</p></div>
              <div className="flex flex-wrap gap-2">
                <Link className="btn-secondary" href={`/services/${s.slug}`}>View</Link>
                <Link className="btn-secondary" href={`/dashboard/services/${s.id}/edit`}>Edit</Link>
                {s.status === "published" ? <button className="btn-secondary" onClick={() => toast(setServiceStatus(s.id, "paused"), "Service paused.")}>Pause</button>
                  : s.status !== "archived" && s.status !== "rejected" ? <button className="btn-secondary" onClick={() => toast(setServiceStatus(s.id, "published"), "Service published.")}>Publish</button> : null}
                {s.status !== "archived" && <button className="btn-secondary" onClick={() => confirm("Archive this service?") && toast(setServiceStatus(s.id, "archived"), "Service archived.")}>Archive</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
