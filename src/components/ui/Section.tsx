import Link from "next/link";
import { cn } from "@/lib/format";

/** Gold-gradient section title used across the home page ("Categories", "Trending Now"…). */
export const goldTitle =
  "text-transparent bg-clip-text bg-[linear-gradient(90deg,#101518_0%,#E9CCAE_46.15%,#B57908_100%)] dark:text-white";

export function SectionTitle({
  as: Tag = "h2",
  children,
  className,
}: {
  as?: "h1" | "h2" | "h3";
  children: React.ReactNode;
  className?: string;
}) {
  return <Tag className={cn("md:text-[32px] text-[20px] font-bold", className)}>{children}</Tag>;
}

export function SeeAllLink({ href, label = "See all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-primary bg-orange-50 border-orange-200 px-4 py-2 rounded-[10px] dark:text-[#2e2b28] hover:underline hover:text-[#CB843B]! transition-colors duration-300 whitespace-nowrap"
    >
      {label}
    </Link>
  );
}

/** Centered max-width wrapper matching the reference `max-w-355 mx-auto` containers. */
export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col flex-1 max-w-355 w-full mx-auto", className)}>{children}</div>;
}
