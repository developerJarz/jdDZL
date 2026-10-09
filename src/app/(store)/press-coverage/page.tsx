import type { Metadata } from "next";
import { PostGridPage } from "@/components/blog/PostGrid";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/press-coverage")), path: "/press-coverage" });
}

// The snapshot's press page was empty ("No Press Coverage found at the moment.").
export default function PressCoveragePage() {
  return <PostGridPage crumb="Media" title="News and media enquiries" posts={[]} basePath="/press-coverage" emptyText="For a question about dazzle.bd or a media enquiry, contact us through the Support page." />;
}
