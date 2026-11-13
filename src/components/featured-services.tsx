"use client";

import { PackageSearch } from "lucide-react";
import { isPublic } from "@/lib/demo/actions";
import { useDb } from "@/lib/demo/store";
import { EmptyState } from "./ui";
import { ServiceCard } from "./cards";
import { Loading } from "./guards";

export function FeaturedServices() {
  const db = useDb();
  if (!db.ready) return <Loading />;
  const rows = db.services.filter(isPublic).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  if (rows.length === 0)
    return <EmptyState icon={PackageSearch} title="No published services yet" body="Featured services appear here once freelancers publish and have them approved." action={{ href: "/signup?role=freelancer", label: "Become a freelancer" }} />;
  return <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((s) => <li key={s.id}><ServiceCard s={s} seller={db.users.find((u) => u.id === s.sellerId)} /></li>)}</ul>;
}
