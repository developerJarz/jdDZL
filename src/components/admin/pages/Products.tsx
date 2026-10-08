"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  Barcode,
  ArchiveRestore,
  Award,
  Copy,
  Download,
  ExternalLink,
  FolderMinus,
  FolderPlus,
  LayoutGrid,
  List,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";
import { api, date, exportCsv, money, send, useApi } from "../lib/api";
import type { AdminProduct, Badges, PageResult } from "../lib/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { NativeSelect } from "../ui/input";
import { Checkbox, Tabs, TabsList, TabsTrigger } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/menu";
import { EmptyState, ErrorNote, LoadingRows, PageHeader, Pagination, SearchInput, sentence, StatusBadge, Thumb, useConfirm } from "../shared/kit";
import { Combobox, useTaxonomy } from "../shared/pickers";
import { refreshBadges } from "../AdminShell";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "updated", label: "Recently updated" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "stock-asc", label: "Stock: low to high" },
  { value: "stock-desc", label: "Stock: high to low" },
];

export function stockState(p: Pick<AdminProduct, "stock" | "isTba" | "endOfLife">, threshold = 5) {
  if (p.isTba) return "coming soon";
  if (p.endOfLife) return "discontinued";
  return p.stock <= 0 ? "out of stock" : p.stock <= threshold ? "low stock" : "in stock";
}

