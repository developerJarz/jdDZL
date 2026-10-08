"use client";

import { useState } from "react";

export function BranchList({ branches }: { branches: { n: string; text: string }[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? branches : branches.slice(0, 3);
  return (
    <div className="relative z-10">
      <ul className="space-y-4 text-sm text-gray-300">
        {shown.map((b, i) => (
          <li key={i}>
            {b.n && <span className="font-medium text-white">Branch {b.n}:</span>} {b.text}
          </li>
        ))}
      </ul>
      {branches.length > 3 && (
        <button
          type="button"
          onClick={() => setAll((a) => !a)}
          className="mt-3 text-sm font-medium text-white underline underline-offset-2 hover:text-gray-300 transition-colors"
        >
          {all ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
