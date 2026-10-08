import type { Metadata } from "next";
import { PostGridPage } from "@/components/blog/PostGrid";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/press-coverage")), path: "/press-coverage" });
}

// The snapshot's press page was empty ("No Press Coverage found at the moment.").
export default function PressCoveragePage() {
  return <PostGridPage crumb="Press Coverage" title="Press Coverage" posts={[]} basePath="/press-coverage" emptyText="No Press Coverage found at the moment." />;
}
