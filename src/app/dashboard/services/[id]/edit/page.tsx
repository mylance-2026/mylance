import { Suspense } from "react";
import { ServiceForm } from "@/components/service-form";
import { Loading } from "@/components/guards";

async function Inner({ params }: { params: PageProps<"/dashboard/services/[id]/edit">["params"] }) {
  const { id } = await params;
  return <ServiceForm id={id} />;
}

export default function Page(props: PageProps<"/dashboard/services/[id]/edit">) {
  return <Suspense fallback={<Loading />}><Inner params={props.params} /></Suspense>;
}

// Behind the client-side session guard; cannot be part of the prerendered app shell.
export const instant = false;
