"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** "91 Day : 07 Hours : 18 Min : 08 Sec" pills used on offer cards and campaign pages. */
export function OfferCountdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start ticking after hydration
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ms = now === null ? 0 : Math.max(0, new Date(endsAt).getTime() - now);
  const s = Math.floor(ms / 1000);
  const parts = [
    { v: Math.floor(s / 86400), label: "Day", raw: true },
    { v: Math.floor((s % 86400) / 3600), label: "Hours" },
    { v: Math.floor((s % 3600) / 60), label: "Min" },
    { v: s % 60, label: "Sec" },
  ];
  if (now !== null && ms === 0) return <span className="text-sm font-semibold text-red-500">Offer ended</span>;

  return (
    <span className={"flex items-center gap-1 flex-wrap " + (now === null ? "invisible" : "")} role="timer">
      {parts.map((p, i) => (
        <span key={p.label} className="flex items-center gap-1.5 dark:text-white">
          <span className="bg-[#6D3F0E] text-white font-medium rounded-md px-2.5 py-1 text-sm">
            {p.raw ? p.v : pad(p.v)} {p.label}
          </span>
          {i < parts.length - 1 && <span className="text-[#3d2000] dark:text-[#d4a97a] font-bold text-sm">:</span>}
        </span>
      ))}
    </span>
  );
}
