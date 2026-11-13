"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import { CATEGORIES } from "@/lib/site";
import { useDb } from "@/lib/demo/store";
import { isPublic } from "@/lib/demo/actions";
import { minorUnitExponent } from "@/lib/domain/money";
import { EmptyState } from "@/components/ui";
import { ServiceCard } from "@/components/cards";
import { Loading } from "@/components/guards";
import { useQueryParam } from "@/lib/use-query";
import { Pager, pageCount, paginate, usePage } from "@/components/pager";

export function ExploreClient({ initialCategory }: { initialCategory?: string }) {
  const db = useDb();
  const urlQ = useQueryParam("q");
  const urlCat = useQueryParam("category");
  const [qIn, setQ] = useState<string | null>(null);
  const q = qIn ?? urlQ;
  const [qd, setQd] = useState<string | null>(null);
  const [catIn, setCat] = useState<string | null>(null);
  const cat = catIn ?? (urlCat || initialCategory || "");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [days, setDays] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = usePage(`${qd ?? urlQ}|${cat}|${min}|${max}|${days}|${sort}`);

  useEffect(() => { const t = setTimeout(() => setQd(q), 250); return () => clearTimeout(t); }, [q]);

  const rows = useMemo(() => {
    const major = (n: number, c: string) => n / 10 ** minorUnitExponent(c);
    const k = (qd ?? urlQ).trim().toLowerCase();
    const list = db.services.filter(isPublic).filter((s) => {
      const seller = db.users.find((u) => u.id === s.sellerId);
      if (seller?.suspended) return false;
      if (cat && s.categorySlug !== cat) return false;
      if (k && ![s.title, s.description, ...s.tags, seller?.name ?? ""].join(" ").toLowerCase().includes(k)) return false;
      const from = Math.min(...s.packages.map((p) => major(p.priceMinor, p.currency)));
      if (min && from < Number(min)) return false;
      if (max && from > Number(max)) return false;
      if (days && Math.min(...s.packages.map((p) => p.deliveryDays)) > Number(days)) return false;
      return true;
    });
    const price = (s: (typeof list)[number]) => Math.min(...s.packages.map((p) => p.priceMinor));
    return list.sort((a, b) => sort === "price_asc" ? price(a) - price(b) || a.id.localeCompare(b.id) : sort === "price_desc" ? price(b) - price(a) || a.id.localeCompare(b.id) : b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  }, [db, qd, urlQ, cat, min, max, days, sort]);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[260px_1fr]">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="card h-fit space-y-5 p-5">
        <div><label htmlFor="q" className="label">Keyword</label><input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="input" placeholder="e.g. logo design" /></div>
        <div>
          <label htmlFor="cat" className="label">Category</label>
          <select id="cat" value={cat} onChange={(e) => setCat(e.target.value)} className="input">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <fieldset>
          <legend className="label">Starting price</legend>
          <div className="flex gap-2">
            <input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} className="input" placeholder="Min" aria-label="Minimum price" />
            <input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} className="input" placeholder="Max" aria-label="Maximum price" />
          </div>
        </fieldset>
        <div>
          <label htmlFor="days" className="label">Delivery time</label>
          <select id="days" value={days} onChange={(e) => setDays(e.target.value)} className="input">
            <option value="">Any</option><option value="1">Up to 24 hours</option><option value="3">Up to 3 days</option><option value="7">Up to 7 days</option><option value="30">Up to 30 days</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="label">Sort by</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="input">
            <option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
          </select>
        </div>
        <button type="button" className="btn-secondary w-full" onClick={() => { setQ(""); setQd(""); setCat(""); setMin(""); setMax(""); setDays(""); setSort("newest"); }}>Clear filters</button>
      </form>
      <section aria-label="Results">
        {!db.ready ? <Loading /> : rows.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No services found" body={db.services.some(isPublic) ? "Try changing or clearing your filters." : "Services will be listed here when freelancers publish them."} action={{ href: "/dashboard/services/new", label: "Publish a service" }} />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted" aria-live="polite">{rows.length} service{rows.length === 1 ? "" : "s"}</p>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginate(rows, page).map((s) => <li key={s.id}><ServiceCard s={s} seller={db.users.find((u) => u.id === s.sellerId)} /></li>)}
            </ul>
            <Pager page={page} pages={pageCount(rows.length)} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
