"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** Small accessible modal used for EMI / exchange / tool popups. */
export function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={"w-full bg-white dark:bg-[#2e2b28] rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 outline-none max-h-[90vh] overflow-y-auto " + (wide ? "sm:max-w-2xl" : "sm:max-w-md")}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#222] dark:text-white">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-700">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
