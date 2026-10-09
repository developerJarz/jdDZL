"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NavigationData } from "@/services/navigation";
import type { SiteSettings } from "@/types";
import {
  ChevronRightIcon,
  MapPinIcon,
  MenuIcon,
  NavCategoryIcon,
} from "@/components/icons";
import { Img } from "@/components/ui/Img";
import { CartButton, ThemeToggle } from "./HeaderActions";
import { HeaderSearch } from "./HeaderSearch";
import { useDropdownHeight } from "./useDropdownHeight";
import styles from "./HeaderMenus.module.css";

/** Phone and tablet header: logo, search and a viewport-bounded category menu. */
export function MobileHeader({
  site,
  nav,
}: {
  site: SiteSettings;
  nav: NavigationData;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useDropdownHeight(rootRef, menuOpen);

  useEffect(() => {
    // close the drawer on navigation
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        triggerRef.current?.focus();
        setMenuOpen(false);
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [menuOpen]);

  return (
    <div
      ref={rootRef}
      className="lg:hidden px-4 relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setMenuOpen(false);
      }}
    >
      <div className="flex items-center justify-between pb-3.5 pt-2">
        <Link
          href="/"
          className="shrink-0 mr-2"
          aria-label={`${site.name} home`}
        >
          <Img
            asset={site.assets.logo}
            alt={`${site.name} logo`}
            width={150}
            height={31}
            priority
            className="h-auto"
          />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle className="w-10 h-10 rounded-xl bg-[#E9CCAE47] flex items-center justify-center transition-all duration-300" />
          <Link
            href="/support"
            aria-label="Ask for support"
            className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-[#222222] dark:text-white"
          >
            <MapPinIcon />
          </Link>
          <CartButton className="relative w-10 h-10 rounded-xl bg-white dark:bg-[#2e2b28] flex items-center justify-center text-[#222] dark:text-white" />
        </div>
      </div>
      <div className="flex pb-3 relative gap-2">
        <div className="flex-1 min-w-0 relative">
          <HeaderSearch compact />
        </div>
        <button
          ref={triggerRef}
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-category-panel"
          onClick={() => setMenuOpen((o) => !o)}
          className="w-11 h-10 shrink-0 rounded-xl bg-background flex items-center justify-center text-primary focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
        >
          {menuOpen ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <MenuIcon />
          )}
        </button>
      </div>

      <nav
        id="mobile-category-panel"
        aria-label="Browse categories"
        data-open={menuOpen}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`${styles.dropdown} ${styles.mobileDropdown}`}
      >
        <Link
          href="/categories"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3 px-5 py-4 text-[15px] font-semibold text-[#222] dark:text-white border-b border-gray-100 dark:border-white/10"
        >
          <NavCategoryIcon className="[&_path]:stroke-[#222] dark:[&_path]:stroke-white" />
          Browse all products
        </Link>
        <ul>
          {nav.explore.map((c) => {
            const open = expanded === c.slug;
            const subs =
              nav.categories.find((x) => x.slug === c.slug)?.subCategories ??
              [];
            return (
              <li key={c.slug}>
                <div className="flex items-center">
                  <Link
                    href={`/categories/${c.slug}`}
                    onClick={() => setMenuOpen(false)}
                    className="min-w-0 flex-1 flex items-center gap-3 pl-5 py-3 text-sm font-medium text-[#222] dark:text-gray-100"
                  >
                    <span className="relative w-5 h-5 shrink-0">
                      {c.image && (
                        <Img
                          asset={c.image}
                          alt=""
                          fill
                          sizes="20px"
                          className="object-contain"
                        />
                      )}
                    </span>
                    {c.name}
                  </Link>
                  {(subs.length > 0 || c.brands.length > 0) && (
                    <button
                      type="button"
                      aria-label={`${open ? "Collapse" : "Expand"} ${c.name}`}
                      aria-expanded={open}
                      aria-controls={`mobile-submenu-${c.slug}`}
                      onClick={() => setExpanded(open ? null : c.slug)}
                      className="w-12 min-h-11 flex items-center justify-center shrink-0 text-primary"
                    >
                      <ChevronRightIcon
                        className={
                          "transition-transform duration-200 ease-out motion-reduce:transition-none " +
                          (open ? "rotate-90" : "")
                        }
                      />
                    </button>
                  )}
                </div>
                <div
                  id={`mobile-submenu-${c.slug}`}
                  className={styles.mobileSubmenu}
                  data-open={open}
                  aria-hidden={!open}
                  inert={!open}
                >
                  <div>
                    <div className={styles.mobileSubmenuLinks}>
                      {(subs.length
                        ? subs.map((s) => ({
                            href: `/categories/${c.slug}/${s.slug}`,
                            label: s.name,
                          }))
                        : c.brands.map((b) => ({
                            href: `/brands/${b.slug}`,
                            label: b.name,
                          }))
                      )
                        .sort((a, b) => a.label.localeCompare(b.label))
                        .map((l) => (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={() => setMenuOpen(false)}
                          >
                            {l.label}
                          </Link>
                        ))}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
