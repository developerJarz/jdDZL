"use client";

import { MinusIcon, PlusIcon } from "@/components/icons";

export function QuantityStepper({ value, onChange, max = 10 }: { value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-0 border border-[#EEEEEE] bg-[#FFFFFF] p-1 rounded-[10px]" role="group" aria-label="Quantity">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className="w-9 h-9 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 transition rounded-[10px]"
      >
        <MinusIcon className="dark:text-black" />
      </button>
      <output className="w-10 h-9 flex items-center justify-center text-sm font-bold text-gray-800 select-none" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="w-9 h-9 flex items-center justify-center border border-gray-300 bg-[#222222] hover:bg-[#222222]/80 disabled:opacity-40 transition text-white rounded-[10px]"
      >
        <PlusIcon />
      </button>
    </div>
  );
}
