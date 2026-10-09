"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Globe,
  ImageIcon,
  Layers,
  Lock,
  Minus,
  MoreHorizontal,
  Package,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import type { ImageAsset } from "@/types";
import { cn } from "../lib/utils";
import { api, money, send, slugify, useApi } from "../lib/api";
import type { AdminProduct } from "../lib/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input, Textarea } from "../ui/input";
import { Separator, Skeleton, Switch } from "../ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Popover, PopoverContent, PopoverTrigger } from "../ui/menu";
import { ErrorNote, Field, Spinner, StatusBadge, useConfirm } from "../shared/kit";
import { GalleryField } from "../shared/media";
import { Combobox, CreateBrandDialog, CreateCategoryDialog, useTaxonomy } from "../shared/pickers";
import { DragHandle, SortableList } from "../shared/sortable";
import { refreshBadges } from "../AdminShell";

interface Variant {
  name: string;
  options: { value: string; imageIndex: number; hex?: string }[];
}
interface VariantStockRow {
  key: string;
  stock: string;
  price: string;
  cost: string;
  sku: string;
  barcode: string;
}
interface Form {
  name: string;
  slug: string;
  code: string;
  price: string;
  regularPrice: string;
  costPrice: string;
  stock: string;
  brandSlug: string | null;
  brandName: string | null;
  categorySlugs: string[];
  subCategorySlugs: string[];
  childCategorySlugs: string[];
  barcode: string;
  lowStockThreshold: string;
  freeShipping: boolean;
  trackVariants: boolean;
  variantStock: VariantStockRow[];
  images: ImageAsset[];
  badge: string;
  recognitionBadge: string;
  active: boolean;
  isTba: boolean;
  endOfLife: boolean;
  allowPreOrder: boolean;
  isBestDeal: boolean;
  shortDescription: string;
  description: string;
  variants: Variant[];
  specs: { id: string; label: string; value: string }[];
  seo: { title: string; description: string; keywords: string };
  carePlans: { id: string; title: string; coverage: string; price: string }[];
}

const RIBBONS = ["🔥 Hot Product", "New Arrival", "Top Selling", "Customers Choice", "High Demand", "Limited Stock"];
const RECOGNITION = ["", "Official", "Offer Running", "Exclusive", "Best Price"];
const uid = () => Math.random().toString(36).slice(2, 10);

const emptyForm = (): Form => ({
  name: "",
  slug: "",
  code: "",
  price: "",
  regularPrice: "",
  costPrice: "",
  stock: "0",
  brandSlug: null,
  brandName: null,
  categorySlugs: [],
  subCategorySlugs: [],
  childCategorySlugs: [],
  barcode: "",
  lowStockThreshold: "",
  freeShipping: false,
  trackVariants: false,
  variantStock: [],
  images: [],
  badge: "",
  recognitionBadge: "",
  active: true,
  isTba: false,
  endOfLife: false,
  allowPreOrder: false,
  isBestDeal: false,
  shortDescription: "",
  description: "",
  variants: [],
  specs: [],
  seo: { title: "", description: "", keywords: "" },
  carePlans: [],
});

function fromProduct(p: AdminProduct): Form {
  return {
    name: p.name,
    slug: p.slug,
    code: p.code,
    price: String(p.price ?? 0),
    regularPrice: String(p.regularPrice ?? 0),
    costPrice: p.costPrice !== undefined ? String(p.costPrice) : "",
    stock: String(p.stock ?? 0),
    brandSlug: p.brandSlug,
    brandName: p.brandName,
    categorySlugs: p.categorySlugs ?? [],
    subCategorySlugs: p.subCategorySlugs ?? [],
    childCategorySlugs: p.childCategorySlugs ?? [],
    barcode: p.barcode ?? "",
    lowStockThreshold: p.lowStockThreshold != null ? String(p.lowStockThreshold) : "",
    freeShipping: Boolean(p.freeShipping),
    trackVariants: Boolean(p.trackVariants),
    variantStock: (p.variantStock ?? []).map((v) => ({
      key: v.key,
      stock: String(v.stock),
      price: v.price != null ? String(v.price) : "",
      cost: v.cost != null ? String(v.cost) : "",
      sku: v.sku ?? "",
      barcode: v.barcode ?? "",
    })),
    images: p.images?.length ? p.images : p.image ? [p.image] : [],
    badge: p.badge ?? "",
    recognitionBadge: ["Coming Soon", "Discontinued"].includes(p.recognitionBadge) ? "" : (p.recognitionBadge ?? ""),
    active: p.active !== false,
    isTba: Boolean(p.isTba),
    endOfLife: Boolean(p.endOfLife),
    allowPreOrder: Boolean(p.allowPreOrder),
    isBestDeal: Boolean(p.isBestDeal),
    shortDescription: p.shortDescription ?? "",
    description: p.description ?? "",
    variants: p.variants ?? [],
    specs: (p.specs ?? []).map((s) => ({ ...s, id: uid() })),
    seo: { title: p.seo?.title ?? "", description: p.seo?.description ?? "", keywords: p.seo?.keywords ?? "" },
    carePlans: (p.carePlans ?? []).map((c) => ({ ...c, price: String(c.price) })),
  };
}

