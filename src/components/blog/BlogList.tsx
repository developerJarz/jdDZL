"use client";

import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/format";
import type { BlogPost } from "@/types";
import { BlogCard } from "./BlogCard";

const PAGE_SIZE = 12;

/** /blogs grid with category chips and pagination (state mirrored to ?category=&page=). */
export function BlogList({ posts, categories }: { posts: BlogPost[]; categories: string[] }) {
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect -- restore state from the URL after mount */
    setCategory(q.get("category"));
    setPage(Math.max(1, Number(q.get("page")) || 1));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const sync = (c: string | null, p: number) => {
    const q = new URLSearchParams();
    if (c) q.set("category", c);
    if (p > 1) q.set("page", String(p));
    window.history.replaceState(null, "", window.location.pathname + (q.size ? `?${q}` : ""));
  };

  const filtered = useMemo(() => (category ? posts.filter((p) => p.category.toLowerCase() === category.toLowerCase()) : posts), [posts, category]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const chip = "px-5 h-10 flex items-center rounded-full text-sm font-medium transition-colors border";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setCategory(null);
            setPage(1);
            sync(null, 1);
          }}
          className={cn(chip, !category ? "bg-[#101828] text-white border-black" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100")}
        >
          All Categories
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              const slug = c.toLowerCase();
              setCategory(slug);
              setPage(1);
              sync(slug, 1);
            }}
            className={cn(chip, category === c.toLowerCase() ? "bg-[#101828] text-white border-black" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100")}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between py-3">
        <h1 className="lg:text-[32px] text-[20px] font-bold text-gray-900 dark:text-white">Useful questions before your next tech purchase</h1>
        <p className="text-sm text-gray-400">{filtered.length} posts</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {shown.map((p) => (
          <BlogCard key={p.slug} post={p} />
        ))}
      </div>
      <Pagination
        page={current}
        totalPages={totalPages}
        onChange={(p) => {
          setPage(p);
          sync(category, p);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </>
  );
}
