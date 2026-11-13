"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useSession } from "@/lib/demo/store";
import { money } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { Loading } from "@/components/guards";
import { StatusBadge } from "@/components/cards";

const TABS: [string, (s: string) => boolean][] = [
  ["All", () => true],
  ["Active", (s) => ["pending_payment", "payment_confirmed", "in_progress", "revision_requested", "disputed"].includes(s)],
  ["Delivered", (s) => s === "delivered"],
  ["Completed", (s) => s === "completed"],
  ["Cancelled", (s) => ["cancelled", "refunded"].includes(s)],
];

export default function Orders() {
  const { db, user } = useSession();
  const [tab, setTab] = useState(0);
  const mine = db.orders.filter((o) => o.clientId === user?.id || o.freelancerId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rows = mine.filter((o) => TABS[tab][1](o.status));
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? "Unknown";
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Orders</h1>
      <div role="tablist" aria-label="Order filters" className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map(([t], i) => <button key={t} role="tab" aria-selected={i === tab} onClick={() => setTab(i)} className={`glossy-pill whitespace-nowrap px-4 py-1.5 text-sm ${i === tab ? "text-fg" : "text-muted"}`}>{t}</button>)}
      </div>
      {!db.ready ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders here" body="Orders you place or receive will be listed here with their status and deliveries." action={{ href: "/explore", label: "Find a service" }} />
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => (
            <li key={o.id}>
              <Link href={`/dashboard/orders/${o.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-5">
                <div><p className="font-semibold">{o.title}</p><p className="text-sm text-muted">{o.clientId === user?.id ? "Freelancer" : "Client"}: {name(o.clientId === user?.id ? o.freelancerId : o.clientId)}</p></div>
                <div className="flex items-center gap-4"><span className="text-sm">{money(o.baseMinor, o.currency)}</span><StatusBadge status={o.status} /></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
