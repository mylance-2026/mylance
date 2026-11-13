"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { markAllNotifsRead, markNotifRead } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { EmptyState } from "@/components/ui";
import { Loading } from "@/components/guards";

export default function Notifications() {
  const { db, user } = useSession();
  if (!db.ready) return <Loading />;
  const rows = db.notifs.filter((n) => n.userId === user?.id).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {rows.some((n) => !n.read) && <button className="btn-secondary" onClick={() => markAllNotifsRead()}>Mark all read</button>}
      </div>
      {rows.length === 0 ? <EmptyState icon={Bell} title="You're all caught up" body="Updates about proposals, orders and messages will appear here." /> : (
        <ul className="space-y-3">
          {rows.map((n) => (
            <li key={n.id}>
              <Link href={n.href} onClick={() => markNotifRead(n.id)} className={`card flex items-center justify-between gap-3 p-4 ${n.read ? "" : "border-primary"}`}>
                <span className="text-sm">{n.text}</span>
                <span className="shrink-0 text-xs text-muted">{new Date(n.at).toLocaleString()}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
