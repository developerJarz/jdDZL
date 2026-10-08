import type { Metadata } from "next";
import { PostGridPage } from "@/components/blog/PostGrid";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta, getPosts } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/career")), path: "/career" });
}

export default async function CareerPage() {
  const posts = await getPosts("careers");
  return <PostGridPage crumb="Career" title="Latest Job Posts" posts={posts} basePath="/career" emptyText="No job openings at the moment." />;
}
