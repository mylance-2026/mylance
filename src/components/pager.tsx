"use client";

import { useState } from "react";

/** Page number that resets to 1 whenever the filter key changes. */
export function usePage(key: string): [number, (p: number) => void] {
  const [s, set] = useState({ key, page: 1 });
  return [s.key === key ? s.page : 1, (p) => set({ key, page: p })];
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
      <button className="btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="text-sm text-muted">Page {page} of {pages}</span>
      <button className="btn-secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}

export const PAGE_SIZE = 9;
export const paginate = <T,>(rows: T[], page: number) => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
export const pageCount = (n: number) => Math.max(1, Math.ceil(n / PAGE_SIZE));
