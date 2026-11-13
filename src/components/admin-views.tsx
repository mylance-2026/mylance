"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { moderateService, resolveDispute, resolveReport, reviewPayout, setSuspended, updateSettings } from "@/lib/demo/actions";
import { useSession, type Db } from "@/lib/demo/store";
import { label, money } from "@/lib/format";
import { FINANCE, METRICS } from "@/lib/admin";
import { Field } from "./ui";
import { StatusBadge } from "./cards";
import { useResult } from "./toast";

function Table({ title, columns, rows, empty }: { title: string; columns: string[]; rows: ReactNode[][]; empty: string }) {
  const [q, setQ] = useState("");
  const shown = q ? rows.filter((r) => r.map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : "")).join(" ").toLowerCase().includes(q.toLowerCase())) : rows;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div><label htmlFor="s" className="sr-only">Search {title}</label><input id="s" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="input" /></div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead><tr className="border-b border-line text-muted">{columns.map((c) => <th key={c} scope="col" className="whitespace-nowrap px-5 py-3 font-medium">{c}</th>)}</tr></thead>
          <tbody>
            {shown.length === 0 ? <tr><td colSpan={columns.length} className="px-5 py-10 text-center text-muted">{empty}</td></tr>
              : shown.map((r, i) => <tr key={i} className="border-b border-line last:border-0">{r.map((c, j) => <td key={j} className="px-5 py-3 align-middle">{c}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
}

const d = (s: string) => new Date(s).toLocaleDateString();
const name = (db: Db, id: string) => db.users.find((u) => u.id === id)?.name ?? "—";

export function AdminView({ slug }: { slug: string }) {
  const { db, user } = useSession();
  const toast = useResult();
  const [cf, setCf] = useState<string | null>(null);
  const [ff, setFf] = useState<string | null>(null);
  const [mod, setMod] = useState<boolean | null>(null);
  if (!db.ready) return null;
  const btn = (text: string, fn: () => void, danger?: boolean) => <button className={`btn-secondary px-3 py-1.5 ${danger ? "text-danger" : ""}`} onClick={fn}>{text}</button>;

  if (slug === "") {
    const completed = db.orders.filter((o) => o.status === "completed");
    const paid = db.payments.filter((p) => p.status === "succeeded");
    const vol = paid.reduce((a, p) => a + p.amountMinor, 0);
    const fees = completed.reduce((a, o) => a + o.clientFeeMinor + o.freelancerFeeMinor, 0);
    const refunds = db.payments.filter((p) => p.status === "refunded").reduce((a, p) => a + p.amountMinor, 0);
    const values: Record<string, string> = {
      "Registered users": String(db.users.length),
      "Active freelancers": String(db.users.filter((u) => u.isFreelancer && !u.suspended).length),
      "Published services": String(db.services.filter((s) => s.status === "published" && s.moderation === "approved").length),
      "Published projects": String(db.projects.filter((p) => p.status === "published").length),
      "Completed orders": String(completed.length),
      "Open disputes": String(db.disputes.filter((x) => x.status === "open").length),
      "Pending payout requests": String(db.payouts.filter((p) => p.status === "pending").length),
      "Gross transaction volume": money(vol, "USD"),
      "Platform fee revenue": money(fees, "USD"),
      Refunds: money(refunds, "USD"),
    };
    const byStatus = db.orders.reduce<Record<string, number>>((a, o) => ({ ...a, [o.status]: (a[o.status] ?? 0) + 1 }), {});
    return (
      <>
        <h1 className="mb-6 text-2xl font-bold">Overview</h1>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{METRICS.map((m) => <li key={m} className="card p-5"><p className="text-sm text-muted">{m}</p><p className="mt-2 text-2xl font-bold">{values[m]}</p></li>)}</ul>
        <h2 className="mb-3 mt-8 text-lg font-semibold">Finance (USD)</h2>
        <p className="mb-3 text-sm text-muted">Transaction volume is the total paid by clients. Platform revenue is only the fees on completed orders. They are reported separately.</p>
        <ul className="grid gap-4 sm:grid-cols-3">{FINANCE.map((m) => <li key={m} className="card p-5"><p className="text-sm text-muted">{m}</p><p className="mt-2 text-2xl font-bold">{values[m]}</p></li>)}</ul>
        <h2 className="mb-3 mt-8 text-lg font-semibold">Orders by status</h2>
        {Object.keys(byStatus).length === 0 ? <p className="text-sm text-muted">No orders yet.</p> : <ul className="flex flex-wrap gap-3">{Object.entries(byStatus).map(([k, v]) => <li key={k} className="glossy-pill px-4 py-1.5 text-sm">{label(k)}: {v}</li>)}</ul>}
      </>
    );
  }

  switch (slug) {
    case "users":
      return <Table title="Users" empty="No users yet." columns={["Name", "Username", "Roles", "Status", "Joined", ""]} rows={db.users.map((u) => [
        u.name, `@${u.username}`, [u.isClient && "client", u.isFreelancer && "freelancer", u.isAdmin && "admin"].filter(Boolean).join(", "),
        <StatusBadge key="s" status={u.suspended ? "rejected" : "published"} />, d(u.createdAt),
        u.id === user?.id ? "" : u.suspended ? btn("Restore", () => toast(setSuspended(u.id, false), "Account restored.")) : btn("Suspend", () => confirm(`Suspend ${u.name}?`) && toast(setSuspended(u.id, true), "Account suspended."), true),
      ])} />;
    case "services":
      return <Table title="Services" empty="No services to moderate." columns={["Title", "Seller", "Status", "Moderation", "Created", ""]} rows={db.services.map((s) => [
        <Link key="l" className="text-accent hover:underline" href={`/services/${s.slug}`}>{s.title}</Link>, name(db, s.sellerId), <StatusBadge key="a" status={s.status} />, <StatusBadge key="b" status={s.moderation} />, d(s.createdAt),
        <span key="x" className="flex gap-2">{s.moderation !== "approved" && btn("Approve", () => toast(moderateService(s.id, true), "Service approved."))}{s.moderation !== "rejected" && btn("Reject", () => toast(moderateService(s.id, false), "Service rejected."), true)}</span>,
      ])} />;
    case "projects":
      return <Table title="Projects" empty="No projects yet." columns={["Title", "Owner", "Status", "Budget", "Created"]} rows={db.projects.map((p) => [<Link key="l" className="text-accent hover:underline" href={`/projects/${p.id}`}>{p.title}</Link>, name(db, p.ownerId), <StatusBadge key="s" status={p.status} />, `${money(p.minMinor, p.currency)} – ${money(p.maxMinor, p.currency)}`, d(p.createdAt)])} />;
    case "orders":
      return <Table title="Orders" empty="No orders yet." columns={["Order", "Client", "Freelancer", "Status", "Amount"]} rows={db.orders.map((o) => [<Link key="l" className="text-accent hover:underline" href={`/dashboard/orders/${o.id}`}>{o.title}</Link>, name(db, o.clientId), name(db, o.freelancerId), <StatusBadge key="s" status={o.status} />, money(o.baseMinor, o.currency)])} />;
    case "payments":
      return <Table title="Payments" empty="No payments recorded." columns={["Reference", "Order", "Status", "Amount", "Date"]} rows={db.payments.map((p) => [p.ref, db.orders.find((o) => o.id === p.orderId)?.title ?? "—", <StatusBadge key="s" status={p.status} />, money(p.amountMinor, p.currency), d(p.at)])} />;
    case "payouts":
      return <Table title="Payouts" empty="No payout requests." columns={["Freelancer", "Amount", "Status", "Requested", ""]} rows={db.payouts.map((p) => [name(db, p.userId), money(p.amountMinor, p.currency), <StatusBadge key="s" status={p.status} />, d(p.at),
        p.status === "pending" ? <span key="x" className="flex gap-2">{btn("Approve", () => toast(reviewPayout(p.id, true), "Payout approved (no money moves in preview)."))}{btn("Reject", () => toast(reviewPayout(p.id, false), "Payout rejected."), true)}</span> : ""])} />;
    case "disputes":
      return <Table title="Disputes" empty="No disputes." columns={["Order", "Opened by", "Reason", "Status", "Resolve"]} rows={db.disputes.map((x) => [
        <Link key="l" className="text-accent hover:underline" href={`/dashboard/orders/${x.orderId}`}>{db.orders.find((o) => o.id === x.orderId)?.title ?? "Order"}</Link>, name(db, x.openedBy), <span key="r" className="line-clamp-2 max-w-xs">{x.reason}</span>, <StatusBadge key="s" status={x.status} />,
        x.status === "open" ? <span key="x" className="flex flex-wrap gap-2">{btn("Complete", () => toast(resolveDispute(x.id, "completed"), "Order completed."))}{btn("Refund", () => toast(resolveDispute(x.id, "refunded"), "Order refunded."))}{btn("Cancel", () => toast(resolveDispute(x.id, "cancelled"), "Order cancelled."), true)}</span> : label(x.resolution),
      ])} />;
    case "reports":
      return <Table title="Reports" empty="No reports." columns={["Service", "Reporter", "Reason", "Status", ""]} rows={db.reports.map((r) => [db.services.find((s) => s.id === r.serviceId)?.title ?? "—", name(db, r.reporterId), r.reason, <StatusBadge key="s" status={r.status} />, r.status === "open" ? btn("Resolve", () => toast(resolveReport(r.id), "Report resolved.")) : ""])} />;
    case "audit-logs":
      return <Table title="Audit logs" empty="No audit entries." columns={["Time", "Actor", "Action", "Entity"]} rows={db.audit.map((a) => [new Date(a.at).toLocaleString(), name(db, a.actor), a.action, a.entity])} />;
    case "settings":
      return (
        <form className="space-y-6" onSubmit={(e) => {
          e.preventDefault();
          const c = Math.round(Number(cf ?? db.settings.clientFeeBps / 100) * 100), f = Math.round(Number(ff ?? db.settings.freelancerFeeBps / 100) * 100);
          toast(updateSettings(c, f, mod ?? db.settings.requireModeration), "Settings saved and logged.");
        }}>
          <h1 className="text-2xl font-bold">Settings</h1>
          <section className="card space-y-4 p-6">
            <h2 className="font-semibold">Platform fees</h2>
            <p className="text-sm text-muted">Rates are in percent. Existing orders keep the rates frozen when they were created.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="cf" label="Client fee (%)"><input id="cf" type="number" step="0.01" min={0} max={100} value={cf ?? db.settings.clientFeeBps / 100} onChange={(e) => setCf(e.target.value)} className="input" /></Field>
              <Field id="ff" label="Freelancer fee (%)"><input id="ff" type="number" step="0.01" min={0} max={100} value={ff ?? db.settings.freelancerFeeBps / 100} onChange={(e) => setFf(e.target.value)} className="input" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mod ?? db.settings.requireModeration} onChange={(e) => setMod(e.target.checked)} /> Require admin approval before services go public</label>
          </section>
          <button type="submit" className="btn-primary">Save settings</button>
          {db.contacts.length > 0 && (
            <section className="card p-6"><h2 className="mb-3 font-semibold">Contact messages</h2>
              <ul className="space-y-3 text-sm">{db.contacts.map((c) => <li key={c.id}><p className="font-medium">{c.name} · {c.email}</p><p className="text-muted">{c.message}</p></li>)}</ul></section>
          )}
        </form>
      );
    default:
      return null;
  }
}

