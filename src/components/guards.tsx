"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { claimAdminLocal } from "@/lib/demo/actions";
import { DEMO, useSession } from "@/lib/demo/store";
import { useResult } from "./toast";

export function Loading() {
  return <div className="card h-48 animate-pulse" aria-busy="true" aria-label="Loading" />;
}

/** Client-side convenience only. The real backend enforces access on the server and in RLS. */
export function RequireAuth({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const { user, ready } = useSession();
  const router = useRouter();
  const path = usePathname();
  const toast = useResult();
  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [ready, user, router, path]);
  if (!ready || !user) return <Loading />;
  if (admin && !user.isAdmin)
    return (
      <div className="card mx-auto max-w-md space-y-4 p-8 text-center">
        <h1 className="text-xl font-bold">Admin access required</h1>
        <p className="text-sm text-muted">This area is for marketplace administrators.</p>
        {DEMO ? (
          <>
            <button className="btn-primary" onClick={() => toast(claimAdminLocal(), "Admin enabled for this local preview.")}>Enable admin (local preview only)</button>
            <p className="text-xs text-muted">In the real backend, admin rights are granted only on the server.</p>
          </>
        ) : (
          <Link href="/" className="btn-secondary">Back to home</Link>
        )}
      </div>
    );
  return <>{children}</>;
}

export function PreviewBanner() {
  return (
    <p className="mx-3 mt-3 rounded-full border border-line bg-elevated px-4 py-1.5 text-center text-xs text-muted md:mx-auto md:max-w-6xl">
      {DEMO ? "Local preview mode: your data stays in this browser. Payments and emails are not real." : "Backend not connected yet: accounts, orders and payments are disabled."}
    </p>
  );
}
