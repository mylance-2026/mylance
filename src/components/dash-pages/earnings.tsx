"use client";

import { useState, type FormEvent } from "react";
import { Wallet } from "lucide-react";
import { balanceOf, requestPayout } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { toMinorUnits } from "@/lib/domain/money";
import { money } from "@/lib/format";
import { EmptyState, Field } from "@/components/ui";
import { Loading } from "@/components/guards";
import { StatusBadge } from "@/components/cards";
import { useResult } from "@/components/toast";

const CUR = "USD";

export default function Earnings() {
  const { db, user } = useSession();
  const toast = useResult();
  const [amt, setAmt] = useState("");
  if (!db.ready || !user) return <Loading />;
  const b = balanceOf(db, user.id, CUR);
  const payouts = db.payouts.filter((p) => p.userId === user.id).sort((a, c) => c.at.localeCompare(a.at));
  const cards: [string, number][] = [["Available balance", b.available], ["Pending clearance", b.pending], ["Requested", b.requested], ["Paid out", b.paidOut]];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    let minor = 0;
    try { minor = Number(toMinorUnits(amt, CUR)); } catch { toast({ ok: false, error: "Enter a valid amount." }); return; }
    if (toast(requestPayout(minor, CUR), "Payout requested.")) setAmt("");
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Earnings</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([k, v]) => <li key={k} className="card p-5"><p className="text-sm text-muted">{k}</p><p className="mt-2 text-2xl font-bold">{money(v, CUR)}</p></li>)}</ul>
      <p className="mt-3 text-xs text-muted">Shown in {CUR}. Balances reflect platform records for completed orders, not funds held in a regulated escrow account. Payouts are reviewed by the Mylance team.</p>
      <form onSubmit={submit} className="card mt-6 flex flex-wrap items-end gap-3 p-5">
        <Field id="amt" label={`Request payout (${CUR})`}><input id="amt" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} className="input" required /></Field>
        <button className="btn-primary" type="submit">Request payout</button>
      </form>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Payout requests</h2>
      {payouts.length === 0 ? <EmptyState icon={Wallet} title="No payouts yet" body="Payout requests and their status will be listed here." /> : (
        <ul className="space-y-3">{payouts.map((p) => <li key={p.id} className="card flex items-center justify-between p-4 text-sm"><span>{money(p.amountMinor, p.currency)} · {new Date(p.at).toLocaleDateString()}</span><StatusBadge status={p.status} /></li>)}</ul>
      )}
    </>
  );
}
