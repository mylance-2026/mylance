import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <>
      <PageHeader title="Pricing" subtitle="No subscription. A service fee applies to completed orders." />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Clients</h2>
          <p className="mt-2 text-3xl font-bold">4% <span className="text-base font-normal text-muted">service fee</span></p>
          <p className="mt-3 text-sm text-muted">Added to the agreed price at checkout and shown before you pay.</p>
        </section>
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Freelancers</h2>
          <p className="mt-2 text-3xl font-bold">4% <span className="text-base font-normal text-muted">service fee</span></p>
          <p className="mt-3 text-sm text-muted">Deducted from the agreed price of each order.</p>
        </section>
      </div>
      <p className="mx-auto max-w-6xl px-4 text-sm text-muted">
        Example: on a 1,000 order, the client pays 1,040 and the freelancer receives 960. Rates are configurable and may change; the rate in force when an order is created is the one that applies to it.
      </p>
    </>
  );
}
