import Link from "next/link";
import { Logo } from "./logo";
import { FOOTER } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="card mx-3 mb-3 mt-24 rounded-[2.5rem] md:mx-auto md:max-w-6xl">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-3 text-sm text-muted">A marketplace for hiring skilled professionals with clear pricing.</p>
        </div>
        {Object.entries(FOOTER).map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <h2 className="text-sm font-semibold">{title}</h2>
            <ul className="mt-3 space-y-2">
              {links.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-muted hover:text-fg">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">© Mylance. All rights reserved.</div>
    </footer>
  );
}
