"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CATEGORIES } from "@/lib/site";
import { saveProject, submitProposal, setProposalStatus } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { minorUnitExponent, toMinorUnits } from "@/lib/domain/money";
import { label, money } from "@/lib/format";
import { Field } from "./ui";
import { Loading } from "./guards";
import { StatusBadge } from "./cards";
import { useResult } from "./toast";

export function NewProjectForm() {
  const { user, ready } = useSession();
  const router = useRouter();
  const toast = useResult();
  const [cur, setCur] = useState("USD");
  if (!ready) return <Loading />;
  if (!user)
    return (
      <div className="card space-y-4 p-6">
        <p className="text-sm text-muted">Log in to post a project.</p>
        <div className="flex gap-3"><Link className="btn-primary" href="/login?next=/projects/new">Log in</Link><Link className="btn-secondary" href="/signup">Sign up</Link></div>
      </div>
    );

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const publish = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === "publish";
    let min = 0, max = 0;
    try {
      min = Number(toMinorUnits(String(f.get("min") || "0"), cur));
      max = Number(toMinorUnits(String(f.get("max") || f.get("min") || "0"), cur));
    } catch (err) {
      toast({ ok: false, error: `Budget: ${err instanceof Error ? err.message : "invalid"} (${minorUnitExponent(cur)} decimals allowed).` });
      return;
    }
    const r = saveProject({
      title: String(f.get("title")), description: String(f.get("description")), categorySlug: String(f.get("category") ?? ""),
      skills: String(f.get("skills") ?? "").split(",").map((x) => x.trim()).filter(Boolean),
      budgetType: f.get("budgetType") === "hourly" ? "hourly" : "fixed", minMinor: min, maxMinor: max, currency: cur, deadline: String(f.get("deadline") ?? ""),
    }, publish);
    if (toast(r, publish ? "Project published." : "Draft saved.")) router.push(`/dashboard/projects/${(r as { data: string }).data}`);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field id="title" label="Title"><input id="title" name="title" minLength={5} maxLength={150} className="input" required /></Field>
      <Field id="description" label="Description"><textarea id="description" name="description" rows={6} minLength={20} maxLength={10000} className="input" required /></Field>
      <Field id="category" label="Category"><select id="category" name="category" defaultValue="" required className="input"><option value="" disabled>Select a category</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
      <Field id="skills" label="Required skills" hint="Comma separated."><input id="skills" name="skills" className="input" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="budgetType" label="Budget type"><select id="budgetType" name="budgetType" defaultValue="fixed" className="input"><option value="fixed">Fixed price</option><option value="hourly">Hourly</option></select></Field>
        <Field id="currency" label="Currency"><select id="currency" value={cur} onChange={(e) => setCur(e.target.value)} className="input"><option>USD</option><option>INR</option><option>EUR</option><option>GBP</option></select></Field>
        <Field id="min" label="Minimum budget"><input id="min" name="min" inputMode="decimal" className="input" required /></Field>
        <Field id="max" label="Maximum budget"><input id="max" name="max" inputMode="decimal" className="input" /></Field>
      </div>
      <Field id="deadline" label="Deadline"><input id="deadline" name="deadline" type="date" className="input" /></Field>
      <p className="text-xs text-muted">Attachments will be available once file storage is connected.</p>
      <div className="flex gap-3"><button type="submit" value="draft" className="btn-secondary">Save draft</button><button type="submit" value="publish" className="btn-primary">Publish project</button></div>
    </form>
  );
}

export function ProjectDetail({ id }: { id: string }) {
  const { db, user, ready } = useSession();
  const toast = useResult();
  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><Loading /></div>;
  const p = db.projects.find((x) => x.id === id);
  const visible = p && ((p.status !== "draft") || p.ownerId === user?.id || user?.isAdmin);
  if (!p || !visible) notFound();
  const owner = db.users.find((u) => u.id === p.ownerId);
  const mine = user ? db.proposals.find((x) => x.projectId === p.id && x.freelancerId === user.id && !["withdrawn", "rejected"].includes(x.status)) : undefined;
  const isOwner = user?.id === p.ownerId;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    let price = 0;
    try { price = Number(toMinorUnits(String(f.get("price")), p.currency)); } catch { toast({ ok: false, error: "Enter a valid price." }); return; }
    if (toast(submitProposal({ projectId: p.id, cover: String(f.get("cover")), priceMinor: price, days: Number(f.get("days")) }), "Proposal sent.")) e.currentTarget.reset();
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_400px]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{p.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted"><StatusBadge status={p.status} /> {label(p.budgetType)} · {money(p.minMinor, p.currency)} – {money(p.maxMinor, p.currency)}{p.deadline ? ` · due ${p.deadline}` : ""}</p>
        <p className="mt-1 text-sm text-muted">Posted by {owner?.name}</p>
        <p className="mt-6 whitespace-pre-line leading-7 text-muted">{p.description}</p>
        <ul className="mt-6 flex flex-wrap gap-2">{p.skills.map((k) => <li key={k} className="glossy-pill px-3 py-1 text-xs">{k}</li>)}</ul>
      </div>
      <div>
        {isOwner ? (
          <div className="card space-y-3 p-6"><h2 className="font-semibold">This is your project</h2><Link href={`/dashboard/projects/${p.id}`} className="btn-primary">Manage proposals</Link></div>
        ) : mine ? (
          <div className="card space-y-3 p-6">
            <h2 className="font-semibold">Your proposal</h2>
            <p className="text-sm text-muted">{money(mine.priceMinor, mine.currency)} · {mine.days} days</p>
            <StatusBadge status={mine.status} />
            {["submitted", "viewed", "shortlisted"].includes(mine.status) && <button className="btn-secondary" onClick={() => toast(setProposalStatus(mine.id, "withdrawn"), "Proposal withdrawn.")}>Withdraw</button>}
            {mine.status === "accepted" && <Link className="btn-primary" href="/dashboard/orders">Go to orders</Link>}
          </div>
        ) : p.status !== "published" ? (
          <div className="card p-6 text-sm text-muted">This project is not open for proposals.</div>
        ) : !user ? (
          <div className="card space-y-3 p-6"><p className="text-sm text-muted">Log in to submit a proposal.</p><Link className="btn-primary" href={`/login?next=/projects/${p.id}`}>Log in</Link></div>
        ) : (
          <form onSubmit={submit} className="card space-y-4 p-6">
            <h2 className="text-lg font-semibold">Submit a proposal</h2>
            <Field id="cover" label="Cover letter"><textarea id="cover" name="cover" rows={5} minLength={20} maxLength={5000} required className="input" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="price" label={`Price (${p.currency})`}><input id="price" name="price" inputMode="decimal" required className="input" /></Field>
              <Field id="days" label="Delivery (days)"><input id="days" name="days" type="number" min={1} required className="input" /></Field>
            </div>
            <button type="submit" className="btn-primary w-full">Send proposal</button>
          </form>
        )}
      </div>
    </div>
  );
}
