"use client";
import * as React from "react";
import { createContext, useContext, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, PackagePlus, Plus, X } from "lucide-react";
import type { ImageAsset } from "@/types";
import { cn } from "../lib/utils";
import { api, money, send, slugify, useApi } from "../lib/api";
import type { AdminProduct, CategoryRow, PageResult, Taxonomy } from "../lib/types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Switch } from "../ui/controls";
import { Field, Spinner, Thumb } from "./kit";
import { ImageField } from "./media";
import { DragHandle, SortableList } from "./sortable";

/* ---------- Taxonomy context (categories + brands for every dropdown) ---------- */
const TaxonomyContext = createContext<{ taxonomy: Taxonomy; reload: () => void; loading: boolean }>({
  taxonomy: { categories: [], brands: [] },
  reload: () => {},
  loading: true,
});

export function TaxonomyProvider({ children }: { children: React.ReactNode }) {
  const { data, reload, loading } = useApi<Taxonomy>("admin/taxonomy");
  const value = useMemo(
    () => ({ taxonomy: data ?? { categories: [], brands: [] }, reload, loading: loading && !data }),
    [data, reload, loading],
  );
  return <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>;
}

export const useTaxonomy = () => useContext(TaxonomyContext);

export interface Option {
  value: string;
  label: string;
  image?: ImageAsset | null;
  hint?: string;
  muted?: boolean;
}

/**
 * Searchable dropdown. Multi-select shows chips; when `onCreate` is given, typing a name that
 * doesn't exist offers "Create …" so new categories/brands can be added without leaving the form.
 */
