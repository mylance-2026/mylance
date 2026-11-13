import type { Metadata } from "next";
import { Suspense } from "react";
import { FreelancerProfile } from "@/components/freelancer-profile";
import { Loading } from "@/components/guards";

export const metadata: Metadata = { title: "Freelancer profile" };

async function Inner({ params }: { params: PageProps<"/freelancers/[username]">["params"] }) {
  const { username } = await params;
  return <FreelancerProfile username={username} />;
}

export default function Page(props: PageProps<"/freelancers/[username]">) {
  return <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10"><Loading /></div>}><Inner params={props.params} /></Suspense>;
}
