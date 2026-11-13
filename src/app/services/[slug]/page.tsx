import type { Metadata } from "next";
import { Suspense } from "react";
import { ServiceDetail } from "@/components/service-detail";
import { Loading } from "@/components/guards";

export const metadata: Metadata = { title: "Service" };

async function Inner({ params }: { params: PageProps<"/services/[slug]">["params"] }) {
  const { slug } = await params;
  return <ServiceDetail slug={slug} />;
}

export default function ServicePage(props: PageProps<"/services/[slug]">) {
  return <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10"><Loading /></div>}><Inner params={props.params} /></Suspense>;
}
