"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { logIn, signUp } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { useQueryParam } from "@/lib/use-query";
import { useResult } from "./toast";

const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const router = useRouter();
  const toast = useResult();
  const { user, ready } = useSession();
  const urlRole = useQueryParam("role");
  const [roleSel, setRole] = useState<"client" | "freelancer" | "both" | null>(null);
  const role = roleSel ?? (urlRole === "freelancer" ? "freelancer" : "client");
  const [busy, setBusy] = useState(false);
  const dest = useRef<string | null>(null);

  useEffect(() => {
    if (ready && user) router.replace(dest.current ?? safeNext(new URLSearchParams(location.search).get("next")) ?? "/dashboard");
  }, [ready, user, router]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    if (signup) dest.current = safeNext(new URLSearchParams(location.search).get("next")) ?? "/onboarding";
    const r = signup ? signUp({ name: String(f.get("name")), email, password, role }) : logIn(email, password);
    setBusy(false);
    toast(r, signup ? "Account created." : "Welcome back.");
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <h1 className="text-2xl font-bold">{signup ? "Create your account" : "Log in"}</h1>
      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        {signup && (
          <>
            <div>
              <label htmlFor="name" className="label">Display name</label>
              <input id="name" name="name" className="input" autoComplete="name" required />
            </div>
            <fieldset>
              <legend className="label">I want to</legend>
              <div className="grid grid-cols-3 gap-3">
                {([["client", "Hire talent"], ["freelancer", "Offer services"], ["both", "Both"]] as const).map(([v, t]) => (
                  <label key={v} className="card flex cursor-pointer items-center gap-2 p-3 text-sm has-[:checked]:border-primary">
                    <input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)} /> {t}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" required />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" minLength={8} className="input" autoComplete={signup ? "new-password" : "current-password"} required />
        </div>
        {!signup && <Link href="/forgot-password" className="block text-sm text-accent hover:underline">Forgot your password?</Link>}
        <button type="submit" disabled={busy} className="btn-primary w-full">{signup ? "Create account" : "Log in"}</button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {signup ? "Already have an account? " : "New to Mylance? "}
        <Link href={signup ? "/login" : "/signup"} className="text-accent hover:underline">{signup ? "Log in" : "Sign up"}</Link>
      </p>
    </div>
  );
}
