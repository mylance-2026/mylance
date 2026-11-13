"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { addPortfolioItem, removePortfolioItem } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { Field } from "./ui";
import { UploadPicker } from "./upload-picker";
import { useResult } from "./toast";

export function PortfolioEditor() {
  const { user } = useSession();
  const toast = useResult();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  if (!user) return null;
  const items = user.portfolio ?? [];
  const add = () => {
    if (toast(addPortfolioItem({ title, url, description }), "Portfolio item added.")) { setTitle(""); setUrl(""); setDescription(""); }
  };
  return (
    <section className="card space-y-4 p-6">
      <h2 className="font-semibold">Portfolio</h2>
      <p className="text-sm text-muted">Show past work with a title, a link and a short note.</p>
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3 text-sm">
              <span className="min-w-0 truncate">{p.title}</span>
              <button type="button" aria-label={`Remove ${p.title}`} className="text-muted hover:text-danger" onClick={() => toast(removePortfolioItem(p.id), "Removed.")}><Trash2 size={16} aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pf-title" label="Title"><input id="pf-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="input" /></Field>
        <Field id="pf-url" label="Link"><input id="pf-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="input" /></Field>
      </div>
      <Field id="pf-desc" label="Short description"><textarea id="pf-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="input" /></Field>
      <UploadPicker id="pf-file" label="Images" accept="image/png,image/jpeg,image/webp" hint="PNG, JPG or WebP, up to 5 MB each." />
      <button type="button" className="btn-secondary" onClick={add}>Add item</button>
    </section>
  );
}
