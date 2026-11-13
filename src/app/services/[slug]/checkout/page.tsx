import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { Loading } from "@/components/guards";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

async function Inner({ params }: { params: PageProps<"/services/[slug]/checkout">["params"] }) {
  const { slug } = await params;
  return <CheckoutForm slug={slug} />;
}

export default function Page(props: PageProps<"/services/[slug]/checkout">) {
  return <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-10"><Loading /></div>}><Inner params={props.params} /></Suspense>;
}
