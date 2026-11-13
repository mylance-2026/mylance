import type { Metadata } from "next";
import { AdminNav } from "@/components/admin-nav";
import { RequireAuth } from "@/components/guards";

// Everything here is behind a client-side session guard, so it cannot be prerendered into the app shell.
export const instant = false;

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[200px_1fr]">
      <AdminNav />
      <div className="min-w-0"><RequireAuth admin>{children}</RequireAuth></div>
    </div>
  );
}
