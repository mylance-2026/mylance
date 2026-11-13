"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { NAV } from "@/lib/site";
import { useSession } from "@/lib/demo/store";
import { logOut } from "@/lib/demo/actions";
import { useResult } from "./toast";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { db, user, ready } = useSession();
  const router = useRouter();
  const toast = useResult();
  const unread = user ? db.notifs.filter((n) => n.userId === user.id && !n.read).length : 0;
  const out = () => { toast(logOut(), "Logged out."); setOpen(false); router.push("/"); };

  const account = !ready ? null : user ? (
    <>
      <Link href="/dashboard/notifications" className="glossy-pill relative grid h-10 w-10 place-items-center" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
        <Bell size={16} aria-hidden />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold">{unread}</span>}
      </Link>
      <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
      <button type="button" onClick={out} className="btn-primary">Log out</button>
    </>
  ) : (
    <>
      <Link href="/login" className="btn-secondary">Log in</Link>
      <Link href="/signup" className="btn-primary">Sign up</Link>
    </>
  );

  return (
    <header className="sticky top-3 z-40 mx-3 mt-3 rounded-full border border-line bg-surface/70 bg-gradient-to-b from-white/15 to-white/[0.02] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.3),0_12px_32px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl md:mx-auto md:max-w-6xl">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-muted hover:text-fg">{n.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">{account}</div>
        <button
          type="button"
          className="rounded-full p-2 text-fg lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line px-4 pb-4 lg:hidden">
          <ul className="flex flex-col py-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className="block py-3 text-fg">{n.label}</Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>{account}</div>
        </nav>
      )}
    </header>
  );
}
