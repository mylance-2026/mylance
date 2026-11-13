import { Suspense } from "react";
import { OrderDetail } from "@/components/order-detail";
import { Loading } from "@/components/guards";

async function Inner({ params }: { params: PageProps<"/dashboard/orders/[id]">["params"] }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}

export default function Page(props: PageProps<"/dashboard/orders/[id]">) {
  return <Suspense fallback={<Loading />}><Inner params={props.params} /></Suspense>;
}

// Behind the client-side session guard; cannot be part of the prerendered app shell.
export const instant = false;
