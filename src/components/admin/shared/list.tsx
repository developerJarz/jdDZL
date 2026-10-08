"use client";
import * as React from "react";
import { useState } from "react";
import { CalendarRange, Minus, PackagePlus, Plus, X } from "lucide-react";
import { money, useApi } from "../lib/api";
import type { AdminProduct, PageResult } from "../lib/types";
import { Button } from "../ui/button";
import { Input, NativeSelect } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/menu";
import { ProductSearchDialog } from "./pickers";
import { Thumb } from "./kit";

/** Paginated `admin/<resource>` list with search, status and extra filters. */
export function useListPage<T>(resource: string, extra: Record<string, string> = {}, limit = 25) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ limit: String(limit), page: String(page), q: query, status, ...extra }).toString();
  const result = useApi<PageResult<T>>(`admin/${resource}?${params}`, 200);
  return {
    ...result,
    query,
    status,
    page,
    setPage,
    setQuery: (v: string) => {
      setQuery(v);
      setPage(1);
    },
    setStatus: (v: string) => {
      setStatus(v);
      setPage(1);
    },
  };
}

/* ---------------- Date range ---------------- */
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(d);
export interface Range {
  from: string;
  to: string;
}
export function presetRange(key: string): Range {
  const now = new Date();
  const today = ymd(now);
  const [y, m] = today.split("-").map(Number);
  const daysAgo = (n: number) => ymd(new Date(now.getTime() - n * 86400_000));
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: daysAgo(6), to: today };
    case "month":
      return { from: `${y}-${String(m).padStart(2, "0")}-01`, to: today };
    case "last-month": {
      const first = new Date(Date.UTC(m === 1 ? y - 1 : y, m === 1 ? 11 : m - 2, 1));
      const last = new Date(Date.UTC(y, m - 1, 0));
      return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
    }
    case "year":
      return { from: `${y}-01-01`, to: today };
    default:
      return { from: daysAgo(29), to: today };
  }
}
const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "year", label: "This year" },
];

export function DateRangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const label = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const fmt = (d: string) => label.format(new Date(d + "T00:00:00"));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start">
          <CalendarRange /> {fmt(value.from)} – {fmt(value.to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <Button key={p.key} type="button" size="sm" variant="ghost" className="justify-start" onClick={() => onChange(presetRange(p.key))}>
              {p.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs font-semibold">
            From
            <Input type="date" value={value.from} max={value.to} onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            To
            <Input type="date" value={value.to} min={value.from} onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })} />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Order / purchase line editor ---------------- */
export interface Line {
  slug: string;
  name: string;
  image: AdminProduct["image"];
  variant: string;
  qty: number;
  /** Unit price (orders) or unit cost (purchases). */
  price: number;
  /** Available variant keys when the product tracks stock per variant. */
  variants: { key: string; stock: number; price: number | null }[];
  stock: number;
}

export function lineFromProduct(p: Partial<AdminProduct> & { slug: string; name: string }, mode: "sale" | "cost" = "sale"): Line {
  const variants = p.trackVariants ? (p.variantStock ?? []).map((v) => ({ key: v.key, stock: v.stock, price: v.price })) : [];
  const first = variants.find((v) => v.stock > 0) ?? variants[0];
  return {
    slug: p.slug,
    name: p.name,
    image: p.image ?? null,
    variant: first?.key ?? "",
    qty: 1,
    price: mode === "cost" ? (p.costPrice ?? 0) : (first?.price || p.price || 0),
    variants,
    stock: first?.stock ?? p.stock ?? 0,
  };
}

export function LineEditor({
  lines,
  onChange,
  priceLabel = "Unit price",
  showStock = true,
  pickerTitle = "Add products",
}: {
  lines: Line[];
  onChange: (lines: Line[]) => void;
  priceLabel?: string;
  showStock?: boolean;
  pickerTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const update = (i: number, patch: Partial<Line>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="grid gap-2">
      {lines.length ? (
        <div className="divide-y rounded-xl border">
          {lines.map((l, i) => (
            <div key={`${l.slug}-${i}`} className="grid grid-cols-[auto_1fr] items-center gap-3 p-2.5 sm:grid-cols-[auto_1fr_auto_auto_auto]">
              <Thumb image={l.image} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{l.name}</p>
                {l.variants.length ? (
                  <NativeSelect
                    aria-label="Variant"
                    value={l.variant}
                    className="mt-1 h-8 w-auto text-xs"
                    onChange={(e) => {
                      const v = l.variants.find((x) => x.key === e.target.value);
                      update(i, { variant: e.target.value, stock: v?.stock ?? 0, ...(v?.price ? { price: v.price } : {}) });
                    }}
                  >
                    {l.variants.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.key} · {v.stock} in stock
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  showStock && <p className="text-xs text-muted-foreground">{l.stock} in stock</p>
                )}
              </div>
              <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
                <Button type="button" size="icon-sm" variant="outline" aria-label="Decrease quantity" onClick={() => update(i, { qty: Math.max(1, l.qty - 1) })}>
                  <Minus />
                </Button>
                <Input type="number" min={1} aria-label="Quantity" value={l.qty} onChange={(e) => update(i, { qty: Math.max(1, Math.floor(Number(e.target.value)) || 1) })} className="h-8 w-16 text-center tabular-nums" />
                <Button type="button" size="icon-sm" variant="outline" aria-label="Increase quantity" onClick={() => update(i, { qty: l.qty + 1 })}>
                  <Plus />
                </Button>
              </div>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="sr-only">{priceLabel}</span>৳
                <Input type="number" min={0} aria-label={priceLabel} value={l.price} onChange={(e) => update(i, { price: Math.max(0, Number(e.target.value) || 0) })} className="h-8 w-24 tabular-nums" />
              </label>
              <div className="flex items-center justify-end gap-2">
                <span className="w-24 text-right text-sm font-bold tabular-nums">{money(l.price * l.qty)}</span>
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove line" onClick={() => onChange(lines.filter((_, j) => j !== i))}>
                  <X />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No items yet.</p>
      )}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setOpen(true)}>
        <PackagePlus /> {pickerTitle}
      </Button>
      <ProductSearchDialog
        open={open}
        onOpenChange={setOpen}
        title={pickerTitle}
        onPick={(products) => onChange([...lines, ...products.map((p) => lineFromProduct(p as AdminProduct, priceLabel === "Unit cost" ? "cost" : "sale"))])}
      />
    </div>
  );
}
