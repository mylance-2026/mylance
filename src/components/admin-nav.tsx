"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN } from "@/lib/admin";

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col">
      {ADMIN.map((a) => {
        const href = a.slug ? `/admin/${a.slug}` : "/admin";
        const active = path === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm ${active ? "glossy-pill text-fg" : "text-muted hover:text-fg"}`}>
            <a.icon size={16} aria-hidden /> {a.title}
          </Link>
        );
      })}
    </nav>
  );
}
