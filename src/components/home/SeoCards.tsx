"use client";

import { useState } from "react";
import { cn } from "@/lib/format";

const tones = ["bg-blue-50", "bg-purple-50", "bg-white", "bg-yellow-50", "bg-green-50", "bg-pink-50"];

/** SEO copy blocks at the bottom of the home page (4 visible on desktop, 1 on phones). */
export function SeoCards({ cards }: { cards: { title: string; html: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 lg:px-0">
        {cards.map((c, i) => (
          <div
            key={c.title}
            className={cn(
              "rounded-2xl p-6 dark:bg-[#1b1b1b] shadow-sm",
              tones[i % tones.length],
              !expanded && i >= 1 && "hidden",
              !expanded && i >= 1 && i < 4 && "sm:block",
            )}
          >
            {i === 0 ? <h2 className="font-bold dark:text-white">{c.title}</h2> : <h3 className="font-bold dark:text-white">{c.title}</h3>}
            <div
              className="my-4 text-sm leading-relaxed text-black dark:text-white [&_a]:text-blue-700 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-[#d4a97a]"
              dangerouslySetInnerHTML={{ __html: c.html }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-center p-4 lg:px-0">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="rounded-full px-6 py-2 text-sm font-semibold text-black border border-gray-700 hover:bg-gray-700 dark:bg-[#2e2b28] hover:text-white dark:text-white transition-colors"
        >
          {expanded ? "Show Less" : "Read More"}
        </button>
      </div>
    </div>
  );
}
