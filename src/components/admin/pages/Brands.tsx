"use client";
import * as React from "react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Award, MoreHorizontal, Pencil, Plus, Trash2, ArrowUpRight } from "lucide-react";
import type { ImageAsset } from "@/types";
import { api, send, slugify, useApi } from "../lib/api";
import type { BrandRow } from "../lib/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Switch, Tabs, TabsList, TabsTrigger } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/menu";
import { EmptyState, ErrorNote, Field, LoadingRows, PageHeader, SearchInput, Spinner, Thumb, useConfirm } from "../shared/kit";
import { ImageField } from "../shared/media";
import { useTaxonomy } from "../shared/pickers";

type Draft = { name: string; slug: string; logo: ImageAsset | null; featured: boolean; active: boolean };
const payload = (b: BrandRow, patch: Partial<Draft> = {}): Draft => ({
  name: b.name,
  slug: b.slug,
  logo: b.logo,
  featured: b.featured,
  active: b.active !== false,
  ...patch,
});

function BrandEditor({ brand, onClose, onSaved }: { brand: BrandRow | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(brand ? payload(brand) : { name: "", slug: "", logo: null, featured: false, active: true });
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              if (brand) await send(`admin/brands/${brand._id}`, draft, "PATCH");
              else await send("admin/brands", draft);
              toast.success(brand ? "Brand saved" : `Brand “${draft.name}” created`);
              onSaved();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{brand ? `Edit ${brand.name}` : "New brand"}</DialogTitle>
            <DialogDescription>
              {brand && (draft.slug !== brand.slug || draft.name !== brand.name)
                ? `Renaming updates all ${brand.productCount} products of this brand automatically.`
                : "Brands get a storefront page and appear in filters."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Brand name" htmlFor="b-name">
              <Input
                id="b-name"
                required
                maxLength={120}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value, ...(brand ? {} : { slug: slugify(e.target.value) }) }))}
              />
            </Field>
            <Field label="URL slug" htmlFor="b-slug" hint={`/brands/${draft.slug || "…"}`}>
              <Input id="b-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase() }))} />
            </Field>
          </div>
          <Field label="Logo">
            <ImageField value={draft.logo} onChange={(logo) => setDraft((d) => ({ ...d, logo }))} />
          </Field>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-semibold">
              Featured brand
              <Switch checked={draft.featured} onCheckedChange={(featured) => setDraft((d) => ({ ...d, featured }))} />
            </label>
            <label className="flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-semibold">
              Visible in storefront
              <Switch checked={draft.active} onCheckedChange={(active) => setDraft((d) => ({ ...d, active }))} />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy}>{busy && <Spinner />} {brand ? "Save brand" : "Create brand"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BrandsPage({ description }: { description: string }) {
  const confirm = useConfirm();
  const { reload: reloadTaxonomy } = useTaxonomy();
  const { data, error, loading, reload, setData } = useApi<{ items: BrandRow[] }>("admin/brands");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<BrandRow | "new" | null>(null);
  const items = (data?.items ?? []).filter(
    (b) =>
      (!query || `${b.name} ${b.slug}`.toLowerCase().includes(query.toLowerCase())) &&
      (filter === "all" || (filter === "featured" ? b.featured : filter === "hidden" ? b.active === false : b.productCount === 0)),
  );
  const toggle = async (b: BrandRow, patch: Partial<Draft>) => {
    setData((d) => d && { items: d.items.map((x) => (x._id === b._id ? { ...x, ...patch } : x)) });
    try {
      await send(`admin/brands/${b._id}`, payload(b, patch), "PATCH");
      reloadTaxonomy();
    } catch (err) {
      toast.error((err as Error).message);
      reload();
    }
  };
  const saved = () => {
    setEditing(null);
    reload();
    reloadTaxonomy();
  };
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Brands"
        description={description}
        actions={
          <Button variant="brand" onClick={() => setEditing("new")}>
            <Plus /> New brand
          </Button>
        }
      />
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={query} onChange={setQuery} placeholder="Search brands…" />
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All {data && <span className="text-[10.5px] tabular-nums">{data.items.length}</span>}</TabsTrigger>
              <TabsTrigger value="featured">Featured</TabsTrigger>
              <TabsTrigger value="hidden">Hidden</TabsTrigger>
              <TabsTrigger value="empty">No products</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {error && (
          <div className="p-3">
            <ErrorNote message={error} onRetry={reload} />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Brand</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <LoadingRows cols={5} />
            ) : (
              items.map((b) => (
                <TableRow key={b._id}>
                  <TableCell className="pl-5">
                    <button type="button" onClick={() => setEditing(b)} className="flex items-center gap-3 text-left">
                      <Thumb image={b.logo} size={40} />
                      <span>
                        <span className="block font-semibold hover:text-primary dark:hover:text-brand">{b.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{b.slug}</span>
                      </span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/products?brand=${b.slug}`} className="font-bold tabular-nums hover:underline">
                      {b.productCount}
                    </Link>
                    <span className="ml-1.5 text-xs text-muted-foreground">{b.inStockCount} in stock</span>
                  </TableCell>
                  <TableCell>
                    <Switch aria-label={`Feature ${b.name}`} checked={b.featured} onCheckedChange={(featured) => toggle(b, { featured })} />
                  </TableCell>
                  <TableCell>
                    <Switch aria-label={`Show ${b.name} in storefront`} checked={b.active !== false} onCheckedChange={(active) => toggle(b, { active })} />
                  </TableCell>
                  <TableCell className="pr-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${b.name}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(b)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => window.open(`/brands/${b.slug}`, "_blank")}>
                          <ArrowUpRight /> View brand page
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          onSelect={async () => {
                            if (
                              !(await confirm({
                                title: `Delete ${b.name}?`,
                                description: b.productCount
                                  ? `${b.productCount} products will keep existing but lose their brand. Consider hiding the brand instead.`
                                  : "The brand page will be removed.",
                                confirmLabel: b.productCount ? "Delete and detach" : "Delete brand",
                                destructive: true,
                              }))
                            )
                              return;
                            try {
                              await api(`admin/brands/${b._id}${b.productCount ? "?detach=1" : ""}`, { method: "DELETE" });
                              toast.success("Brand deleted");
                              saved();
                            } catch (err) {
                              toast.error((err as Error).message);
                            }
                          }}
                        >
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data && !items.length && <EmptyState icon={Award} title="No brands match" />}
      </Card>
      {editing && <BrandEditor brand={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={saved} />}
    </>
  );
}
