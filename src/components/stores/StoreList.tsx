"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapIcon, SearchLucideIcon } from "@/components/icons";
import { Img } from "@/components/ui/Img";
import { cn } from "@/lib/format";
import { mapsUrl } from "@/lib/maps";
import type { Store, StoreDistrict } from "@/types";

// District tabs are filtered by the API on the reference (/stores?district_id=); the mock
// matches district names (and common spellings) against the store address instead.
const aliases: Record<string, string[]> = {
  chattogram: ["chattogram", "chittagong", "ctg"],
  dhaka: ["dhaka", "uttara", "bashundhara", "jamuna", "mirpur"],
  bogura: ["bogura", "bogra"],
  cumilla: ["cumilla", "comilla"],
};

function inDistrict(store: Store, label: string) {
  const key = label.toLowerCase();
  const words = aliases[key] ?? [key];
  const hay = `${store.address} ${store.name} ${store.slug}`.toLowerCase();
  return words.some((w) => hay.includes(w));
}

export function StoreList({ stores, districts }: { stores: Store[]; districts: StoreDistrict[] }) {
  const [district, setDistrict] = useState("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter(
      (s) => (district === "All" || inDistrict(s, district)) && (!q || `${s.name} ${s.address}`.toLowerCase().includes(q)),
    );
  }, [stores, district, query]);

  return (
    <>
      <div className="max-w-355 mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:px-12.5 px-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Districts">
          {districts.map((d) => (
            <button
              key={d.label}
              type="button"
              role="tab"
              aria-selected={district === d.label}
              onClick={() => setDistrict(d.label)}
              className={cn(
                "px-4 py-2 text-sm md:text-base rounded-lg transition-all duration-300",
                district === d.label ? "bg-[#E9CCAE] text-primary" : "bg-gray-100 dark:bg-[#2A2520] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333]",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-1/4">
          <SearchLucideIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6D3F0E]" />
          <label htmlFor="store-search" className="sr-only">
            Search store
          </label>
          <input
            id="store-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Store"
            className="text-[#222222] dark:text-white w-full bg-[#FAFAFA] dark:bg-[#1F1F1F] border border-[#E7E7E7] dark:border-[#333333] rounded-xl py-2 pr-4 pl-10 focus:outline-none focus:ring-2 focus:ring-[#6D3F0E]/50"
          />
        </div>
      </div>
      <div className="mt-8">
        <section className="bg-[#5c3a1e] py-5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-350 mx-auto">
            <h2 className="text-white text-xl font-bold mb-6 tracking-tight">Nearby Your Location</h2>
            {visible.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visible.map((s) => (
                  <article key={s.slug} className="bg-white dark:bg-[#1B1B1B] rounded-2xl overflow-hidden border border-gray-100 dark:border-[#2E2E2E] shadow-sm flex flex-col px-[19px] py-[22px]">
                    <div className="relative h-55 w-full overflow-hidden rounded-2xl bg-gray-100">
                      <Img asset={s.image} alt={s.name} fill sizes="(max-width: 768px) 100vw, 420px" className="object-cover transition-transform duration-500 hover:scale-105 rounded-2xl" />
                      <a
                        href={mapsUrl(s)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${s.name} on map`}
                        className="absolute bottom-3 left-3 flex items-center gap-1.5 border border-[#6D3F0E] bg-white/90 dark:bg-[#2A2A2A]/90 backdrop-blur-sm text-black dark:text-white text-sm font-medium px-3 py-2 rounded-[27px]"
                      >
                        <MapIcon />
                        View Map
                      </a>
                    </div>
                    <div className="pt-8 flex flex-col flex-1">
                      <Link href={`/shop-location/${s.slug}`}>
                        <h3 className="font-semibold text-[#222222] dark:text-white text-lg leading-tight min-h-12">{s.name}</h3>
                        <p className="text-sm text-[#747474] dark:text-gray-400 mt-2 min-h-15">{s.address}</p>
                      </Link>
                      <hr className="border-[#EEEEEE] dark:border-[#333333] my-2" />
                      <div className="mb-4 flex justify-between gap-4">
                        <div>
                          <p className="text-[#747474] dark:text-gray-400 uppercase text-sm">Day Off</p>
                          <p className="font-semibold text-[#6D3F0E] dark:text-[#D89B5C] mt-0.5">{s.dayOff || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[#747474] dark:text-gray-400 uppercase text-sm">Open Day</p>
                          <p className="font-semibold text-[#6D3F0E] dark:text-[#D89B5C] mt-0.5">{s.openHours || "—"}</p>
                        </div>
                      </div>
                      <Link
                        href={`/shop-location/${s.slug}`}
                        className="mt-auto flex items-center justify-between bg-[#222222] text-white rounded-[14px] px-[15px] py-3 text-sm font-semibold hover:bg-black"
                      >
                        See Details
                        <span aria-hidden="true">›</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-white/80 py-10 text-center">No stores match your search.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
