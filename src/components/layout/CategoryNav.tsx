"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { NavigationData } from "@/services/navigation";
import {
  ChevronDownBoldIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@/components/icons";
import { Img } from "@/components/ui/Img";
import { useDropdownHeight } from "./useDropdownHeight";
import styles from "./HeaderMenus.module.css";

type MenuLink = {
  slug: string;
  name: string;
  href: string;
  children?: MenuLink[];
};

/** All desktop dropdowns share the navigation bar's bounds, rather than a link's position. */
export function CategoryNav({ nav }: { nav: NavigationData }) {
  const [menu, setMenu] = useState({ slug: "explore", open: false });
  const [active, setActive] = useState(nav.explore[0]?.slug);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useDropdownHeight(rootRef, menu.open);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const dismiss = useCallback(() => {
    cancelClose();
    setMenu((current) => ({ ...current, open: false }));
  }, [cancelClose]);
  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!menu.open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) dismiss();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (rootRef.current?.contains(document.activeElement))
        triggerRef.current?.focus();
      dismiss();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu.open, dismiss]);

  const open = (slug: string) => {
    cancelClose();
    setMenu({ slug, open: true });
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      // Keep a menu available while its links have keyboard focus.
      if (!panelRef.current?.contains(document.activeElement)) dismiss();
    }, 180);
  };
  const onTriggerKey = (
    event: KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>,
    slug: string,
  ) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    triggerRef.current = event.currentTarget;
    open(slug);
    requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLElement>("a, button")?.focus(),
    );
  };

  const explore = menu.slug === "explore";
  const activeExplore =
    nav.explore.find((item) => item.slug === active) ?? nav.explore[0];
  const category = nav.categories.find((item) => item.slug === menu.slug);
  const title = explore ? activeExplore?.name : category?.name;
  const slug = explore ? activeExplore?.slug : category?.slug;
  const menuLinks: MenuLink[] = explore
    ? [
        // Preserve the collection route as a plain link when browsing brands.
        ...(slug
          ? [
              {
                slug: "collection",
                name: `All ${title}`,
                href: `/categories/${slug}`,
              },
            ]
          : []),
        ...(activeExplore?.brands
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((brand) => ({
            slug: brand.slug,
            name: brand.name,
            href: `/brands/${brand.slug}`,
          })) ?? []),
      ]
    : (category?.subCategories
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({
          slug: item.slug,
          name: item.name,
          href: `/categories/${category.slug}/${item.slug}`,
          children: item.children
            ?.slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => ({
              slug: child.slug,
              name: child.name,
              href: `/categories/${category.slug}/${item.slug}/${child.slug}`,
            })),
        })) ?? []);
  // Fill each column from top to bottom, keeping a category and its children together.
  const columns = Array.from({ length: 5 }, (_, index) => {
    const size = Math.floor(menuLinks.length / 5);
    const extra = menuLinks.length % 5;
    const start = index * size + Math.min(index, extra);
    return menuLinks.slice(start, start + size + (index < extra ? 1 : 0));
  });

  return (
    <div
      ref={rootRef}
      className={styles.categoryBar}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          dismiss();
      }}
    >
      <button
        type="button"
        aria-expanded={menu.open && explore}
        aria-controls="desktop-category-panel"
        onKeyDown={(event) => onTriggerKey(event, "explore")}
        onClick={(event) => {
          triggerRef.current = event.currentTarget;
          if (menu.open && explore) dismiss();
          else open("explore");
        }}
        className={styles.exploreTrigger}
      >
        Explore all
        <ChevronDownBoldIcon className={styles.chevron} />
      </button>

      <nav className={styles.categoryNav} aria-label="Categories">
        <ul className={styles.categoryList}>
          {nav.categories.map((item) => {
            const isOpen = menu.open && menu.slug === item.slug;
            return (
              <li
                key={item.slug}
                className={styles.categoryItem}
                data-active={isOpen}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse") return;
                  if (item.subCategories.length) {
                    triggerRef.current =
                      event.currentTarget.querySelector("button");
                    open(item.slug);
                  } else dismiss();
                }}
              >
                <Link
                  href={`/categories/${item.slug}`}
                  onClick={dismiss}
                  onKeyDown={(event) => onTriggerKey(event, item.slug)}
                  className={styles.categoryLink}
                >
                  {item.name}
                </Link>
                {item.subCategories.length > 0 && (
                  <button
                    type="button"
                    aria-label={`Browse ${item.name}`}
                    aria-expanded={isOpen}
                    aria-controls="desktop-category-panel"
                    className={styles.categoryToggle}
                    onKeyDown={(event) => onTriggerKey(event, item.slug)}
                    onClick={(event) => {
                      triggerRef.current = event.currentTarget;
                      if (isOpen) dismiss();
                      else open(item.slug);
                    }}
                  >
                    <ChevronDownIcon className={styles.chevron} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        id="desktop-category-panel"
        ref={panelRef}
        className={`${styles.dropdown} ${styles.desktopDropdown}`}
        data-open={menu.open}
        aria-hidden={!menu.open}
        inert={!menu.open}
        onMouseEnter={cancelClose}
      >
        <div className={styles.desktopPanel}>
          {explore && (
            <nav
              className={styles.exploreSidebar}
              aria-label="Explore categories"
            >
              <p className={styles.eyebrow}>Shop by category</p>
              <ul>
                {nav.explore.map((item) => (
                  <li key={item.slug}>
                    <button
                      type="button"
                      onPointerEnter={(event) => {
                        if (event.pointerType === "mouse") setActive(item.slug);
                      }}
                      onFocus={() => setActive(item.slug)}
                      onClick={() => setActive(item.slug)}
                      aria-pressed={item.slug === activeExplore?.slug}
                      className={styles.exploreCategory}
                    >
                      <span className="relative w-6 h-6 shrink-0">
                        {item.image && (
                          <Img
                            asset={item.image}
                            alt=""
                            fill
                            sizes="24px"
                            className="object-contain"
                          />
                        )}
                      </span>
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className={styles.menuContent}>
            <ul
              className={styles.menuLinks}
              aria-label={`${title ?? "Shop"} ${explore ? "brands" : "categories"}`}
              key={slug}
            >
              {columns.map((items, index) => (
                <li
                  key={index}
                  className={styles.menuColumn}
                  aria-hidden={items.length ? undefined : true}
                >
                  <ul>
                    {items.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={item.href}
                          onClick={dismiss}
                          className={styles.menuTextLink}
                        >
                          {item.name}
                        </Link>
                        {!!item.children?.length && (
                          <ul className={styles.childLinks}>
                            {item.children.map((child) => (
                              <li key={child.slug}>
                                <Link href={child.href} onClick={dismiss}>
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {explore && !activeExplore?.brands.length && (
              <p className={styles.emptyMessage}>
                Explore the full {title?.toLowerCase()} collection using the
                collection link.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
