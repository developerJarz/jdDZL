"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavigationData } from "@/services/navigation";
import type { SiteSettings } from "@/types";
import { ChevronRightIcon, MapPinIcon, MenuIcon, NavCategoryIcon } from "@/components/icons";
import { Img } from "@/components/ui/Img";
import { CartButton, ThemeToggle } from "./HeaderActions";
import { HeaderSearch } from "./HeaderSearch";

/** Phone header (< md): logo row, search row and the slide-down category menu. */
export function MobileHeader({ site, nav }: { site: SiteSettings; nav: NavigationData }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // close the drawer on navigation
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="md:hidden px-4 relative">
      <div className="flex items-center justify-between pb-3.5 pt-2">
        <Link href="/" className="shrink-0 mr-2" aria-label={`${site.name} home`}>
          <Img asset={site.assets.logo} alt={`${site.name} logo`} width={150} height={31} priority className="h-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle className="w-10 h-10 rounded-xl bg-[#E9CCAE47] flex items-center justify-center transition-all duration-300" />
          <Link href="/shop-location" aria-label="Shop location" className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-[#222222] dark:text-white">
            <MapPinIcon />
          </Link>
          <CartButton className="relative w-10 h-10 rounded-xl bg-white dark:bg-[#2e2b28] flex items-center justify-center text-[#222] dark:text-white" />
        </div>
      </div>
      <div className="flex pb-3 relative gap-2">
        <div className="flex-1 relative">
          <HeaderSearch compact />
        </div>
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-300 dark:bg-[#2e2b28]"
        >
          {menuOpen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <MenuIcon />
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 mx-0 z-[1000] bg-white dark:bg-[#2e2b28] rounded-2xl shadow-2xl max-h-[calc(100vh-200px)] overflow-y-auto">
          <Link href="/categories" className="flex items-center gap-3 px-5 py-4 text-[15px] text-[#222] dark:text-white border-b border-gray-50 dark:border-white/5">
            <NavCategoryIcon className="[&_path]:stroke-[#222] dark:[&_path]:stroke-white" />
            All Category
          </Link>
          <ul>
            {nav.explore.map((c) => {
              const open = expanded === c.slug;
              const subs = nav.categories.find((x) => x.slug === c.slug)?.subCategories ?? [];
              return (
                <li key={c.slug}>
                  <div className="flex items-center">
                    <Link href={`/categories/${c.slug}`} className="flex-1 flex items-center gap-4 pl-5 py-3 text-sm text-[#222] dark:text-gray-100">
                      <span className="relative w-5 h-5 shrink-0">{c.image && <Img asset={c.image} alt="" fill sizes="20px" className="object-contain" />}</span>
                      {c.name}
                    </Link>
                    {(subs.length > 0 || c.brands.length > 0) && (
                      <button
                        type="button"
                        aria-label={`${open ? "Collapse" : "Expand"} ${c.name}`}
                        aria-expanded={open}
                        onClick={() => setExpanded(open ? null : c.slug)}
                        className="px-5 py-3 text-gray-400"
                      >
                        <ChevronRightIcon className={"transition-transform " + (open ? "rotate-90" : "")} />
                      </button>
                    )}
                  </div>
                  {open && (
                    <div className="px-5 pb-3 grid grid-cols-2 gap-2">
                      {(subs.length ? subs.map((s) => ({ href: `/categories/${c.slug}/${s.slug}`, label: s.name })) : c.brands.map((b) => ({ href: `/brands/${b.slug}`, label: b.name }))).map((l) => (
                        <Link key={l.href} href={l.href} className="text-[13px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
