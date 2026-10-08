"use client";

import Link from "next/link";
import { useState } from "react";
import { SearchIcon, TruckIcon } from "@/components/icons";
import { trackOrder } from "@/services/forms";

export function OrderTracking() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="max-w-xl mx-auto text-center">
      <span className="inline-flex w-14 h-14 rounded-xl bg-[#F3EDE6] text-[#6D3F0E] items-center justify-center">
        <TruckIcon width={24} height={24} />
      </span>
      <h1 className="mt-4 text-2xl font-bold text-[#101518] dark:text-white">Track Your Order</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">Enter your order number to see real-time status, timeline, and delivery details.</p>
      <form
        className="mt-6 flex items-center gap-2 bg-white dark:bg-[#2a2420] border border-gray-200 dark:border-gray-700 rounded-xl p-1.5 shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setResult(await trackOrder(value));
        }}
      >
        <label htmlFor="order-no" className="sr-only">
          Order number
        </label>
        <input id="order-no" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. DECO-68B43-02052" required className="flex-1 min-w-0 bg-transparent px-3 h-10 text-sm outline-none dark:text-white" />
        <button type="submit" className="flex items-center gap-1.5 bg-[#6D3F0E] text-white text-sm font-semibold rounded-lg px-5 h-10 hover:bg-[#5a330b]">
          <SearchIcon width={14} height={14} />
          Track
        </button>
      </form>
      <p className="mt-2 text-left text-xs text-gray-400">
        Example: <span className="font-semibold text-gray-600 dark:text-gray-300">DECO-68B43-02052</span>
      </p>
      <div className="mt-12 bg-white dark:bg-[#2a2420] border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm">
        <span className="inline-flex w-12 h-12 rounded-full bg-[#F3EDE6] items-center justify-center text-[#6D3F0E]" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </span>
        {result ? (
          <>
            <p className="mt-4 font-semibold text-[#101518] dark:text-white">{result.ok ? "Order found" : "Unable to track"}</p>
            <p className={"mt-2 text-sm " + (result.ok ? "text-green-600" : "text-gray-500 dark:text-gray-300")}>{result.message}</p>
          </>
        ) : (
          <>
            <p className="mt-4 font-semibold text-[#101518] dark:text-white">Enter Order Number</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
              Type your order number above and click <strong className="text-gray-700 dark:text-white">Track</strong> to view status, address, and delivery details.
            </p>
          </>
        )}
      </div>
      <Link href="/" className="inline-block mt-10 text-sm text-gray-500 hover:text-gray-700">
        ‹ Back to Home
      </Link>
    </div>
  );
}
