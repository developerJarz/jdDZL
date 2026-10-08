import type { Metadata } from "next";
import { BlogList } from "@/components/blog/BlogList";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { buildMetadata } from "@/lib/seo";
import { getBlogPosts, getPageMeta } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/blogs")), path: "/blogs" });
}

export default async function BlogsPage() {
  const { posts, categories } = await getBlogPosts();
  return (
    <div className="flex flex-col flex-1 max-w-355 mx-auto lg:px-8 px-4">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Blogs" }]} />
      <BlogList posts={posts} categories={categories} />
    </div>
  );
}
