import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/lib/site";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" subtitle="Browse talent by area of expertise." />
      <ul className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link href={`/categories/${c.slug}`} className="card flex h-full gap-4 p-5 transition-colors hover:border-accent">
              <c.icon size={24} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="block font-semibold">{c.name}</span>
                <span className="mt-1 block text-sm text-muted">{c.blurb}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
