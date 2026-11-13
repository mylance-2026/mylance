"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { isPublic, placeServiceOrder } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { calculateFees } from "@/lib/domain/fees";
import { money } from "@/lib/format";
import { useQueryParam } from "@/lib/use-query";
import { Field } from "./ui";
import { Loading } from "./guards";
import { useResult } from "./toast";

export function CheckoutForm({ slug }: { slug: string }) {
  const { db, user, ready } = useSession();
  const router = useRouter();
  const toast = useResult();
  const urlTier = useQueryParam("tier");
  const [tierSel, setTier] = useState<string | null>(null);
  const tier = tierSel ?? urlTier;
  if (!ready) return <div className="mx-auto max-w-5xl px-4 py-10"><Loading /></div>;
  const s = db.services.find((x) => x.slug === slug);
  if (!s || !isPublic(s)) notFound();
  const p = s.packages.find((x) => x.tier === tier) ?? s.packages[0];
  const f = calculateFees(BigInt(p.priceMinor), p.currency, { clientFeeBps: db.settings.clientFeeBps, freelancerFeeBps: db.settings.freelancerFeeBps });
  const m = (n: bigint) => money(Number(n), p.currency);
  const pct = (bps: number) => `${bps / 100}%`;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const r = placeServiceOrder(s.id, p.tier, String(new FormData(e.currentTarget).get("req")));
    if (toast(r, "Order created. Complete payment to start.")) router.push(`/dashboard/orders/${(r as { data: string }).data}`);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
      {user ? (
        <form onSubmit={submit} className="card space-y-5 p-6">
          <h1 className="text-2xl font-bold">Order requirements</h1>
          <fieldset>
            <legend className="label">Package</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {s.packages.map((x) => (
                <label key={x.tier} className="card flex cursor-pointer flex-col gap-1 p-3 text-sm has-[:checked]:border-primary">
                  <span className="flex items-center gap-2"><input type="radio" name="tier" checked={p.tier === x.tier} onChange={() => setTier(x.tier)} /> <span className="font-medium capitalize">{x.tier}</span></span>
                  <span className="text-muted">{money(x.priceMinor, x.currency)} · {x.deliveryDays}d</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field id="req" label="Describe what you need" hint={s.requirements ? `Seller asks: ${s.requirements}` : undefined}><textarea id="req" name="req" rows={6} minLength={10} required className="input" /></Field>
          <button type="submit" className="btn-primary" disabled={user.id === s.sellerId}>Place order</button>
          {user.id === s.sellerId && <p className="text-xs text-danger">You cannot buy your own service.</p>}
          <p className="text-xs text-muted">You pay after the order is created. Nothing is charged by placing it.</p>
        </form>
      ) : (
        <div className="card space-y-4 p-6">
          <h1 className="text-2xl font-bold">Log in to continue</h1>
          <p className="text-sm text-muted">You need an account to place an order.</p>
          <div className="flex gap-3"><Link className="btn-primary" href={`/login?next=${encodeURIComponent(`/services/${slug}/checkout?tier=${p.tier}`)}`}>Log in</Link><Link className="btn-secondary" href="/signup">Sign up</Link></div>
        </div>
      )}
      <aside className="card h-fit p-6">
        <h2 className="font-semibold">{s.title}</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Package</dt><dd className="capitalize">{p.tier}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{p.deliveryDays} days</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Price</dt><dd>{m(f.baseAmount)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Service fee ({pct(f.clientFeeBps)})</dt><dd>{m(f.clientFee)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{m(f.clientTotal)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
