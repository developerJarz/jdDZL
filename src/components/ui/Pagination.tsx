"use client";

import { cn } from "@/lib/format";

/** Prev · 1 2 3 … N · Next (reference blog pagination). */
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  if (page <= 3) [2, 3].forEach((p) => p <= totalPages && pages.add(p));
  const list = [...pages].sort((a, b) => a - b);
  const base = "px-3 py-1.5 rounded-md border text-sm";
  const idle = "border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800";
  return (
    <nav className="flex items-center justify-center gap-2 mb-10 flex-wrap" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className={cn(base, idle, "disabled:opacity-40 disabled:pointer-events-none")}>
        Prev
      </button>
      {list.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - list[i - 1] > 1 && <span className="px-1 text-gray-400 text-sm">…</span>}
          <button
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onChange(p)}
            className={cn(base, p === page ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" : idle)}
          >
            {p}
          </button>
        </span>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={cn(base, idle, "disabled:opacity-40 disabled:pointer-events-none")}>
        Next
      </button>
    </nav>
  );
}
