import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { getShowcase } from "@/services/catalog";
import { getPageMeta } from "@/services/content";
import { ShowcasePage } from "./ShowcasePage";

// Titles / breadcrumbs from the reference "See all" pages.
export const SHOWCASE_PAGES = {
  "new-arrivals": { crumb: "Catalogue additions", title: "Fresh ideas for your next device", variant: "listing" },
  "hot-deal": { crumb: "Price reductions", title: "Compare current price reductions", variant: "home" },
  "most-popular": { crumb: "More to explore", title: "More models for your shortlist", variant: "home" },
  "trending-now": { crumb: "Discover", title: "Find your next everyday favourite", variant: "home" },
  "feature-product": { crumb: "Setup ideas", title: "Make your everyday setup work better", variant: "home" },
} as const;

type Slug = keyof typeof SHOWCASE_PAGES;

export async function showcaseMetadata(slug: Slug): Promise<Metadata> {
  const page = SHOWCASE_PAGES[slug];
  const meta = await getPageMeta(`/${slug}`);
  const title = meta?.title && meta.title !== "dazzle.bd" ? meta.title : `${page.title} | dazzle.bd`;
  return buildMetadata({ title, description: meta?.description, path: `/${slug}` });
}

export async function ShowcaseRoute({ slug }: { slug: Slug }) {
  const page = SHOWCASE_PAGES[slug];
  const data = await getShowcase(slug);
  if (!data) notFound();
  return <ShowcasePage crumb={page.crumb} title={page.title} products={data.products} variant={page.variant} />;
}
