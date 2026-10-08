import Link from "next/link";
import { ArrowRightIcon, CalendarIcon } from "@/components/icons";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Img } from "@/components/ui/Img";
import type { BlogPost } from "@/types";

/** Card grid used by /career and /announcement (image isn't a link; the button is). */
export function PostGridPage({ crumb, title, posts, basePath, emptyText }: { crumb: string; title: string; posts: BlogPost[]; basePath: string; emptyText: string }) {
  const categories = [...new Set(posts.map((p) => p.category))];
  return (
    <div className="flex flex-col flex-1 max-w-355 mx-auto lg:px-8 px-4 pb-10 w-full">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: crumb }]} />
      {categories.length > 0 && basePath === "/career" && (
        <div className="flex flex-wrap gap-2">
          <span className="px-5 h-10 flex items-center rounded-full text-sm font-medium border bg-[#101828] text-white border-black">All Categories</span>
          {categories.map((c) => (
            <span key={c} className="px-5 h-10 flex items-center rounded-full text-sm font-medium border bg-white text-gray-700 border-gray-300">
              {c}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between py-3">
        <h1 className="lg:text-[32px] text-[20px] font-bold text-gray-900 dark:text-white">{title}</h1>
        {posts.length > 0 && <p className="text-sm text-gray-400">{posts.length} posts</p>}
      </div>
      {posts.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {posts.map((p) => (
            <article key={p.slug} className="group rounded-xl overflow-hidden border border-gray-100 dark:border-[#1b1b1b] shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-[#1b1b1b] duration-300">
              <div className="overflow-hidden relative w-full h-75">
                <Img asset={p.image} alt={p.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-[#d4a97a] text-white text-xs font-semibold px-3 py-0.5 rounded-full">{p.category}</span>
                  <span className="text-gray-400 dark:text-gray-300 text-xs flex items-center gap-1">
                    <CalendarIcon />
                    {p.date}
                  </span>
                </div>
                <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 leading-snug line-clamp-2">{p.title}</h2>
                <p className="text-gray-500 dark:text-gray-300 text-xs mb-4 leading-relaxed line-clamp-2 min-h-4">{p.excerpt}</p>
                <Link
                  href={`${basePath}/${p.slug}`}
                  className="w-full flex items-center justify-between bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg hover:bg-gray-700 dark:bg-[#2e2b28] transition-colors"
                >
                  Read More
                  <span className="w-6 h-6 rounded-full border border-yellow-400 flex items-center justify-center">
                    <ArrowRightIcon />
                  </span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-4">
          <div className="w-22 h-22 rounded-full bg-gray-100 dark:bg-[#2c2c2a] flex items-center justify-center text-gray-400" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l18 18M7 3h7l5 5v7M19 19v2H5V5" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-300">{emptyText}</p>
        </div>
      )}
    </div>
  );
}

/** Detail page for a career / announcement post whose body wasn't mirrored. */
export function PostDetail({ crumbs, post }: { crumbs: { label: string; href?: string }[]; post: BlogPost }) {
  return (
    <div className="flex flex-col flex-1 max-w-355 mx-auto lg:px-8 px-4 pb-10 w-full">
      <Breadcrumb items={crumbs} />
      {post.image && (
        <div className="relative w-full max-[450px]:h-[310px] h-[560px] rounded-3xl overflow-hidden bg-white">
          <Img asset={post.image} alt={post.title} fill priority sizes="(max-width: 1024px) 100vw, 1000px" className="object-contain" />
        </div>
      )}
      <div className="py-6 space-y-6">
        <div className="rounded-2xl bg-[#F7F7F7] dark:bg-[#393430] p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-yellow-400 text-white text-xs font-semibold px-3 py-0.5 rounded-full">{post.category}</span>
            <span className="text-[#222] dark:text-gray-300 text-xs">{post.date}</span>
          </div>
          <h1 className="font-semibold text-[20px] lg:text-[32px] text-[#222] dark:text-white mb-2 leading-snug">{post.title}</h1>
          {post.excerpt && <p className="text-[#222] dark:text-gray-300 text-sm">{post.excerpt}</p>}
        </div>
        <div className="rounded-2xl bg-[#F7F7F7] dark:bg-[#393430] p-6 text-sm text-gray-600 dark:text-gray-300">
          The full post wasn&apos;t part of the offline snapshot. It will be shown here once the content API is connected.
        </div>
      </div>
    </div>
  );
}
