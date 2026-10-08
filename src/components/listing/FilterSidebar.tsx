"use client";

import { useState } from "react";
import { ChevronUpIcon } from "@/components/icons";
import type { ListingFilters } from "@/lib/listing";
import type { FilterAttribute } from "@/types";
import { PriceRange } from "./PriceRange";

function Accordion({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 border-b border-gray-100 dark:border-gray-700/60 pb-4 last:border-b-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 bg-[#FDF3E7] dark:bg-orange-950/40 px-4 py-2 rounded-lg w-full flex justify-between items-center transition-colors duration-200">
          {title}
          <ChevronUpIcon className={"w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform " + (open ? "rotate-180" : "")} />
        </span>
      </button>
      {open && children}
    </div>
  );
}

function Check({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer select-none">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <span
        aria-hidden="true"
        className={
          "w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 mt-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#D4A97A] " +
          (checked ? "bg-[#6D3F0E] border-[#6D3F0E]" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800")
        }
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

export interface FilterSidebarProps {
  filters: ListingFilters;
  price: { min: number; max: number };
  attributes: FilterAttribute[];
  onChange: (f: ListingFilters) => void;
}

/** Budget / stock / attribute filters (desktop sidebar and mobile sheet share it). */
export function FilterPanel({ filters, price, attributes, onChange }: FilterSidebarProps) {
  const toggleStock = (s: "in" | "out") =>
    onChange({ ...filters, stock: filters.stock.includes(s) ? filters.stock.filter((x) => x !== s) : [...filters.stock, s] });

  const toggleAttr = (name: string, value: string) => {
    const cur = filters.attributes[name] ?? [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    onChange({ ...filters, attributes: { ...filters.attributes, [name]: next } });
  };

  return (
    <>
      {price.max > price.min && (
        <Accordion title="Budgets">
          <PriceRange
            min={price.min}
            max={price.max}
            value={[filters.minPrice ?? price.min, filters.maxPrice ?? price.max]}
            onChange={([lo, hi]) =>
              onChange({ ...filters, minPrice: lo <= price.min ? null : lo, maxPrice: hi >= price.max ? null : hi })
            }
          />
        </Accordion>
      )}
      <Accordion title="Stock Status">
        <div className="mt-3 flex flex-col gap-2.5">
          <Check label="Stock In" checked={filters.stock.includes("in")} onChange={() => toggleStock("in")} />
          <Check label="Stock Out" checked={filters.stock.includes("out")} onChange={() => toggleStock("out")} />
        </div>
      </Accordion>
      {attributes.map((a) => (
        <Accordion key={a.name} title={a.name}>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
            {a.values.map((v) => (
              <Check key={v} label={v} checked={(filters.attributes[a.name] ?? []).includes(v)} onChange={() => toggleAttr(a.name, v)} />
            ))}
          </div>
        </Accordion>
      ))}
    </>
  );
}

export function FilterSidebar(props: FilterSidebarProps) {
  return (
    <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto no-scrollbar w-full">
      <div className="bg-white dark:bg-[#3e3329] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 px-5 pt-5 pb-6 overflow-x-hidden">
        <FilterPanel {...props} />
      </div>
    </div>
  );
}
