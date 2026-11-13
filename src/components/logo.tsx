import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-bold tracking-tight" aria-label="Mylance home">
      <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-b from-accent to-primary-hover text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">M</span>
      <span className="text-lg">MYLANCE</span>
    </Link>
  );
}
