"use client";

import { useState } from "react";
import { formatPlain } from "@/lib/format";

/** Dual-thumb budget slider with the reference's striped "barcode" track. */
export function PriceRange({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  // local copy only while the user is dragging; otherwise mirror the committed value
  const [drag, setLocal] = useState<[number, number] | null>(null);
  const local = drag ?? value;

  const span = Math.max(1, max - min);
  const pct = (n: number) => ((n - min) / span) * 100;
  const left = pct(local[0]);
  const right = pct(local[1]);
  const step = Math.max(10, Math.round(span / 200 / 10) * 10);
  const commit = () => {
    if (drag) onChange(drag);
    setLocal(null);
  };
  const thumb =
    "absolute inset-0 w-full h-10 appearance-none bg-transparent pointer-events-none cursor-grab [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gray-900 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white dark:[&::-webkit-slider-thumb]:bg-gray-100";

  return (
    <div className="mt-4">
      <div className="relative h-10 flex items-center mb-5 select-none">
        <div
          className="absolute inset-x-0 h-7.5 overflow-hidden rounded-md"
          style={{ background: "repeating-linear-gradient(90deg, #6b7280 0px, #6b7280 3px, #e5e7eb 3px, #e5e7eb 6px)" }}
        >
          <div
            className="absolute top-0 h-full"
            style={{
              left: `${left}%`,
              width: `${Math.max(0, right - left)}%`,
              background: "repeating-linear-gradient(90deg, #111 0px, #111 3px, #e5e7eb 3px, #e5e7eb 6px)",
            }}
          />
          <div className="absolute top-0 h-full bg-gray-200 dark:bg-gray-700" style={{ left: 0, width: `${left}%` }} />
          <div className="absolute top-0 h-full bg-gray-200 dark:bg-gray-700" style={{ left: `${right}%`, right: 0 }} />
        </div>
        <input
          type="range"
          aria-label="Minimum price"
          min={min}
          max={max}
          step={step}
          value={local[0]}
          onChange={(e) => setLocal([Math.min(Number(e.target.value), local[1]), local[1]])}
          onPointerUp={commit}
          onKeyUp={commit}
          className={thumb + " z-10"}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={min}
          max={max}
          step={step}
          value={local[1]}
          onChange={(e) => setLocal([local[0], Math.max(Number(e.target.value), local[0])])}
          onPointerUp={commit}
          onKeyUp={commit}
          className={thumb + " z-20"}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 border border-gray-200 dark:border-[#241b14] rounded-xl px-3 py-2.5 text-center bg-white dark:bg-[#3e3329] shadow-sm">
          <p className="text-[10px] text-gray-400 dark:text-white mb-0.5 tracking-wide">Minimum</p>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">৳{formatPlain(local[0])}</p>
        </div>
        <span className="text-gray-400 dark:text-gray-500 font-bold text-base">-</span>
        <div className="flex-1 border border-gray-200 dark:border-[#241b14] rounded-xl px-3 py-2.5 text-center bg-white dark:bg-[#3e3329] shadow-sm">
          <p className="text-[10px] text-gray-400 dark:text-white mb-0.5 tracking-wide">Maximum</p>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">৳{formatPlain(local[1])}</p>
        </div>
      </div>
    </div>
  );
}
