import type { Metadata } from "next";
import { PostGridPage } from "@/components/blog/PostGrid";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta, getPosts } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/announcement")), path: "/announcement" });
}

export default async function AnnouncementPage() {
  const posts = await getPosts("announcements");
  return <PostGridPage crumb="Announcement" title="Announcement" posts={posts} basePath="/announcement" emptyText="No announcements at the moment." />;
}
