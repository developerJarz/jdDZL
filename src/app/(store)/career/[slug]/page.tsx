import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostDetail } from "@/components/blog/PostGrid";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { buildMetadata } from "@/lib/seo";
import { getPost, getPosts } from "@/services/content";

export async function generateStaticParams() {
  return (await getPosts("careers")).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/career/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost("careers", slug);
  return post ? buildMetadata({ title: `${post.title} | Career`, path: `/career/${slug}`, image: post.image?.src }) : {};
}

export default function CareerPostPage({ params }: PageProps<"/career/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/career/[slug]">["params"] }) {
  const { slug } = await params;
  const post = await getPost("careers", slug);
  if (!post) notFound();
  return <PostDetail crumbs={[{ label: "Home", href: "/" }, { label: "Career", href: "/career" }, { label: post.title }]} post={post} />;
}
