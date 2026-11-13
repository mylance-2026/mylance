"use client";

import { UploadPicker } from "./upload-picker";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { CATEGORIES } from "@/lib/site";
import { saveService } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { minorUnitExponent, toMinorUnits } from "@/lib/domain/money";
import type { Package, Tier } from "@/lib/types";
import { Field } from "./ui";
import { Loading } from "./guards";
import { useResult } from "./toast";

const TIERS: Tier[] = ["basic", "standard", "premium"];
const CURRENCIES = ["USD", "INR", "EUR", "GBP"];

export function ServiceForm({ id }: { id?: string }) {
  const { db, user, ready } = useSession();
  const router = useRouter();
  const toast = useResult();
  if (!ready) return <Loading />;
  const existing = id ? db.services.find((s) => s.id === id && s.sellerId === user?.id) : undefined;
  if (id && !existing) return <p className="text-muted">Service not found.</p>;
  const cur = existing?.packages[0]?.currency ?? "USD";

  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publish = sub?.value === "publish";
    const f = new FormData(e.currentTarget);
    const currency = String(f.get("currency"));
    const packages: Package[] = [];
    try {
      for (const t of TIERS) {
        const price = String(f.get(`${t}-price`) ?? "").trim();
        if (!price) continue;
        packages.push({
          tier: t, currency, priceMinor: Number(toMinorUnits(price, currency)),
          deliveryDays: Number(f.get(`${t}-days`)) || 0, revisions: Number(f.get(`${t}-rev`)) || 0,
          description: String(f.get(`${t}-desc`) ?? ""),
          features: String(f.get(`${t}-feat`) ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
        });
      }
    } catch (err) {
      toast({ ok: false, error: err instanceof Error ? `Price: ${err.message}. Use up to ${minorUnitExponent(currency)} decimals.` : "Invalid price." });
      return;
    }
    const r = saveService({
      id, title: String(f.get("title")), description: String(f.get("desc")), categorySlug: String(f.get("cat") ?? ""),
      tags: String(f.get("tags") ?? "").split(",").map((x) => x.trim()).filter(Boolean), requirements: String(f.get("req") ?? ""), packages,
    }, publish);
    if (toast(r, publish ? "Service published." : "Draft saved.")) router.push("/dashboard/services");
  };

  return (
    <form onSubmit={handle} className="space-y-6">
      <h1 className="text-2xl font-bold">{id ? "Edit service" : "Create a service"}</h1>
      <section className="card space-y-4 p-6">
        <Field id="title" label="Title"><input id="title" name="title" defaultValue={existing?.title} className="input" minLength={5} maxLength={120} required /></Field>
        <Field id="cat" label="Category"><select id="cat" name="cat" defaultValue={existing?.categorySlug ?? ""} required className="input"><option value="" disabled>Select a category</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
        <Field id="desc" label="Description"><textarea id="desc" name="desc" rows={6} maxLength={8000} defaultValue={existing?.description} className="input" required /></Field>
        <Field id="tags" label="Skills / tags" hint="Comma separated."><input id="tags" name="tags" defaultValue={existing?.tags.join(", ")} className="input" /></Field>
        <Field id="req" label="Requirements from the client"><textarea id="req" name="req" rows={3} defaultValue={existing?.requirements} className="input" /></Field>
        <Field id="currency" label="Currency"><select id="currency" name="currency" defaultValue={cur} className="input">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        {TIERS.map((t) => {
          const p = existing?.packages.find((x) => x.tier === t);
          return (
            <fieldset key={t} className="card space-y-3 p-5">
              <legend className="px-1 font-semibold capitalize">{t}{t === "basic" ? "" : " (optional)"}</legend>
              <Field id={`${t}-price`} label="Price"><input id={`${t}-price`} name={`${t}-price`} inputMode="decimal" defaultValue={p ? (p.priceMinor / 10 ** minorUnitExponent(p.currency)).toFixed(minorUnitExponent(p.currency)) : ""} required={t === "basic"} className="input" /></Field>
              <Field id={`${t}-days`} label="Delivery (days)"><input id={`${t}-days`} name={`${t}-days`} type="number" min={1} max={365} defaultValue={p?.deliveryDays} className="input" /></Field>
              <Field id={`${t}-rev`} label="Revisions"><input id={`${t}-rev`} name={`${t}-rev`} type="number" min={0} defaultValue={p?.revisions ?? 1} className="input" /></Field>
              <Field id={`${t}-desc`} label="Summary"><textarea id={`${t}-desc`} name={`${t}-desc`} rows={2} defaultValue={p?.description} className="input" /></Field>
              <Field id={`${t}-feat`} label="Included features" hint="One per line."><textarea id={`${t}-feat`} name={`${t}-feat`} rows={3} defaultValue={p?.features.join("\n")} className="input" /></Field>
            </fieldset>
          );
        })}
      </div>
      <UploadPicker id="cover" label="Cover image" accept="image/png,image/jpeg,image/webp" hint="16:9 image, up to 5 MB." />
      <div className="flex flex-wrap gap-3">
        <button type="submit" value="draft" className="btn-secondary">Save draft</button>
        <button type="submit" value="publish" className="btn-primary">Publish</button>
      </div>
    </form>
  );
}
