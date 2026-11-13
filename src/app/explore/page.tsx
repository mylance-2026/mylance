import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ExploreClient } from "./explore-client";

export const metadata: Metadata = { title: "Explore services" };

export default function ExplorePage() {
  return (
    <>
      <PageHeader title="Explore services" subtitle="Search and filter published services from freelancers." />
      <ExploreClient />
    </>
  );
}
