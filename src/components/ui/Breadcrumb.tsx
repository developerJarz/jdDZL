import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { SITE_URL } from "@/lib/seo";

export interface Crumb {
  label: string;
  href?: string;
}

/** Chevron breadcrumb used on listing, product and blog pages (+ BreadcrumbList JSON-LD). */
export function Breadcrumb({ items, className = "lg:pt-6 pt-3 pb-3" }: { items: Crumb[]; className?: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: new URL(c.href, SITE_URL).toString() } : {}),
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className={"flex items-center flex-wrap text-sm text-gray-600 " + className}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {items.map((c, i) => (
        <div key={i} className="flex items-center">
          {c.href && i < items.length - 1 ? (
            <>
              <Link href={c.href} className="hover:text-black dark:hover:text-white transition-colors text-[#747474] dark:text-white/50">
                {c.label}
              </Link>
              <ChevronRightIcon className="mx-1 text-[#747474] dark:text-white/50" />
            </>
          ) : (
            <span aria-current="page" className="font-medium text-black dark:text-white line-clamp-1">
              {c.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}

/** Compact "Home / About Us" crumb used on static info pages. */
export function SlashBreadcrumb({ label }: { label: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mb-0">
      <Link href="/" className="hover:underline">
        Home
      </Link>
      <span className="mx-0.5">/</span>
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
    </nav>
  );
}
