import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "How it works" };

const FLOWS = [
  {
    title: "Buy a fixed-price service",
    steps: ["Browse or search published services.", "Compare Basic, Standard and Premium packages.", "Share your requirements and check out.", "Receive the delivery, request revisions if needed, then approve."],
  },
  {
    title: "Hire for a custom project",
    steps: ["Publish a brief with budget, deadline and skills.", "Receive and compare proposals.", "Accept one proposal to start an order.", "Track delivery and approve the finished work."],
  },
  {
    title: "Sell as a freelancer",
    steps: ["Create your profile and showcase your portfolio.", "Publish services or bid on projects.", "Deliver work through the order page.", "Get reviewed after a completed order."],
  },
];

export default function HowItWorks() {
  return (
    <>
      <PageHeader title="How Mylance works" subtitle="Two ways to hire, one clear order process." />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
        {FLOWS.map((f) => (
          <section key={f.title} className="card p-6">
            <h2 className="text-lg font-semibold">{f.title}</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
              {f.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </section>
        ))}
      </div>
      <div className="mx-auto max-w-6xl px-4">
        <Link href="/signup" className="btn-primary">Create an account</Link>
      </div>
    </>
  );
}
