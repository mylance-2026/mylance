import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectDetail } from "@/components/project-forms";
import { Loading } from "@/components/guards";

export const metadata: Metadata = { title: "Project" };

async function Inner({ params }: { params: PageProps<"/projects/[id]">["params"] }) {
  const { id } = await params;
  return <ProjectDetail id={id} />;
}

export default function Page(props: PageProps<"/projects/[id]">) {
  return <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10"><Loading /></div>}><Inner params={props.params} /></Suspense>;
}
