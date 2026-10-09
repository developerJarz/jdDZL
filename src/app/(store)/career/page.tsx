import type { Metadata } from "next";
import { PostGridPage } from "@/components/blog/PostGrid";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta, getPosts } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/career")), path: "/career" });
}

export default async function CareerPage() {
  const posts = await getPosts("careers");
  return <PostGridPage crumb="Careers" title="Working with dazzle.bd" posts={posts} basePath="/career" emptyText="There are no published vacancies right now. Future opportunities will appear here." />;
}
