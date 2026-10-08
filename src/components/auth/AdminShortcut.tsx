"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Shown to administrators and staff on the storefront so they can jump to the dashboard. */
export function AdminShortcut({ role: known, className = "" }: { role?: string; className?: string }) {
  const [role, setRole] = useState(known ?? "");
  useEffect(() => {
    if (known) return;
    let alive = true;
    fetch("/api/commerce/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => alive && setRole(r.user?.role ?? ""))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [known]);
  if (role !== "admin" && role !== "staff") return null;
  return (
    <Link
      href="/admin"
      className={
        "flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#6d3f0e_0%,#a8661f_60%,#cb843b_100%)] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-110 " +
        className
      }
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
      Go to admin dashboard
    </Link>
  );
}
