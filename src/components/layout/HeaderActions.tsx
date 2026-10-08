"use client";

import Link from "next/link";
import { BasketIcon } from "@/components/icons";
import { useStore } from "@/context/store";
import { useTheme } from "@/context/theme";

export function CartButton({ className }: { className: string }) {
  const { cartCount } = useStore();
  return (
    <Link href="/cart" aria-label={`Cart${cartCount ? ` (${cartCount} items)` : ""}`} className={className}>
      <BasketIcon />
      {cartCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#CB843B] text-white text-[11px] font-bold flex items-center justify-center">
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      )}
    </Link>
  );
}

export function ThemeToggle({ className }: { className: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" aria-label="Toggle theme" onClick={toggle} className={className}>
      <span className="transition-all duration-300 text-yellow-400">
        {theme === "dark" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </span>
    </button>
  );
}