function Section({
  icon: Icon,
  title,
  description,
  children,
  action,
  id,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader className="flex flex-row items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary dark:text-brand">
          <Icon className="size-4" />
        </span>
        <div className="flex-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border px-3.5 py-3 transition hover:bg-muted/40">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </label>
  );
}

function MoneyInput({ value, onChange, id, placeholder, disabled }: { value: string; onChange: (v: string) => void; id?: string; placeholder?: string; disabled?: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-muted-foreground">৳</span>
      <Input
        id={id}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder ?? "0"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-7 tabular-nums"
      />
    </div>
  );
}

/** Colours and sizes from the shared library (Catalog → Colors & sizes). */
function useAttributeLibrary() {
  const colors = useApi<{ items: { name: string; hex: string }[] }>("admin/colors?limit=200");
  const sizes = useApi<{ items: { name: string; group: string }[] }>("admin/sizes?limit=200");
  return { colors: colors.data?.items ?? [], sizes: sizes.data?.items ?? [] };
}

/** Every combination of the variant groups, in group order: "Black / 128GB". */
function variantKeys(variants: Variant[]) {
  const groups = variants.filter((g) => g.name.trim() && g.options.length);
  if (!groups.length) return [];
  return groups.reduce<string[]>((keys, g) => keys.flatMap((k) => g.options.map((o) => (k ? `${k} / ${o.value}` : o.value))), [""]);
}

function VariantStockMatrix({ form, set }: { form: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void }) {
  const keys = variantKeys(form.variants);
  const rows = keys.map((key) => form.variantStock.find((r) => r.key === key) ?? { key, stock: "0", price: "", cost: "", sku: "", barcode: "" });
  const write = (key: string, patch: Partial<VariantStockRow>) => set("variantStock", rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const [bulk, setBulk] = useState("");
  if (!keys.length) return null;
  return (
    <div className="grid gap-3 rounded-xl border p-3.5">
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-bold">Track stock per variant</span>
          <span className="text-xs text-muted-foreground">Each combination gets its own quantity, optional price, SKU and barcode. Product stock becomes their total.</span>
        </span>
        <Switch
          checked={form.trackVariants}
          onCheckedChange={(v) => {
            set("trackVariants", v);
            if (v) set("variantStock", rows);
          }}
        />
      </label>
      {form.trackVariants && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">{keys.length} combinations ·</span>
            <Input type="number" min={0} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="Qty" className="h-8 w-20" aria-label="Quantity for all" />
            <Button type="button" size="sm" variant="outline" disabled={bulk === ""} onClick={() => set("variantStock", rows.map((r) => ({ ...r, stock: bulk })))}>
              Set all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => set("variantStock", rows.map((r) => ({ ...r, sku: r.sku || `${form.code}-${r.key.replace(/[^a-z0-9]+/gi, "").toUpperCase().slice(0, 12)}` })))}
            >
              <Wand2 /> Generate SKUs
            </Button>
          </div>
          <div className="admin-scroll max-h-96 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Variant</th>
                  <th className="px-2 py-2 text-left">Stock</th>
                  <th className="px-2 py-2 text-left">Price</th>
                  <th className="px-2 py-2 text-left">Cost</th>
                  <th className="px-2 py-2 text-left">SKU</th>
                  <th className="px-2 py-2 text-left">Barcode</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="px-3 py-1.5 font-semibold whitespace-nowrap">{r.key}</td>
                    <td className="px-2 py-1.5">
                      <Input type="number" min={0} aria-label={`Stock for ${r.key}`} value={r.stock} onChange={(e) => write(r.key, { stock: e.target.value })} className="h-8 w-20 tabular-nums" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" min={0} aria-label={`Price for ${r.key}`} value={r.price} placeholder={form.price || "—"} onChange={(e) => write(r.key, { price: e.target.value })} className="h-8 w-24 tabular-nums" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" min={0} aria-label={`Cost for ${r.key}`} value={r.cost} placeholder={form.costPrice || "—"} onChange={(e) => write(r.key, { cost: e.target.value })} className="h-8 w-24 tabular-nums" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input aria-label={`SKU for ${r.key}`} value={r.sku} onChange={(e) => write(r.key, { sku: e.target.value })} className="h-8 w-36 font-mono text-xs" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input aria-label={`Barcode for ${r.key}`} value={r.barcode} onChange={(e) => write(r.key, { barcode: e.target.value })} className="h-8 w-36 font-mono text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Total stock: <strong className="text-foreground tabular-nums">{rows.reduce((sum, r) => sum + (Number(r.stock) || 0), 0)}</strong>. Leave price empty to use the product price.
          </p>
        </>
      )}
    </div>
  );
}

