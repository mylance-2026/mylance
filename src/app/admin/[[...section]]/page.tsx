import { notFound } from "next/navigation";
import { ADMIN } from "@/lib/admin";
import { AdminView } from "@/components/admin-views";

export function generateStaticParams() {
  return ADMIN.map((a) => ({ section: a.slug ? [a.slug] : [] }));
}

export default async function AdminSectionPage({ params }: PageProps<"/admin/[[...section]]">) {
  const { section } = await params;
  if (section && section.length > 1) notFound();
  const slug = section?.[0] ?? "";
  if (!ADMIN.some((x) => x.slug === slug)) notFound();
  return <AdminView slug={slug} />;
}

// Behind the client-side session guard; cannot be part of the prerendered app shell.
export const instant = false;
