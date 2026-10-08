import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostDetail } from "@/components/blog/PostGrid";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { buildMetadata } from "@/lib/seo";
import { getPost, getPosts } from "@/services/content";

export async function generateStaticParams() {
  return (await getPosts("announcements")).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/announcement/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost("announcements", slug);
  return post ? buildMetadata({ title: post.title, description: post.excerpt, path: `/announcement/${slug}`, image: post.image?.src }) : {};
}

export default function AnnouncementPostPage({ params }: PageProps<"/announcement/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/announcement/[slug]">["params"] }) {
  const { slug } = await params;
  const post = await getPost("announcements", slug);
  if (!post) notFound();
  return <PostDetail crumbs={[{ label: "Home", href: "/" }, { label: "Announcement", href: "/announcement" }, { label: post.title }]} post={post} />;
}
