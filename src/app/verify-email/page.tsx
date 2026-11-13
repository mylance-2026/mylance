import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <PageHeader title="Verify your email" subtitle="Email verification needs an email provider, which is not connected yet." />
      <div className="card mt-6 space-y-3 p-6 text-sm text-muted">
        <p>When the backend is connected, we will send a confirmation link to your address and this page will confirm it.</p>
        <p>In local preview mode accounts are active immediately, so no verification is needed.</p>
        <Link href="/dashboard" className="btn-primary inline-flex">Continue to dashboard</Link>
      </div>
    </main>
  );
}
