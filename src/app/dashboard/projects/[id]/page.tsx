import { Suspense } from "react";
import { ProjectManage } from "@/components/project-manage";
import { Loading } from "@/components/guards";

async function Inner({ params }: { params: PageProps<"/dashboard/projects/[id]">["params"] }) {
  const { id } = await params;
  return <ProjectManage id={id} />;
}

export default function Page(props: PageProps<"/dashboard/projects/[id]">) {
  return <Suspense fallback={<Loading />}><Inner params={props.params} /></Suspense>;
}

// Behind the client-side session guard; cannot be part of the prerendered app shell.
export const instant = false;
