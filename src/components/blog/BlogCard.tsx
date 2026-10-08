import Link from "next/link";
import { ArrowRightIcon, CalendarIcon } from "@/components/icons";
import { Img } from "@/components/ui/Img";
import type { BlogPost } from "@/types";

export function BlogCard({ post }: { post: BlogPost }) {
  const href = `/blogs/${post.slug}`;
  return (
    <article className="group flex flex-col h-full rounded-xl overflow-hidden border border-gray-100 dark:border-[#1b1b1b] shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-[#1b1b1b] duration-300">
      <Link href={href} className="overflow-hidden relative w-full h-75 block" aria-label={post.title}>
        <Img asset={post.image} alt={post.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link href={href} className="flex items-center gap-3 mb-2">
          <span className="bg-[#d4a97a] text-white text-xs font-semibold px-3 py-0.5 rounded-full">{post.category}</span>
          {post.date && (
            <span className="text-gray-400 dark:text-gray-300 text-xs flex items-center gap-1">
              <CalendarIcon />
              {post.date}
            </span>
          )}
        </Link>
        <Link href={href}>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug line-clamp-2 min-h-[44px]">{post.title}</h3>
        </Link>
        <p className="text-gray-500 dark:text-gray-300 text-xs leading-relaxed line-clamp-2 min-h-[36px] mt-2">{post.excerpt}</p>
        <Link
          href={href}
          className="mt-auto w-full flex items-center justify-between bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg hover:bg-gray-700 dark:bg-[#2e2b28] transition-colors"
        >
          Read More
          <span className="w-6 h-6 rounded-full border border-yellow-400 flex items-center justify-center">
            <ArrowRightIcon />
          </span>
        </Link>
      </div>
    </article>
  );
}
