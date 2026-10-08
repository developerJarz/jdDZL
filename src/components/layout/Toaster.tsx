"use client";

import { useStore } from "@/context/store";

/** Minimal toast (the reference used react-hot-toast, top-center). */
export function Toaster() {
  const { toast } = useStore();
  return (
    <div aria-live="polite" className="fixed z-[2000] top-4 left-4 right-4 flex justify-center pointer-events-none">
      {toast && (
        <div className="pointer-events-auto bg-white dark:bg-[#2e2b28] text-[#222] dark:text-white text-sm font-medium rounded-lg shadow-[0_3px_10px_rgba(0,0,0,0.1),0_3px_3px_rgba(0,0,0,0.05)] px-4 py-2.5 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#61d345] text-white flex items-center justify-center text-xs">✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
