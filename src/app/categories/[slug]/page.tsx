import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES } from "@/lib/site";
import { PageHeader } from "@/components/ui";
import { ExploreClient } from "@/app/explore/explore-client";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = CATEGORIES.find((x) => x.slug === slug);
  return { title: c?.name ?? "Category", description: c?.blurb };
}

export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const c = CATEGORIES.find((x) => x.slug === slug);
  if (!c) notFound();
  return (
    <>
      <PageHeader title={c.name} subtitle={c.blurb} />
      <ExploreClient initialCategory={c.slug} />
    </>
  );
}
