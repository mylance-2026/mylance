import Link from "next/link";
import {
  Search, ShieldCheck, Wallet, MessageSquare, FileCheck2, Users, Briefcase, ArrowRight,
} from "lucide-react";
import { CATEGORIES } from "@/lib/site";
import { FeaturedServices } from "@/components/featured-services";

const STEPS = [
  { icon: Search, title: "Find talent or post a brief", body: "Browse fixed-price services, or publish a project with your budget and deadline." },
  { icon: FileCheck2, title: "Agree on scope and price", body: "Pick a package, or review proposals and choose the freelancer who fits." },
  { icon: MessageSquare, title: "Collaborate in one place", body: "Chat, share files and track delivery and revisions on every order." },
  { icon: Wallet, title: "Approve and pay", body: "Review the delivery, request changes if needed, and complete the order when you are satisfied." },
];

const TRUST = [
  { icon: ShieldCheck, title: "Transparent fees", body: "Fees are shown before you commit and frozen on each order, so they never change after the fact." },
  { icon: Users, title: "Verified reviews only", body: "Only participants in a completed order can leave a review." },
  { icon: MessageSquare, title: "Private by default", body: "Order files and messages are visible only to the people involved." },
];

const FAQ = [
  { q: "How does Mylance work?", a: "Clients either buy a fixed-price service or publish a project and choose from freelancer proposals. Work is delivered, reviewed and approved inside an order." },
  { q: "What does it cost?", a: "Joining is free. A service fee applies to each order. See the pricing page for how it is calculated." },
  { q: "Can I be both a client and a freelancer?", a: "Yes. One account can hire and sell." },
  { q: "How are disputes handled?", a: "Either party can open a dispute on an order, and the Mylance team reviews it." },
];

export default function Home() {
  return (
    <>
      <section className="card relative mx-3 mt-4 md:mx-auto md:max-w-6xl">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-[radial-gradient(ellipse_at_center,rgba(96,165,250,0.4),transparent_70%)]" />
        <div className="relative px-6 py-16 md:px-12 md:py-24">
          <p className="text-sm font-medium text-accent">The freelance marketplace</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Find the right talent. Get work done.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Mylance helps businesses discover skilled professionals, hire with confidence, manage projects and pay through a transparent marketplace.
          </p>
          <form action="/explore" role="search" className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <label htmlFor="hero-q" className="sr-only">Search services and freelancers</label>
            <input id="hero-q" name="q" type="search" placeholder="Search services, skills or freelancers" className="input flex-1 py-3" />
            <button type="submit" className="btn-primary py-3"><Search size={18} aria-hidden /> Search</button>
          </form>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/explore" className="btn-primary">Explore Services <ArrowRight size={16} aria-hidden /></Link>
            <Link href="/projects/new" className="btn-secondary">Start a Project</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="cats">
        <div className="flex items-end justify-between">
          <h2 id="cats" className="text-2xl font-bold">Popular categories</h2>
          <Link href="/categories" className="text-sm text-accent hover:underline">View all</Link>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CATEGORIES.slice(0, 5).map((c) => (
            <li key={c.slug}>
              <Link href={`/categories/${c.slug}`} className="card flex h-full flex-col gap-3 p-5 transition-colors hover:border-accent">
                <c.icon size={22} className="text-accent" aria-hidden />
                <span className="font-semibold">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="featured">
        <h2 id="featured" className="text-2xl font-bold">Featured services</h2>
        <div className="mt-6"><FeaturedServices /></div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="how">
        <h2 id="how" className="text-2xl font-bold">How Mylance works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-5">
              <span className="text-xs font-semibold text-accent">Step {i + 1}</span>
              <s.icon size={22} className="mt-3 text-accent" aria-hidden />
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pt-20 md:grid-cols-2" aria-label="Benefits">
        <div className="card p-6">
          <Briefcase className="text-accent" aria-hidden />
          <h2 className="mt-3 text-xl font-bold">For clients</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
            <li>Compare packages with clear prices and delivery times</li>
            <li>Post a project and receive proposals</li>
            <li>Track deliveries, revisions and approvals</li>
          </ul>
          <Link href="/signup?role=client" className="btn-primary mt-5">Hire talent</Link>
        </div>
        <div className="card p-6">
          <Users className="text-accent" aria-hidden />
          <h2 className="mt-3 text-xl font-bold">For freelancers</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
            <li>Publish services with Basic, Standard and Premium packages</li>
            <li>Bid on projects that match your skills</li>
            <li>Build a profile backed by verified reviews</li>
          </ul>
          <Link href="/signup?role=freelancer" className="btn-secondary mt-5">Start selling</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="trust">
        <h2 id="trust" className="text-2xl font-bold">Trust and safety</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {TRUST.map((t) => (
            <li key={t.title} className="card p-5">
              <t.icon size={22} className="text-accent" aria-hidden />
              <h3 className="mt-3 font-semibold">{t.title}</h3>
              <p className="mt-2 text-sm text-muted">{t.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 pt-20" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-bold">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-line card">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none font-medium marker:hidden">{f.q}</summary>
              <p className="mt-3 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
