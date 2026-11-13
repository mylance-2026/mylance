"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { requestPasswordReset, resetPassword } from "@/lib/demo/actions";
import { DEMO } from "@/lib/demo/store";
import { useQueryParam } from "@/lib/use-query";
import { Field, NotConnected } from "./ui";
import { useResult } from "./toast";

export function ForgotForm() {
  const toast = useResult();
  const [link, setLink] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const r = requestPasswordReset(String(new FormData(e.currentTarget).get("email")));
    if (!toast(r)) return;
    setSent(true);
    const token = (r as { data: string }).data;
    setLink(token ? `/reset-password?token=${token}` : null);
  };
  return (
    <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
      <Field id="email" label="Email"><input id="email" name="email" type="email" required autoComplete="email" className="input" /></Field>
      <button type="submit" disabled={!DEMO} className="btn-primary w-full">Send reset link</button>
      {!DEMO && <NotConnected>Email is not configured yet.</NotConnected>}
      {DEMO && sent && (
        <div className="rounded-2xl border border-line p-4 text-sm text-muted">
          <p>If that email has an account, a reset link is ready.</p>
          {link && <p className="mt-2">Local preview sends no email, so use this link: <Link href={link} className="text-accent underline">Reset password</Link></p>}
        </div>
      )}
    </form>
  );
}

export function ResetForm() {
  const toast = useResult();
  const token = useQueryParam("token");
  const [done, setDone] = useState(false);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("pw"));
    if (pw !== String(f.get("pw2"))) return toast({ ok: false, error: "Passwords do not match." });
    if (toast(resetPassword(token ?? "", pw), "Password updated.")) setDone(true);
  };
  if (done) return <div className="card mt-6 p-6 text-sm">Your password was updated. <Link href="/login" className="text-accent underline">Log in</Link></div>;
  return (
    <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
      <Field id="pw" label="New password" hint="At least 8 characters."><input id="pw" name="pw" type="password" minLength={8} required autoComplete="new-password" className="input" /></Field>
      <Field id="pw2" label="Confirm password"><input id="pw2" name="pw2" type="password" minLength={8} required autoComplete="new-password" className="input" /></Field>
      <button type="submit" disabled={!DEMO} className="btn-primary w-full">Update password</button>
      {!DEMO && <NotConnected>Authentication is not connected yet.</NotConnected>}
    </form>
  );
}
