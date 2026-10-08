import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Reference/development rebuild: crawling is disallowed unless explicitly enabled.
export default function robots(): MetadataRoute.Robots {
  const allow = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
  return {
    rules: allow ? { userAgent: "*", allow: "/", disallow: ["/cart", "/auth/", "/api/", "/search"] } : { userAgent: "*", disallow: "/" },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
