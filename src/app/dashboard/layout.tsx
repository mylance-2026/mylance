import type { Metadata } from "next";
import { DashboardNav } from "@/components/dashboard-nav";
import { RequireAuth } from "@/components/guards";

// Everything here is behind a client-side session guard, so it cannot be prerendered into the app shell.
export const instant = false;

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[200px_1fr]">
      <DashboardNav />
      <div className="min-w-0"><RequireAuth>{children}</RequireAuth></div>
    </div>
  );
}
