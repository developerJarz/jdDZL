import type { Metadata } from "next";
import { PostGridPage } from "@/components/blog/PostGrid";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta, getPosts } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/announcement")), path: "/announcement" });
}

export default async function AnnouncementPage() {
  const posts = await getPosts("announcements");
  return <PostGridPage crumb="Store updates" title="What’s new at dazzle.bd" posts={posts} basePath="/announcement" emptyText="New store updates will appear here." />;
}
