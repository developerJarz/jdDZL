import type { Metadata } from "next";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Build page metadata from the reference page's <head> (title / description / keywords). */
export function buildMetadata(opts: {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  path: string;
  image?: string | null;
}): Metadata {
  const title = opts.title?.trim() || "Dazzle";
  const description = opts.description?.trim() || undefined;
  return {
    title,
    description,
    keywords: opts.keywords?.trim() || undefined,
    alternates: { canonical: opts.path },
    openGraph: {
      title,
      description,
      url: opts.path,
      images: opts.image ? [{ url: opts.image }] : undefined,
    },
    twitter: { title, description, images: opts.image ? [opts.image] : undefined },
  };
}
