"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NavigationData } from "@/services/navigation";
import { ChevronDownBoldIcon, ChevronDownIcon } from "@/components/icons";
import { Img } from "@/components/ui/Img";

/** Desktop category bar: "EXPLORE ALL" panel + per-category hover mega menu. */
export function CategoryNav({ nav }: { nav: NavigationData }) {
  const [exploreOpen, setExploreOpen] = useState(false);
  const [active, setActive] = useState(nav.explore[0]?.slug);
  const [hovered, setHovered] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!exploreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setExploreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExploreOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [exploreOpen]);

  const activeExplore = nav.explore.find((e) => e.slug === active) ?? nav.explore[0];

  const open = (slug: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHovered(slug);
  };
  const close = () => {
    closeTimer.current = setTimeout(() => setHovered(null), 120);
  };

  return (
    <div className="flex items-center gap-3 py-2.5 w-full">
      <div className="relative shrink-0" ref={panelRef}>
        <button
          type="button"
          aria-expanded={exploreOpen}
          aria-haspopup="true"
          onClick={() => setExploreOpen((o) => !o)}
          className="flex items-center gap-2 bg-[#D4A97A] hover:bg-[#c89a6b] text-gray-900 font-bold text-[12.5px] tracking-wide px-[18px] py-[14px] rounded-[9px] transition-colors"
        >
          EXPLORE ALL
          <ChevronDownBoldIcon className={"transition-transform duration-300 " + (exploreOpen ? "rotate-180" : "")} />
        </button>

        {exploreOpen && (
          <div className="absolute left-0 top-full mt-2 z-[1000] flex bg-white dark:bg-[#2e2b28] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <ul className="w-[214px] py-2 px-2 border-r border-gray-100 dark:border-gray-700 max-h-[70vh] overflow-y-auto no-scrollbar">
              {nav.explore.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/categories/${c.slug}`}
                    onMouseEnter={() => setActive(c.slug)}
                    onFocus={() => setActive(c.slug)}
                    onClick={() => setExploreOpen(false)}
                    className={
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors " +
                      (c.slug === activeExplore?.slug
                        ? "bg-[#F5EBE0] text-[#222] dark:bg-[#3a312a] dark:text-white"
                        : "text-[#222] dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5")
                    }
                  >
                    <span className="relative w-5 h-5 shrink-0">
                      {c.image && <Img asset={c.image} alt="" fill sizes="20px" className="object-contain" />}
                    </span>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="p-5 w-[364px] max-h-[70vh] overflow-y-auto no-scrollbar">
              {activeExplore && activeExplore.brands.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {activeExplore.brands.map((b) => (
                    <Link
                      key={b.slug}
                      href={`/brands/${b.slug}`}
                      onClick={() => setExploreOpen(false)}
                      className="flex flex-col items-center justify-center gap-2 h-[90px] rounded-xl border border-gray-200 dark:border-gray-600 hover:border-[#D4A97A] transition-colors px-2"
                    >
                      <span className="relative w-full h-9">
                        {b.logo ? (
                          <Img asset={b.logo} alt={b.name} fill sizes="90px" className="object-contain" />
                        ) : (
                          <span className="flex h-full items-center justify-center text-sm font-bold text-[#222] dark:text-white">{b.name}</span>
                        )}
                      </span>
                      <span className="text-[11px] text-[#222] dark:text-gray-200 text-center leading-tight line-clamp-1">{b.name}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No brands listed for this category.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />

      <nav className="items-center rounded-lg flex-1 bg-background py-1.5 px-5 w-[90%] relative z-99" aria-label="Categories">
        <ul className="flex items-center gap-1 list-none">
          {nav.categories.map((c) => {
            const isOpen = hovered === c.slug && c.subCategories.length > 0;
            return (
              <li key={c.slug} className="relative" onMouseEnter={() => open(c.slug)} onMouseLeave={close}>
                <Link
                  href={`/categories/${c.slug}`}
                  aria-expanded={c.subCategories.length ? isOpen : undefined}
                  className="flex dark:bg-light_bg items-center gap-1 text-sm text-primary font-bold hover:text-[#222222] dark:hover:text-[#ba975f] whitespace-nowrap px-3 py-1.5 rounded-lg transition-colors duration-150 no-underline"
                >
                  {c.name}
                  <ChevronDownIcon className={"w-3.5 h-3.5 transition-transform duration-300 ease-in-out " + (isOpen ? "rotate-180" : "rotate-0")} />
                </Link>
                {isOpen && (
                  <div className="absolute left-0 top-full pt-3 z-[1000]">
                    <ul className="grid grid-cols-3 gap-x-4 min-w-[480px] max-w-[640px] bg-white dark:bg-[#2e2b28] rounded-b-xl rounded-t-sm shadow-2xl px-1.5 py-1.5">
                      {c.subCategories.map((s) => (
                        <li key={s.slug}>
                          <Link
                            href={`/categories/${c.slug}/${s.slug}`}
                            onClick={() => setHovered(null)}
                            className="block px-5 py-2 text-sm font-medium text-[#222] dark:text-gray-100 rounded-lg hover:bg-[#F5EBE0] dark:hover:bg-white/5 hover:text-[#CB843B] whitespace-nowrap"
                          >
                            {s.name}
                          </Link>
                          {s.children?.map((k) => (
                            <Link
                              key={k.slug}
                              href={`/categories/${c.slug}/${s.slug}/${k.slug}`}
                              onClick={() => setHovered(null)}
                              className="block pl-8 pr-5 py-1 text-[13px] text-gray-500 dark:text-gray-300 rounded-lg hover:bg-[#F5EBE0] dark:hover:bg-white/5 hover:text-[#CB843B] whitespace-nowrap"
                            >
                              {k.name}
                            </Link>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
