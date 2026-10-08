"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Flash-sale countdown pills (days : hours : minutes : seconds). */
export function Countdown({ endsAt, variant = "dark" }: { endsAt: string; variant?: "dark" | "light" }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // clock starts after hydration so server and client markup match
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const values = now === null ? [0, 0, 0, 0] : parts(new Date(endsAt).getTime() - now);
  const pill =
    variant === "dark"
      ? "bg-[#FFD07959] text-white"
      : "bg-[#6D3F0E] text-white";

  return (
    <div className={"flex flex-wrap items-center lg:gap-3 gap-1 " + (now === null ? "invisible" : "")} role="timer" aria-label="Offer ends in">
      {values.map((v, i) => (
        <span key={i} className="contents">
          {i > 0 && <span className={variant === "dark" ? "text-white" : "text-[#6D3F0E]"}>:</span>}
          <span className={"flex flex-col items-center rounded-xl px-[7px] py-[4px] shadow-md " + pill}>
            <span className="text-[14px] font-medium">{pad(v)}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