function VariantEditor({ variants, images, onChange }: { variants: Variant[]; images: ImageAsset[]; onChange: (v: Variant[]) => void }) {
  const library = useAttributeLibrary();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const update = (i: number, patch: Partial<Variant>) => onChange(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const addOption = (i: number) => {
    const values = (drafts[i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!values.length) return;
    const existing = new Set(variants[i].options.map((o) => o.value.toLowerCase()));
    update(i, { options: [...variants[i].options, ...values.filter((v) => !existing.has(v.toLowerCase())).map((value) => ({ value, imageIndex: 0 }))].slice(0, 24) });
    setDrafts((d) => ({ ...d, [i]: "" }));
  };
  return (
    <div className="grid gap-3">
      {variants.map((group, i) => (
        <div key={i} className="rounded-xl border bg-muted/20 p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <Input
              value={group.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Option name, e.g. Color or Storage"
              aria-label="Variant group name"
              className="max-w-xs font-semibold"
            />
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove variant group" className="ml-auto text-destructive" onClick={() => onChange(variants.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.options.map((o, k) => (
              <div key={o.value} className="flex items-center gap-1.5 rounded-lg border bg-card py-1 pr-1 pl-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" aria-label={`Image for ${o.value}`} className="relative size-7 overflow-hidden rounded-md border bg-white">
                      {images[o.imageIndex] ? (
                        <Image src={images[o.imageIndex].src} alt="" fill sizes="28px" className="object-contain" />
                      ) : (
                        <ImageIcon className="m-auto size-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <p className="mb-2 text-xs font-semibold">Image shown when “{o.value}” is selected</p>
                    {images.length ? (
                      <div className="grid grid-cols-4 gap-1.5">
                        {images.map((img, idx) => (
                          <button
                            key={img.src}
                            type="button"
                            onClick={() => update(i, { options: group.options.map((x, j) => (j === k ? { ...x, imageIndex: idx } : x)) })}
                            className={cn("relative aspect-square overflow-hidden rounded-md border-2 bg-white", o.imageIndex === idx ? "border-brand" : "border-transparent")}
                          >
                            <Image src={img.src} alt="" fill sizes="56px" className="object-contain" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Add gallery images first.</p>
                    )}
                  </PopoverContent>
                </Popover>
                {o.hex && <span className="size-4 rounded-full border border-black/10" style={{ background: o.hex }} aria-hidden="true" />}
                <span className="text-sm font-medium">{o.value}</span>
                <button type="button" aria-label={`Remove ${o.value}`} onClick={() => update(i, { options: group.options.filter((_, j) => j !== k) })} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={drafts[i] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [i]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOption(i);
                  }
                }}
                placeholder="Add values (comma-separated)"
                aria-label="Add variant values"
                className="h-9 w-56"
              />
              <Button type="button" size="icon" variant="outline" aria-label="Add value" onClick={() => addOption(i)}>
                <Plus />
              </Button>
            </div>
            <div className="w-56">
              <Combobox
                multiple
                placeholder={/colou?r/i.test(group.name) ? "From colour library…" : "From size library…"}
                options={
                  /colou?r/i.test(group.name)
                    ? library.colors.map((c) => ({ value: c.name, label: c.name, hint: c.hex }))
                    : library.sizes.map((z) => ({ value: z.name, label: z.name, hint: z.group }))
                }
                value={group.options.map((o) => o.value)}
                onChange={(values) => {
                  const kept = group.options.filter((o) => values.includes(o.value));
                  const added = values
                    .filter((v) => !group.options.some((o) => o.value === v))
                    .map((value) => {
                      const color = library.colors.find((c) => c.name === value);
                      return { value, imageIndex: 0, ...(color ? { hex: color.hex } : {}) };
                    });
                  update(i, { options: [...kept, ...added].slice(0, 24) });
                }}
              />
            </div>
          </div>
        </div>
      ))}
      {variants.length < 4 && (
        <Button type="button" variant="outline" className="w-fit" onClick={() => onChange([...variants, { name: variants.length ? "" : "Color", options: [] }])}>
          <Plus /> Add variant option
        </Button>
      )}
    </div>
  );
}

function SpecsEditor({ specs, onChange }: { specs: Form["specs"]; onChange: (s: Form["specs"]) => void }) {
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");
  return (
    <div className="grid gap-2">
      {specs.length > 0 && (
        <SortableList items={specs} getId={(s) => s.id} onChange={onChange} className="grid gap-1.5">
          {(spec, i, handle) => (
            <div className="flex items-center gap-1.5">
              <DragHandle {...handle} />
              <Input
                value={spec.label}
                onChange={(e) => onChange(specs.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)))}
                placeholder="Display"
                aria-label="Specification name"
                className="w-[38%] font-medium"
              />
              <Input
                value={spec.value}
                onChange={(e) => onChange(specs.map((s, j) => (j === i ? { ...s, value: e.target.value } : s)))}
                placeholder='6.1" Super Retina XDR'
                aria-label="Specification value"
              />
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove specification" onClick={() => onChange(specs.filter((_, j) => j !== i))}>
                <X />
              </Button>
            </div>
          )}
        </SortableList>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={specs.length >= 60} onClick={() => onChange([...specs, { id: uid(), label: "", value: "" }])}>
          <Plus /> Add row
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPasting(true)}>
          <ClipboardPaste /> Paste many
        </Button>
      </div>
      <Dialog open={pasting} onOpenChange={setPasting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste specifications</DialogTitle>
            <DialogDescription>One per line, as “Name: Value” or tab-separated (copied from a spreadsheet).</DialogDescription>
          </DialogHeader>
          <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Display: 6.1-inch OLED\nChip: A18 Pro\nBattery: 3,582 mAh"} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasting(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const rows = text
                  .split(/\r?\n/)
                  .map((line) => line.split(/\t|:\s?(.*)/).filter((x) => x !== undefined && x !== ""))
                  .filter((parts) => parts.length >= 2 && parts[0].trim())
                  .map(([label, ...rest]) => ({ id: uid(), label: label.trim().slice(0, 80), value: rest.join(" ").trim().slice(0, 500) }))
                  .filter((r) => r.value);
                onChange([...specs, ...rows].slice(0, 60));
                setText("");
                setPasting(false);
                toast.success(`${rows.length} specifications added`);
              }}
            >
              Add rows
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Mirrors the storefront product card so editors see the result before publishing. */
function CardPreview({ form }: { form: Form }) {
  const price = Number(form.price) || 0;
  const regular = Number(form.regularPrice) || 0;
  const discount = regular > price && regular ? Math.round((1 - price / regular) * 100) : 0;
  return (
    <div className="overflow-hidden rounded-2xl border bg-white text-[#222] shadow-sm dark:bg-[#25221f] dark:text-white">
      <div className="relative aspect-square bg-[#f5f5f5] dark:bg-[#342a20]">
        {form.images[0] ? (
          <Image src={form.images[0].src} alt="" fill sizes="300px" className="object-contain p-5" />
        ) : (
          <Package className="absolute inset-0 m-auto size-10 text-[#cfc2b2]" />
        )}
        {form.badge && (
          <span className="absolute top-3 left-0 rounded-r-full bg-[linear-gradient(90deg,#6d3f0e,#cb843b)] px-3 py-1 text-[11px] font-bold text-white">{form.badge}</span>
        )}
        {(form.isTba || form.endOfLife || form.recognitionBadge) && (
          <span className="absolute top-3 right-3 rounded-full bg-[#222] px-2.5 py-1 text-[10px] font-semibold text-white">
            {form.isTba ? "Coming Soon" : form.endOfLife ? "Discontinued" : form.recognitionBadge}
          </span>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <p className="line-clamp-2 min-h-10 text-sm font-semibold">{form.name || "Product name"}</p>
        {form.isTba ? (
          <p className="text-sm font-bold text-[#cb843b]">Price coming soon</p>
        ) : (
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-base font-extrabold">{money(price)}</span>
            {discount > 0 && (
              <>
                <s className="text-xs text-[#888]">{money(regular)}</s>
                <span className="text-xs font-bold text-[#cb843b]">−{discount}%</span>
              </>
            )}
          </p>
        )}
        <p className="text-xs text-[#777] dark:text-[#bbb]">
          {form.endOfLife ? "Discontinued" : form.isTba ? "Pre-launch" : Number(form.stock) > 0 ? "In stock" : form.allowPreOrder ? "Pre-order" : "Out of stock"}
        </p>
      </div>
    </div>
  );
}

export function ProductEditor({ id }: { id: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const confirm = useConfirm();
  const { taxonomy } = useTaxonomy();
  const source = id ?? params.get("from");
  const [form, setForm] = useState<Form | null>(source ? null : emptyForm());
  const [baseline, setBaseline] = useState<string>(source ? "" : JSON.stringify(emptyForm()));
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [ordered, setOrdered] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [creating, setCreating] = useState<{ kind: "category" | "sub" | "brand"; name: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!source) return;
    let alive = true;
    api<{ item: AdminProduct; ordered: number }>(`admin/products/${source}`)
      .then(({ item, ordered }) => {
        if (!alive) return;
        let next = fromProduct(item);
        if (!id) {
          // Duplicate: a fresh draft with a unique slug/SKU and no stock.
          next = { ...next, name: `${item.name} (copy)`, slug: `${item.slug}-copy`, code: `${item.code}-COPY`, stock: "0", active: false };
          setBaseline(JSON.stringify(emptyForm()));
        } else {
          setProduct(item);
          setOrdered(ordered);
          setBaseline(JSON.stringify(next));
        }
        setForm(next);
      })
      .catch((err: Error) => alive && setLoadError(err.message));
    return () => {
      alive = false;
    };
  }, [source, id]);

  const set = useCallback(<K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f)), []);
  const dirty = form ? JSON.stringify(form) !== baseline : false;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const childOptions = useMemo(
    () =>
      taxonomy.categories
        .filter((c) => form?.categorySlugs.includes(c.slug))
        .flatMap((c) => c.subCategories.filter((s) => form?.subCategorySlugs.includes(s.slug)).flatMap((s) => (s.children ?? []).map((k) => ({ value: k.slug, label: k.name, hint: s.name })))),
    [taxonomy.categories, form?.categorySlugs, form?.subCategorySlugs],
  );
  const subOptions = useMemo(
    () =>
      taxonomy.categories
        .filter((c) => form?.categorySlugs.includes(c.slug))
        .flatMap((c) => c.subCategories.map((s) => ({ value: s.slug, label: s.name, hint: c.name }))),
    [taxonomy.categories, form?.categorySlugs],
  );

  if (loadError) return <ErrorNote message={loadError} />;
  if (!form)
    return (
      <div className="space-y-4" role="status" aria-label="Loading product">
        <Skeleton className="h-14 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-[600px] rounded-2xl" />
          <Skeleton className="h-[600px] rounded-2xl" />
        </div>
      </div>
    );

  const price = Number(form.price) || 0;
  const regular = Number(form.regularPrice) || 0;
  const cost = form.costPrice === "" ? null : Number(form.costPrice);
  const discount = regular > price && regular ? Math.round((1 - price / regular) * 100) : 0;
  const margin = cost !== null && price > 0 ? ((price - cost) / price) * 100 : null;
  const firstParent = taxonomy.categories.find((c) => c.slug === form.categorySlugs[0]);
  const seoTitle = form.seo.title || `${form.name || "Product"} Price in Bangladesh`;
  const seoDescription =
    form.seo.description || form.shortDescription || `Explore ${form.name || "this product"} at dazzle.bd. Compare the listed price in Bangladesh, selected options and availability.`;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ignore submits bubbling from dialogs rendered inside this form (React portals).
    if (e.target !== e.currentTarget) return;
    setError("");
    if (regular < price) {
      setError("Regular price must be at least the sale price. Leave regular price equal to the sale price when there is no discount.");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      code: form.code,
      price,
      regularPrice: regular || price,
      ...(cost !== null ? { costPrice: cost } : {}),
      stock: Math.max(0, Math.floor(Number(form.stock) || 0)),
      expectedStock: product?.stock,
      brandSlug: form.brandSlug,
      brandName: form.brandName,
      categorySlugs: form.categorySlugs,
      subCategorySlugs: form.subCategorySlugs.filter((s) => subOptions.some((o) => o.value === s)),
      childCategorySlugs: form.childCategorySlugs.filter((s) => childOptions.some((o) => o.value === s)),
      barcode: form.barcode.trim(),
      lowStockThreshold: form.lowStockThreshold === "" ? null : Math.max(0, Math.floor(Number(form.lowStockThreshold) || 0)),
      freeShipping: form.freeShipping,
      trackVariants: form.trackVariants && variantKeys(form.variants).length > 0,
      variantStock: form.trackVariants
        ? variantKeys(form.variants).map((key) => {
            const r = form.variantStock.find((x) => x.key === key);
            return {
              key,
              stock: Math.max(0, Math.floor(Number(r?.stock) || 0)),
              price: r?.price ? Number(r.price) : null,
              cost: r?.cost ? Number(r.cost) : null,
              sku: r?.sku?.trim() ?? "",
              barcode: r?.barcode?.trim() ?? "",
            };
          })
        : [],
      images: form.images,
      badge: form.badge,
      recognitionBadge: form.recognitionBadge,
      active: form.active,
      isTba: form.isTba,
      endOfLife: form.endOfLife,
      allowPreOrder: form.allowPreOrder,
      isBestDeal: form.isBestDeal,
      shortDescription: form.shortDescription || (product?.shortDescription !== undefined ? "" : undefined),
      // Imported products keep their original rich description until one is written here.
      description: form.description || (product?.description !== undefined ? "" : undefined),
      variants: form.variants.filter((v) => v.name.trim() && v.options.length),
      specs: form.specs.filter((s) => s.label.trim() && s.value.trim()).map(({ label, value }) => ({ label, value })),
      seo: form.seo,
      carePlans: form.carePlans
        .filter((c) => c.title.trim())
        .map((c, i) => ({ id: c.id || `care-${i + 1}`, title: c.title, coverage: c.coverage, price: Number(c.price) || 0 })),
    };
    try {
      if (id) {
        await send(`admin/products/${id}`, payload, "PATCH");
        const fresh = await api<{ item: AdminProduct; ordered: number }>(`admin/products/${id}`);
        const next = fromProduct(fresh.item);
        setProduct(fresh.item);
        setForm(next);
        setBaseline(JSON.stringify(next));
        toast.success("Product saved", { description: form.active ? "Changes are live in the storefront." : "Saved as archived (hidden)." });
      } else {
        const result = await send<{ id: string }>("admin/products", payload);
        setBaseline(JSON.stringify(form));
        toast.success("Product created", { description: form.active ? "It is now visible in the storefront." : "Saved as a hidden draft." });
        router.replace(`/admin/products/${result.id}`);
      }
      refreshBadges();
    } catch (err) {
      setError((err as Error).message);
      toast.error("Could not save product", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    if (
      !(await confirm({
        title: "Delete this product?",
        description: ordered ? "This product appears in orders and can only be archived." : "This permanently removes the product from your catalog.",
        confirmLabel: "Delete product",
        destructive: true,
      }))
    )
      return;
    try {
      await api(`admin/products/${id}`, { method: "DELETE" });
      setBaseline(JSON.stringify(form));
      toast.success("Product deleted");
      refreshBadges();
      router.push("/admin/products");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <form ref={formRef} onSubmit={save} className="pb-24">
      {/* Sticky action bar */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
        <Button asChild variant="ghost" size="icon" aria-label="Back to products">
          <Link href="/admin/products">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.18em] text-brand uppercase">{id ? "Edit product" : "New product"}</p>
          <h1 className="truncate text-lg font-extrabold md:text-xl">{form.name || "Untitled product"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? <Badge variant="warning">Unsaved changes</Badge> : id && <StatusBadge value={form.active ? "published" : "archived"} />}
          {id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={!product?.active} onSelect={() => window.open(`/product/${product?.slug}`, "_blank")}>
                  <ExternalLink /> View in store
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/admin/products/new?from=${id}`)}>
                  <Copy /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={remove}>
                  <Trash2 /> Delete product
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {dirty && id && (
            <Button type="button" variant="ghost" onClick={() => setForm(JSON.parse(baseline))}>
              Discard
            </Button>
          )}
          <Button variant="brand" disabled={saving || (!dirty && Boolean(id))}>
            {saving ? <Spinner /> : <Save />} {id ? "Save changes" : form.active ? "Publish product" : "Save draft"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Section icon={Package} title="Product details" description="The essentials customers see first.">
            <Field label="Product name" htmlFor="p-name">
              <Input
                id="p-name"
                required
                maxLength={180}
                value={form.name}
                placeholder="e.g. iPhone 16 Pro Max 256GB"
                className="h-11 text-base font-semibold"
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => (f ? { ...f, name, ...(slugTouched ? {} : { slug: slugify(name) }) } : f));
                }}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="URL slug"
                htmlFor="p-slug"
                hint={ordered ? "Locked: this product appears in orders." : `dazzle.bd/product/${form.slug || "…"}`}
                aside={ordered ? <Lock className="size-3.5 text-muted-foreground" /> : null}
              >
                <Input
                  id="p-slug"
                  required
                  disabled={ordered > 0}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  maxLength={180}
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase());
                  }}
                />
              </Field>
              <Field
                label="SKU / product code"
                htmlFor="p-code"
                aside={
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-brand"
                    onClick={() =>
                      set("code", `${(form.brandName || "DZ").replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "DZ"}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`)
                    }
                  >
                    <Wand2 className="size-3" /> Generate
                  </button>
                }
              >
                <Input id="p-code" required maxLength={180} value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="APL-IP16PM-256" />
              </Field>
            </div>
            <Field label="Short description" htmlFor="p-short" hint={`Shown beside the price. ${form.shortDescription.length}/3000`}>
              <Textarea id="p-short" rows={2} maxLength={3000} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="Key selling points in a sentence or two." />
            </Field>
            <Field
              label="Full description"
              htmlFor="p-desc"
              hint={
                product && product.description === undefined
                  ? "This imported product keeps its original formatted description until you write a new one here."
                  : "Plain text. Line breaks are kept."
              }
            >
              <Textarea id="p-desc" rows={7} maxLength={50000} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </Section>

          <Section icon={ImageIcon} title="Media" description="Drag to reorder. The first image is the cover shown in listings.">
            <GalleryField value={form.images} onChange={(images) => set("images", images)} />
          </Section>

          <Section icon={Tag} title="Pricing" description="Prices are in Bangladeshi Taka (BDT).">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Sale price" htmlFor="p-price">
                <MoneyInput id="p-price" value={form.price} onChange={(v) => set("price", v)} disabled={form.isTba} />
              </Field>
              <Field label="Regular price" htmlFor="p-regular" hint="Shown crossed out when higher.">
                <MoneyInput id="p-regular" value={form.regularPrice} onChange={(v) => set("regularPrice", v)} placeholder={form.price || "0"} disabled={form.isTba} />
              </Field>
              <Field label="Cost per item" htmlFor="p-cost" hint="Private — never shown to customers.">
                <MoneyInput id="p-cost" value={form.costPrice} onChange={(v) => set("costPrice", v)} placeholder="Optional" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 p-3.5 text-center">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Discount</p>
                <p className="text-lg font-extrabold tabular-nums">{discount ? `${discount}%` : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Profit</p>
                <p className="text-lg font-extrabold tabular-nums">{cost !== null ? money(price - cost) : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Margin</p>
                <p className={cn("text-lg font-extrabold tabular-nums", margin !== null && margin < 0 && "text-destructive")}>
                  {margin !== null ? `${margin.toFixed(1)}%` : "—"}
                </p>
              </div>
            </div>
            {form.isTba && <p className="text-xs text-muted-foreground">Prices are hidden while “Coming soon” is on.</p>}
          </Section>

          <Section icon={Layers} title="Inventory & availability" description="Stock is reserved at checkout and restored if an order is cancelled.">
            <Field label="Quantity on hand" htmlFor="p-stock" hint={product ? "Changes are recorded in Stock movements." : undefined}>
              <div className="flex w-fit items-center gap-1.5">
                <Button type="button" variant="outline" size="icon" aria-label="Decrease stock" onClick={() => set("stock", String(Math.max(0, (Number(form.stock) || 0) - 1)))}>
                  <Minus />
                </Button>
                <Input
                  id="p-stock"
                  type="number"
                  min={0}
                  step={1}
                  disabled={form.trackVariants}
                  value={form.trackVariants ? String(form.variantStock.reduce((sum, r) => sum + (Number(r.stock) || 0), 0)) : form.stock}
                  onChange={(e) => set("stock", e.target.value)}
                  className="w-28 text-center text-base font-bold tabular-nums"
                />
                <Button type="button" variant="outline" size="icon" aria-label="Increase stock" onClick={() => set("stock", String((Number(form.stock) || 0) + 1))}>
                  <Plus />
                </Button>
              </div>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Barcode"
                hint="Scanned at the POS and printed on labels. Empty uses the SKU."
                aside={
                  <button type="button" className="text-xs font-semibold text-primary hover:underline dark:text-brand" onClick={() => set("barcode", form.code)}>
                    Use SKU
                  </button>
                }
              >
                <Input value={form.barcode} maxLength={64} onChange={(e) => set("barcode", e.target.value)} className="font-mono" placeholder={form.code || "e.g. 8801234567890"} />
              </Field>
              <Field label="Low-stock alert at" hint="Empty uses the store setting.">
                <Input type="number" min={0} value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} placeholder="Store default" />
              </Field>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <ToggleRow label="Free delivery" description="Orders where every item has free delivery ship free." checked={form.freeShipping} onChange={(v) => set("freeShipping", v)} />
              <ToggleRow label="Coming soon" description="Price to be announced; checkout is blocked." checked={form.isTba} onChange={(v) => set("isTba", v)} />
              <ToggleRow label="Allow pre-order" description="Lists the product on the Pre-Order page." checked={form.allowPreOrder} onChange={(v) => set("allowPreOrder", v)} />
              <ToggleRow label="Discontinued" description="Visible for reference but can't be bought." checked={form.endOfLife} onChange={(v) => set("endOfLife", v)} />
              <ToggleRow label="Best deal" description="Highlights the product as a top offer." checked={form.isBestDeal} onChange={(v) => set("isBestDeal", v)} />
            </div>
          </Section>

          <Section icon={Sparkles} title="Variants" description="Let customers choose a color, storage size, or other option. Each value can switch the gallery image.">
            <VariantEditor variants={form.variants} images={form.images} onChange={(v) => set("variants", v)} />
            <VariantStockMatrix form={form} set={set} />
          </Section>

          <Section icon={ClipboardPaste} title="Specifications" description="Shown as a table under the description on the product page.">
            <SpecsEditor specs={form.specs} onChange={(s) => set("specs", s)} />
          </Section>

          <Section icon={ShieldCheck} title="Protection plans" description="Optional paid add-ons, e.g. extended warranty. Only list services your store provides.">
            <div className="grid gap-2">
              {form.carePlans.map((plan, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_120px_auto] items-center gap-2">
                  <Input value={plan.title} onChange={(e) => set("carePlans", form.carePlans.map((p, j) => (j === i ? { ...p, title: e.target.value } : p)))} placeholder="Extended warranty" aria-label="Plan name" />
                  <Input value={plan.coverage} onChange={(e) => set("carePlans", form.carePlans.map((p, j) => (j === i ? { ...p, coverage: e.target.value } : p)))} placeholder="12 months" aria-label="Coverage" />
                  <MoneyInput value={plan.price} onChange={(v) => set("carePlans", form.carePlans.map((p, j) => (j === i ? { ...p, price: v } : p)))} />
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove plan" onClick={() => set("carePlans", form.carePlans.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                </div>
              ))}
              {form.carePlans.length < 3 && (
                <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => set("carePlans", [...form.carePlans, { id: `care-${uid()}`, title: "", coverage: "", price: "" }])}>
                  <Plus /> Add plan
                </Button>
              )}
            </div>
          </Section>

          <Section icon={Globe} title="Search engine listing" description="How this product appears on Google and social shares.">
            <div className="rounded-xl border bg-card p-4">
              <p className="truncate text-xs text-[#4d5156] dark:text-[#bdc1c6]">dazzle.bd › product › {form.slug || "…"}</p>
              <p className="mt-1 truncate text-lg text-[#1a0dab] dark:text-[#8ab4f8]">{seoTitle}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-[#4d5156] dark:text-[#bdc1c6]">{seoDescription}</p>
            </div>
            <Field label="Page title" htmlFor="p-seo-title" hint={`${form.seo.title.length}/70 recommended`}>
              <Input id="p-seo-title" maxLength={180} value={form.seo.title} placeholder={seoTitle} onChange={(e) => set("seo", { ...form.seo, title: e.target.value })} />
            </Field>
            <Field label="Meta description" htmlFor="p-seo-desc" hint={`${form.seo.description.length}/160 recommended`}>
              <Textarea id="p-seo-desc" rows={2} maxLength={400} value={form.seo.description} placeholder={seoDescription} onChange={(e) => set("seo", { ...form.seo, description: e.target.value })} />
            </Field>
            <Field label="Keywords" htmlFor="p-seo-kw" hint="Comma-separated.">
              <Input id="p-seo-kw" maxLength={400} value={form.seo.keywords} onChange={(e) => set("seo", { ...form.seo, keywords: e.target.value })} />
            </Field>
          </Section>
        </div>

        <aside className="grid gap-6 lg:sticky lg:top-[140px]">
          <Card>
            <CardHeader>
              <CardTitle>Visibility</CardTitle>
            </CardHeader>
            <CardContent>
              <ToggleRow
                label={form.active ? "Published" : "Hidden (archived)"}
                description={form.active ? "Visible in the storefront, search, and listings." : "Only visible here in the dashboard."}
                checked={form.active}
                onChange={(v) => set("active", v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Choose existing options or type a new name to create one.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <Field label="Categories">
                <Combobox
                  multiple
                  options={taxonomy.categories.map((c) => ({ value: c.slug, label: c.name, image: c.image, muted: c.active === false, hint: c.active === false ? "hidden" : undefined }))}
                  value={form.categorySlugs}
                  onChange={(v) => set("categorySlugs", v.slice(0, 15))}
                  placeholder="Select categories…"
                  searchPlaceholder="Search or create a category…"
                  onCreate={(name) => setCreating({ kind: "category", name })}
                  createLabel="Create category"
                />
              </Field>
              <Field label="Sub-categories" hint={form.categorySlugs.length ? undefined : "Pick a category first."}>
                <Combobox
                  multiple
                  disabled={!form.categorySlugs.length}
                  options={subOptions}
                  value={form.subCategorySlugs.filter((s) => subOptions.some((o) => o.value === s))}
                  onChange={(v) => set("subCategorySlugs", v)}
                  placeholder="Select sub-categories…"
                  searchPlaceholder="Search or create…"
                  onCreate={firstParent ? (name) => setCreating({ kind: "sub", name }) : undefined}
                  createLabel={firstParent ? `Create in ${firstParent.name}` : "Create"}
                />
              </Field>
              {childOptions.length > 0 && (
                <Field label="Child categories">
                  <Combobox
                    multiple
                    options={childOptions}
                    value={form.childCategorySlugs.filter((s) => childOptions.some((o) => o.value === s))}
                    onChange={(v) => set("childCategorySlugs", v)}
                    placeholder="Select child categories…"
                  />
                </Field>
              )}
              <Field label="Brand">
                <Combobox
                  options={taxonomy.brands.map((b) => ({ value: b.slug, label: b.name, image: b.logo }))}
                  value={form.brandSlug ? [form.brandSlug] : []}
                  onChange={([slug]) => {
                    const brand = taxonomy.brands.find((b) => b.slug === slug);
                    setForm((f) => (f ? { ...f, brandSlug: brand?.slug ?? null, brandName: brand?.name ?? null } : f));
                  }}
                  placeholder="Select a brand…"
                  searchPlaceholder="Search or create a brand…"
                  onCreate={(name) => setCreating({ kind: "brand", name })}
                  createLabel="Create brand"
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Merchandising</CardTitle>
              <CardDescription>Labels shown on the product card.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <Field label="Ribbon" htmlFor="p-badge">
                <Input id="p-badge" maxLength={100} value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. New Arrival" />
                <div className="flex flex-wrap gap-1.5">
                  {RIBBONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => set("badge", form.badge === r ? "" : r)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                        form.badge === r ? "border-brand bg-brand-soft text-primary dark:text-brand" : "hover:bg-muted",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Status pill" hint={form.isTba || form.endOfLife ? "Overridden by Coming soon / Discontinued." : undefined}>
                <div className="flex flex-wrap gap-1.5">
                  {RECOGNITION.map((r) => (
                    <button
                      key={r || "none"}
                      type="button"
                      onClick={() => set("recognitionBadge", r)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                        form.recognitionBadge === r ? "border-brand bg-brand-soft text-primary dark:text-brand" : "hover:bg-muted",
                      )}
                    >
                      {r || "None"}
                    </button>
                  ))}
                </div>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storefront preview</CardTitle>
              <CardDescription>How the card looks in listings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-w-[260px]">
                <CardPreview form={form} />
              </div>
              <Separator className="my-4" />
              <p className="text-center text-xs text-muted-foreground">
                Press <kbd className="rounded border bg-muted px-1 font-sans">Ctrl</kbd> + <kbd className="rounded border bg-muted px-1 font-sans">S</kbd> to save
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      {creating?.kind === "category" && (
        <CreateCategoryDialog
          initialName={creating.name}
          onClose={() => setCreating(null)}
          onCreated={(slug) => set("categorySlugs", [...form.categorySlugs, slug])}
        />
      )}
      {creating?.kind === "sub" && firstParent && (
        <CreateCategoryDialog
          initialName={creating.name}
          parent={firstParent}
          onClose={() => setCreating(null)}
          onCreated={(slug) => set("subCategorySlugs", [...form.subCategorySlugs, slug])}
        />
      )}
      {creating?.kind === "brand" && (
        <CreateBrandDialog
          initialName={creating.name}
          onClose={() => setCreating(null)}
          onCreated={(b) => setForm((f) => (f ? { ...f, brandSlug: b.slug, brandName: b.name } : f))}
        />
      )}
    </form>
  );
}
