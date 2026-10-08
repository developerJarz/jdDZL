import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarSmallIcon } from "@/components/icons";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Img } from "@/components/ui/Img";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { getBlogPost, getBlogSlugs, getPageMeta } from "@/services/content";

export async function generateStaticParams() {
  return (await getBlogSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/blogs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [post, meta] = await Promise.all([getBlogPost(slug), getPageMeta(`/blogs/${slug}`)]);
  if (!post) return {};
  return buildMetadata({ title: meta?.title || post.title, description: meta?.description || post.excerpt, path: `/blogs/${slug}`, image: post.image?.src });
}

export default function BlogPostPage({ params }: PageProps<"/blogs/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Post params={params} />
    </Suspense>
  );
}

async function Post({ params }: { params: PageProps<"/blogs/[slug]">["params"] }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.image ? new URL(post.image.src, SITE_URL).toString() : undefined,
    datePublished: post.date || undefined,
    articleSection: post.category,
  };

  return (
    <div className="flex flex-col flex-1 max-w-355 mx-auto lg:px-8 px-4 pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Blogs", href: "/blogs" }, { label: post.title }]} />
      {post.image && (
        <div className="overflow-hidden relative w-full max-[450px]:h-[310px] h-[700px] group rounded-3xl">
          <Img asset={post.image} alt={post.title} fill priority sizes="(max-width: 1024px) 100vw, 1000px" className="object-contain transition-transform duration-300 group-hover:scale-105 rounded-3xl" />
        </div>
      )}
      <div className="py-6 space-y-6">
        <div className="rounded-2xl bg-[#F7F7F7] dark:bg-[#393430] p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-yellow-400 text-white text-xs font-semibold px-3 py-0.5 rounded-full">{post.category}</span>
            {post.date && (
              <span className="text-[#222] dark:text-gray-300 text-xs flex items-center gap-1">
                <CalendarSmallIcon />
                {post.date}
              </span>
            )}
          </div>
          <h1 className="font-semibold text-[20px] lg:text-[32px] text-[#222] dark:text-white mb-2 leading-snug">{post.title}</h1>
          {post.excerpt && <p className="text-[#222] dark:text-gray-300 text-sm leading-relaxed">{post.excerpt}</p>}
        </div>
        <div className="rounded-2xl bg-[#F7F7F7] dark:bg-[#393430] p-6">
          {post.contentHtml ? (
            <article
              className="cms-content dark-html-content text-[#222] dark:text-white overflow-x-auto [&_table]:w-auto [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 [&_th]:border [&_th]:border-gray-200 [&_th]:p-2 [&_img]:max-w-full [&_img]:rounded-lg"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">The full article wasn&apos;t part of the offline snapshot. It will be shown here once the blog API is connected.</p>
          )}
        </div>
      </div>
    </div>
  );
}
