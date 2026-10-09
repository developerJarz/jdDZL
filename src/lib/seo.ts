import type { Metadata } from "next";
import { BRAND_NAME, BRAND_DESCRIPTION } from "@/data/content/brand";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dazzle.bd";

/** Build page metadata from the reference page's <head> (title / description / keywords). */
export function buildMetadata(opts: {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  path: string;
  image?: string | null;
}): Metadata {
  const pageTitle = opts.title?.trim() || BRAND_NAME;
  const title = pageTitle.includes(BRAND_NAME) ? pageTitle : `${pageTitle} | ${BRAND_NAME}`;
  const description = opts.description?.trim() || BRAND_DESCRIPTION;
  return {
    title,
    description,
    keywords: opts.keywords?.trim() || undefined,
    alternates: { canonical: opts.path },
    openGraph: {
      siteName: BRAND_NAME,
      title,
      description,
      url: opts.path,
      images: opts.image ? [{ url: opts.image }] : undefined,
    },
    twitter: { title, description, images: opts.image ? [opts.image] : undefined },
  };
}
