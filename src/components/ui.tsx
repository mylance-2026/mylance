import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-3 mt-4 md:mx-auto md:max-w-6xl"><div className="card">
      <div className="px-6 py-12 md:px-10">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-muted">{subtitle}</p>}
      </div>
    </div></div>
  );
}

export function EmptyState({
  icon: Icon, title, body, action,
}: { icon: LucideIcon; title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-elevated text-accent"><Icon size={22} aria-hidden /></span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{body}</p>
      {action && <Link href={action.href} className="btn-primary mt-6">{action.label}</Link>}
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 3 }, (_, i) => <li key={i} className="card h-56 animate-pulse" />)}
    </ul>
  );
}

export function Field({ id, label, children, hint }: { id: string; label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function NotConnected({ children = "This action is not connected yet." }: { children?: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-muted [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_p]:mb-4 [&_p]:leading-7 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1">
      {children}
    </div>
  );
}
