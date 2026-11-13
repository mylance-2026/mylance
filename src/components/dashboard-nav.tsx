"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASH } from "@/lib/dashboard";

export function DashboardNav() {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto md:flex-col">
      {DASH.map((d) => {
        const href = d.slug ? `/dashboard/${d.slug}` : "/dashboard";
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm ${active ? "glossy-pill text-fg" : "text-muted hover:text-fg"}`}
          >
            <d.icon size={16} aria-hidden /> {d.title}
          </Link>
        );
      })}
    </nav>
  );
}