function ProductActions({ p, onChanged }: { p: AdminProduct; onChanged: () => void }) {
  const router = useRouter();
  const confirm = useConfirm();
  const bulk = async (action: string, message: string) => {
    try {
      await send("admin/products/bulk", { ids: [p._id], action });
      toast.success(message);
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => router.push(`/admin/products/${p._id}`)}>
          <Pencil /> Edit product
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push(`/admin/products/new?from=${p._id}`)}>
          <Copy /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.open(`/product/${p.slug}`, "_blank")} disabled={!p.active}>
          <ExternalLink /> View in store
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.open(`/admin/print/barcodes?ids=${p._id}&copies=1`, "_blank")}>
          <Barcode /> Print barcode labels
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {p.active ? (
          <DropdownMenuItem onSelect={() => bulk("archive", `${p.name} archived`)}>
            <Archive /> Archive
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => bulk("publish", `${p.name} published`)}>
            <ArchiveRestore /> Publish
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          destructive
          onSelect={async () => {
            if (
              !(await confirm({
                title: `Delete ${p.name}?`,
                description: "This permanently removes the product. Products that appear in orders can only be archived.",
                confirmLabel: "Delete product",
                destructive: true,
              }))
            )
              return;
            try {
              await api(`admin/products/${p._id}`, { method: "DELETE" });
              toast.success("Product deleted");
              onChanged();
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriceCell({ p }: { p: AdminProduct }) {
  if (p.isTba) return <span className="text-sm text-muted-foreground">To be announced</span>;
  return (
    <div className="tabular-nums">
      <span className="font-bold">{money(p.price)}</span>
      {p.regularPrice > p.price && (
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <s>{money(p.regularPrice)}</s>
          <Badge variant="brand" className="px-1.5 py-0 text-[10px]">
            −{Math.round(p.discount)}%
          </Badge>
        </span>
      )}
    </div>
  );
}

function BulkBar({ ids, onDone, onClear }: { ids: string[]; onDone: () => void; onClear: () => void }) {
  const confirm = useConfirm();
  const { taxonomy } = useTaxonomy();
  const [busy, setBusy] = useState(false);
  const run = async (body: Record<string, unknown>, message: (n: number) => string) => {
    setBusy(true);
    try {
      const result = await send<{ affected: number; skipped: number }>("admin/products/bulk", { ids, ...body });
      toast.success(message(result.affected), {
        description: result.skipped ? `${result.skipped} ordered products were skipped — archive them instead.` : undefined,
      });
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const categoryOptions = taxonomy.categories.map((c) => ({ value: c.slug, label: c.name, image: c.image }));
  const brandOptions = taxonomy.brands.map((b) => ({ value: b.slug, label: b.name, image: b.logo }));
  return (
    <div className="sticky top-[72px] z-20 flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft/90 px-3 py-2 shadow-lg backdrop-blur">
      <span className="mr-1 text-sm font-bold">{ids.length} selected</span>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run({ action: "publish" }, (n) => `${n} products published`)}>
        <ArchiveRestore /> Publish
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run({ action: "archive" }, (n) => `${n} products archived`)}>
        <Archive /> Archive
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" disabled={busy}>
            <FolderPlus /> Category
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3">
          <p className="text-sm font-semibold">Add or remove a category</p>
          <BulkCategory
            options={categoryOptions}
            onApply={(slug, add) =>
              run({ action: add ? "add-category" : "remove-category", category: slug }, (n) => `${n} products updated`)
            }
          />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" disabled={busy}>
            <Award /> Brand
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3">
          <p className="text-sm font-semibold">Set brand for {ids.length} products</p>
          <Combobox
            options={brandOptions}
            value={[]}
            placeholder="Choose a brand…"
            onChange={([slug]) => slug && run({ action: "set-brand", brandSlug: slug }, (n) => `Brand set on ${n} products`)}
          />
        </PopoverContent>
      </Popover>
      <Button size="sm" variant="outline" onClick={() => window.open(`/admin/print/barcodes?ids=${ids.join(",")}&copies=1`, "_blank")}>
        <Barcode /> Barcodes
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-destructive"
        disabled={busy}
        onClick={async () => {
          if (
            await confirm({
              title: `Delete ${ids.length} products?`,
              description: "Products without orders are removed permanently. Ordered products are skipped so your order history stays intact.",
              confirmLabel: "Delete",
              destructive: true,
            })
          )
            run({ action: "delete" }, (n) => `${n} products deleted`);
        }}
      >
        <Trash2 /> Delete
      </Button>
      <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label="Clear selection" onClick={onClear}>
        <X />
      </Button>
    </div>
  );
}

function BulkCategory({ options, onApply }: { options: { value: string; label: string }[]; onApply: (slug: string, add: boolean) => void }) {
  const [slug, setSlug] = useState<string[]>([]);
  return (
    <>
      <Combobox options={options} value={slug} onChange={setSlug} placeholder="Choose a category…" />
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" disabled={!slug[0]} onClick={() => onApply(slug[0], true)}>
          <FolderPlus /> Add
        </Button>
        <Button size="sm" variant="outline" className="flex-1" disabled={!slug[0]} onClick={() => onApply(slug[0], false)}>
          <FolderMinus /> Remove
        </Button>
      </div>
    </>
  );
}

export function ProductsPage({ description }: { description: string }) {
  const params = useSearchParams();
  const { taxonomy } = useTaxonomy();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [brand, setBrand] = useState(params.get("brand") ?? "");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"table" | "grid">("table");
  const [selected, setSelected] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const filters = new URLSearchParams({ q: query, status, category, brand, sort }).toString();
  const { data, error, loading, reload } = useApi<PageResult<AdminProduct>>(`admin/products?limit=20&page=${page}&${filters}`, 200);
  const badges = useApi<Badges>("admin/badges");
  const items = data?.items ?? [];
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
    setSelected([]);
  };
  const changed = () => {
    setSelected([]);
    reload();
    badges.reload();
    refreshBadges();
  };
  const b = badges.data;
  const tabs = [
    { value: "", label: "All", count: b ? b.activeProducts + b.archived : undefined },
    { value: "active", label: "Published", count: b?.activeProducts },
    { value: "low", label: "Low stock", count: b?.lowStock },
    { value: "out", label: "Out of stock", count: b?.outOfStock },
    { value: "archived", label: "Archived", count: b?.archived },
  ];
  const categoryName = new Map(taxonomy.categories.map((c) => [c.slug, c.name]));
  const allChecked = items.length > 0 && items.every((p) => selected.includes(p._id));

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description={description}
        actions={
          <>
            <Button
              variant="outline"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  const n = await exportCsv("products", filters);
                  toast.success(`Exported ${n} products`);
                } catch (err) {
                  toast.error((err as Error).message);
                } finally {
                  setExporting(false);
                }
              }}
            >
              <Download /> {exporting ? "Exporting…" : "Export"}
            </Button>
            <Button asChild variant="brand">
              <Link href="/admin/products/new">
                <Plus /> Add product
              </Link>
            </Button>
          </>
        }
      />
      <Tabs value={["", "active", "low", "out", "archived"].includes(status) ? status : ""} onValueChange={reset(setStatus)} className="mb-4">
        <TabsList className="h-auto flex-wrap justify-start">
          {tabs.map((t) => (
            <TabsTrigger key={t.value || "all"} value={t.value} className="py-1.5">
              {t.label}
              {t.count !== undefined && <span className="rounded-full bg-muted px-1.5 text-[10.5px] tabular-nums">{t.count}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {["noimage", "noprice"].includes(status) && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <Badge variant="warning">{status === "noimage" ? "Showing products without images" : "Showing products without a price"}</Badge>
          <Button size="sm" variant="ghost" onClick={() => reset(setStatus)("")}>
            Clear filter
          </Button>
        </div>
      )}
      {selected.length > 0 && <div className="mb-4"><BulkBar ids={selected} onDone={changed} onClear={() => setSelected([])} /></div>}
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
          <SearchInput value={query} onChange={reset(setQuery)} placeholder="Search name, SKU or slug…" className="lg:max-w-sm" />
          <div className="flex flex-1 flex-wrap gap-2 lg:justify-end">
            <NativeSelect aria-label="Filter by category" value={category} onChange={(e) => reset(setCategory)(e.target.value)} className="w-auto min-w-40">
              <option value="">All categories</option>
              <option value="_none">Uncategorized</option>
              {taxonomy.categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect aria-label="Filter by brand" value={brand} onChange={(e) => reset(setBrand)(e.target.value)} className="w-auto min-w-36">
              <option value="">All brands</option>
              <option value="_none">No brand</option>
              {taxonomy.brands.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect aria-label="Sort products" value={sort} onChange={(e) => reset(setSort)(e.target.value)} className="w-auto">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
            <div className="flex rounded-lg border p-0.5" role="group" aria-label="Layout">
              {(["table", "grid"] as const).map((v) => (
                <Button
                  key={v}
                  size="icon-sm"
                  variant="ghost"
                  aria-pressed={view === v}
                  aria-label={v === "table" ? "Table view" : "Grid view"}
                  className={cn("size-7", view === v && "bg-muted text-foreground")}
                  onClick={() => setView(v)}
                >
                  {v === "table" ? <List /> : <LayoutGrid />}
                </Button>
              ))}
            </div>
          </div>
        </div>
        {error && (
          <div className="p-3">
            <ErrorNote message={error} onRetry={reload} />
          </div>
        )}
        {view === "table" ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">
                  <Checkbox
                    aria-label="Select all on this page"
                    checked={allChecked ? true : selected.length ? "indeterminate" : false}
                    onCheckedChange={(on) => setSelected(on ? items.map((p) => p._id) : [])}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data ? (
                <LoadingRows cols={8} />
              ) : (
                items.map((p) => {
                  const on = selected.includes(p._id);
                  return (
                    <TableRow key={p._id} data-state={on ? "selected" : undefined}>
                      <TableCell className="pl-4">
                        <Checkbox
                          aria-label={`Select ${p.name}`}
                          checked={on}
                          onCheckedChange={(v) => setSelected((s) => (v ? [...s, p._id] : s.filter((x) => x !== p._id)))}
                        />
                      </TableCell>
                      <TableCell className="max-w-[340px]">
                        <Link href={`/admin/products/${p._id}`} className="group flex items-center gap-3">
                          <Thumb image={p.image} size={44} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold group-hover:text-primary dark:group-hover:text-brand">{p.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {p.code} · {p.brandName || "No brand"}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-48 flex-wrap gap-1">
                          {p.categorySlugs.length ? (
                            p.categorySlugs.slice(0, 2).map((c) => (
                              <Badge key={c} variant="secondary" className="font-medium">
                                {categoryName.get(c) ?? c}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Uncategorized</span>
                          )}
                          {p.categorySlugs.length > 2 && <Badge variant="muted">+{p.categorySlugs.length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PriceCell p={p} />
                      </TableCell>
                      <TableCell>
                        <span className="block font-bold tabular-nums">{p.stock}</span>
                        <span className="text-xs text-muted-foreground">{sentence(stockState(p))}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={p.active ? "published" : "archived"} />
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {p.updatedAt ? date(p.updatedAt) : "—"}
                      </TableCell>
                      <TableCell className="pr-3">
                        <ProductActions p={p} onChanged={changed} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((p) => (
              <div key={p._id} className="group relative overflow-hidden rounded-xl border bg-card transition hover:border-ring/40 hover:shadow-md">
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    aria-label={`Select ${p.name}`}
                    className="bg-white"
                    checked={selected.includes(p._id)}
                    onCheckedChange={(v) => setSelected((s) => (v ? [...s, p._id] : s.filter((x) => x !== p._id)))}
                  />
                </div>
                <div className="absolute top-1.5 right-1.5 z-10">
                  <ProductActions p={p} onChanged={changed} />
                </div>
                <Link href={`/admin/products/${p._id}`} className="block">
                  <Thumb image={p.image} size={220} className="aspect-square h-auto! w-full! rounded-none border-0 border-b" />
                  <div className="space-y-1.5 p-3">
                    <p className="line-clamp-2 min-h-10 text-sm font-semibold">{p.name}</p>
                    <PriceCell p={p} />
                    <div className="flex items-center justify-between">
                      <StatusBadge value={p.active ? stockState(p) : "archived"} />
                      <span className="text-xs text-muted-foreground tabular-nums">{p.stock} units</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
        {data && !items.length && !loading && (
          <EmptyState
            icon={Package}
            title="No products match"
            description="Try a different search or filter, or add a new product."
            action={
              <Button asChild>
                <Link href="/admin/products/new">
                  <Plus /> Add product
                </Link>
              </Button>
            }
          />
        )}
        {data && <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} label="products" />}
      </Card>
    </>
  );
}