export function Combobox({
  options,
  value,
  onChange,
  multiple = false,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "Nothing found.",
  onCreate,
  createLabel = "Create",
  disabled,
  className,
}: {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onCreate?: (name: string) => void;
  createLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const selected = value.map((v) => options.find((o) => o.value === v) ?? { value: v, label: v });
  const exact = options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());
  const toggle = (v: string) => {
    if (multiple) onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    else {
      onChange(value[0] === v ? [] : [v]);
      setOpen(false);
    }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-card px-2.5 py-1.5 text-left text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {!selected.length && <span className="px-0.5 text-muted-foreground/80">{placeholder}</span>}
            {multiple
              ? selected.map((o) => (
                  <Badge key={o.value} variant="brand" className="gap-1 py-0.5 pr-1 pl-2 text-xs">
                    {o.label}
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={`Remove ${o.label}`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(o.value);
                      }}
                      className="rounded-full p-0.5 hover:bg-primary/15"
                    >
                      <X className="size-3" />
                    </span>
                  </Badge>
                ))
              : selected[0] && (
                  <span className="flex items-center gap-2 truncate px-0.5">
                    {"image" in selected[0] && selected[0].image !== undefined && <Thumb image={selected[0].image} size={20} className="rounded" />}
                    {selected[0].label}
                  </span>
                )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent id={listId} className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{onCreate && query.trim() ? "No match — create it below." : emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => toggle(o.value)}>
                  {o.image !== undefined && <Thumb image={o.image} size={24} className="rounded-md" />}
                  <span className={cn("flex-1 truncate", o.muted && "text-muted-foreground")}>
                    {o.label}
                    {o.hint && <span className="ml-1.5 text-xs text-muted-foreground">{o.hint}</span>}
                  </span>
                  <Check className={cn("size-4 text-primary!", value.includes(o.value) ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreate && query.trim() && !exact && (
              <CommandGroup forceMount>
                <CommandItem
                  forceMount
                  value={`__create ${query}`}
                  onSelect={() => {
                    onCreate(query.trim());
                    setQuery("");
                    setOpen(false);
                  }}
                  className="font-semibold text-primary dark:text-brand"
                >
                  <Plus className="text-current!" /> {createLabel} “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Quick-create dialogs ---------- */
export function CreateCategoryDialog({
  initialName,
  parent,
  onClose,
  onCreated,
}: {
  initialName: string;
  /** When set, the new entry is added as a sub-category of this category. */
  parent?: { _id: string; name: string } | null;
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const { reload } = useTaxonomy();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(slugify(initialName));
  const [slugEdited, setSlugEdited] = useState(false);
  const [image, setImage] = useState<ImageAsset | null>(null);
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // React submit events bubble through portals; keep this out of the parent form.
    e.stopPropagation();
    setBusy(true);
    try {
      if (parent) {
        const { item } = await api<{ item: CategoryRow }>(`admin/categories/${parent._id}`);
        await send(
          `admin/categories/${parent._id}`,
          {
            name: item.name,
            slug: item.slug,
            image: item.image,
            tradeIn: item.tradeIn,
            active: item.active !== false,
            brands: item.brands,
            subCategories: [...item.subCategories, { name, slug, image }],
          },
          "PATCH",
        );
      } else await send("admin/categories", { name, slug, image, active, tradeIn: false, brands: [], subCategories: [] });
      toast.success(parent ? `Sub-category “${name}” added to ${parent.name}` : `Category “${name}” created`);
      reload();
      onCreated(slug);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{parent ? `New sub-category in ${parent.name}` : "New category"}</DialogTitle>
            <DialogDescription>
              {parent ? "It appears in the category menu and product filters." : "It appears in the storefront menu, category pages, and filters."}
            </DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="new-cat-name">
            <Input
              id="new-cat-name"
              autoFocus
              required
              maxLength={120}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="URL slug" htmlFor="new-cat-slug" hint={`/categories/${parent ? "…/" : ""}${slug || "slug"}`}>
            <Input
              id="new-cat-slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
            />
          </Field>
          <Field label="Image (optional)">
            <ImageField value={image} onChange={setImage} />
          </Field>
          {!parent && (
            <label className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
              Visible in storefront
              <Switch checked={active} onCheckedChange={setActive} />
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy || !name.trim() || !slug}>{busy && <Spinner />} Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateBrandDialog({
  initialName,
  onClose,
  onCreated,
}: {
  initialName: string;
  onClose: () => void;
  onCreated: (brand: { slug: string; name: string }) => void;
}) {
  const { reload } = useTaxonomy();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(slugify(initialName));
  const [logo, setLogo] = useState<ImageAsset | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <form
          className="grid gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setBusy(true);
            try {
              await send("admin/brands", { name, slug, logo, featured: false, active: true });
              toast.success(`Brand “${name}” created`);
              reload();
              onCreated({ slug, name });
              onClose();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>New brand</DialogTitle>
            <DialogDescription>Brands get their own storefront page and appear in filters.</DialogDescription>
          </DialogHeader>
          <Field label="Brand name" htmlFor="new-brand-name">
            <Input
              id="new-brand-name"
              autoFocus
              required
              maxLength={120}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="URL slug" htmlFor="new-brand-slug" hint={`/brands/${slug || "slug"}`}>
            <Input id="new-brand-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </Field>
          <Field label="Logo (optional)">
            <ImageField value={logo} onChange={setLogo} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy || !name.trim() || !slug}>{busy && <Spinner />} Create brand</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Product search dialog + sortable picker ---------- */
type PickerProduct = Pick<AdminProduct, "_id" | "slug" | "name" | "price" | "image" | "stock" | "active" | "brandName">;

export function ProductSearchDialog({
  open,
  onOpenChange,
  exclude = [],
  onPick,
  title = "Add products",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exclude?: string[];
  onPick: (products: PickerProduct[]) => void;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<PickerProduct[]>([]);
  const { data, loading } = useApi<PageResult<PickerProduct>>(
    open ? `admin/products?limit=30&status=active&sort=updated&q=${encodeURIComponent(query)}` : null,
    250,
  );
  const change = (next: boolean) => {
    if (!next) {
      setPicked([]);
      setQuery("");
    }
    onOpenChange(next);
  };
  const results = (data?.items ?? []).filter((p) => !exclude.includes(p.slug));
  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0" showClose={false}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Search published products by name, SKU, or slug.</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="rounded-none border-t">
          <CommandInput placeholder="Search products…" value={query} onValueChange={setQuery} autoFocus />
          <CommandList className="max-h-[52vh]">
            {loading && !data ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : (
              <CommandEmpty>No products match “{query}”.</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((p) => {
                const on = picked.some((x) => x.slug === p.slug);
                return (
                  <CommandItem
                    key={p.slug}
                    value={p.slug}
                    onSelect={() => setPicked((list) => (on ? list.filter((x) => x.slug !== p.slug) : [...list, p]))}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[5px] border",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {on && <Check className="size-3 text-current!" strokeWidth={3} />}
                    </span>
                    <Thumb image={p.image} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {money(p.price)} · {p.stock} in stock{p.brandName ? ` · ${p.brandName}` : ""}
                      </span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter className="border-t bg-muted/40 px-5 py-3.5">
          <Button variant="outline" onClick={() => change(false)}>
            Cancel
          </Button>
          <Button
            disabled={!picked.length}
            onClick={() => {
              onPick(picked);
              change(false);
            }}
          >
            <PackagePlus /> Add {picked.length || ""} product{picked.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Ordered list of product slugs, e.g. a homepage section. */
export function ProductPicker({
  value,
  onChange,
  max = 40,
  emptyText = "No products selected yet.",
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
  max?: number;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [known, setKnown] = useState<Record<string, PickerProduct>>({});
  const missing = value.filter((s) => !known[s]);
  const key = missing.slice(0, 100).join(",");
  useEffect(() => {
    if (!key) return;
    let alive = true;
    api<PageResult<PickerProduct>>(`admin/products?limit=100&slugs=${encodeURIComponent(key)}`)
      .then((r) => {
        if (!alive) return;
        setKnown((k) => {
          const next = { ...k };
          for (const p of r.items) next[p.slug] = p;
          // Mark slugs that no longer exist so they render as removed products.
          for (const s of key.split(",")) if (!next[s]) next[s] = { _id: "", slug: s, name: s, price: 0, image: null, stock: 0, active: false, brandName: null };
          return next;
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);
  return (
    <div className="grid gap-2">
      {value.length ? (
        <SortableList items={value} getId={(s) => s} onChange={onChange} className="grid gap-1.5">
          {(slug, i, handle) => {
            const p = known[slug];
            return (
              <div className="flex items-center gap-2.5 rounded-lg border bg-card px-2 py-1.5">
                <DragHandle {...handle} />
                <span className="w-5 text-center text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                <Thumb image={p?.image} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p?.name ?? slug}</span>
                  <span className="text-xs text-muted-foreground">
                    {!p ? "Loading…" : !p._id ? "Product not found — remove it" : !p.active ? "Archived" : `${money(p.price)} · ${p.stock} in stock`}
                  </span>
                </span>
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove product" onClick={() => onChange(value.filter((s) => s !== slug))}>
                  <X />
                </Button>
              </div>
            );
          }}
        </SortableList>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" disabled={value.length >= max} onClick={() => setOpen(true)}>
          <PackagePlus /> Add products
        </Button>
        <span className="text-xs text-muted-foreground">
          {value.length} / {max}
        </span>
      </div>
      <ProductSearchDialog
        open={open}
        onOpenChange={setOpen}
        exclude={value}
        onPick={(products) => {
          setKnown((k) => ({ ...k, ...Object.fromEntries(products.map((p) => [p.slug, p])) }));
          onChange([...value, ...products.map((p) => p.slug)].slice(0, max));
        }}
      />
    </div>
  );
}
