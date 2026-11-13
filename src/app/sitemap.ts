import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/site";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/explore", "/categories", "/projects", "/freelancers", "/how-it-works", "/pricing", "/about", "/contact", "/terms", "/privacy", "/community-guidelines"];
  return [...pages, ...CATEGORIES.map((c) => `/categories/${c.slug}`)].map((p) => ({ url: `${BASE}${p}` }));
}
