"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  EyeOff,
  FolderTree,
  ImagePlus,
  PackagePlus,
  Plus,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import type { ImageAsset } from "@/types";
import { cn } from "../lib/utils";
import { api, send, slugify, useApi } from "../lib/api";
import type { CategoryRow, SubCategoryRow } from "../lib/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Skeleton, Switch } from "../ui/controls";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui/dialog";
import {
  EmptyState,
  ErrorNote,
  Field,
  PageHeader,
  SearchInput,
  Spinner,
  useConfirm,
} from "../shared/kit";
import { ImageField, MediaLibraryDialog } from "../shared/media";
import { Combobox, ProductSearchDialog, useTaxonomy } from "../shared/pickers";
import { DragHandle, SortableList } from "../shared/sortable";

type Draft = Pick<
  CategoryRow,
  "name" | "slug" | "image" | "tradeIn" | "active" | "brands"
> & {
  subCategories: (SubCategoryRow & { key: string })[];
};
const key = () => Math.random().toString(36).slice(2);

function SubImage({
  value,
  onChange,
}: {
  value: ImageAsset | null;
  onChange: (v: ImageAsset | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={value ? "Change image" : "Add image"}
        onClick={() => setOpen(true)}
        className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white"
      >
        {value ? (
          <Image
            src={value.src}
            alt=""
            fill
            sizes="36px"
            className="object-contain p-0.5"
          />
        ) : (
          <ImagePlus className="size-4 text-muted-foreground" />
        )}
      </button>
      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={([img]) => onChange(img ?? null)}
      />
    </>
  );
}

/** Third-level categories inside one sub-category, edited as chips. */
function ChildChips({
  value,
  onChange,
}: {
  value: { id?: string; name: string; slug: string }[];
  onChange: (v: { id?: string; name: string; slug: string }[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const names = draft
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const next = [...value];
    for (const name of names) {
      const slug = slugify(name);
      if (slug && !next.some((c) => c.slug === slug)) next.push({ name, slug });
    }
    onChange(next.slice(0, 100));
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 pl-11">
      <span className="text-[11px] font-semibold text-muted-foreground">
        Child categories:
      </span>
      {value.map((c) => (
        <span
          key={c.slug}
          className="inline-flex items-center gap-1 rounded-md border bg-muted/50 py-0.5 pr-0.5 pl-2 text-xs font-medium"
        >
          {c.name}
          <button
            type="button"
            aria-label={`Remove ${c.name}`}
            onClick={() => onChange(value.filter((x) => x.slug !== c.slug))}
            className="rounded p-0.5 hover:bg-muted"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={() => draft.trim() && add()}
        placeholder="Add (Enter)"
        aria-label="Add child category"
        className="h-7 w-32 text-xs"
      />
    </div>
  );
}

function CategoryEditor({
  category,
  onClose,
  onSaved,
}: {
  category: CategoryRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const confirm = useConfirm();
  const { taxonomy, reload: reloadTaxonomy } = useTaxonomy();
  const [draft, setDraft] = useState<Draft>(() => ({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    image: category?.image ?? null,
    tradeIn: category?.tradeIn ?? false,
    active: category?.active !== false,
    brands: category?.brands ?? [],
    subCategories: (category?.subCategories ?? []).map((s) => ({
      ...s,
      key: key(),
    })),
  }));
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const updateSub = (i: number, patch: Partial<SubCategoryRow>) =>
    set(
      "subCategories",
      draft.subCategories.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...draft,
        subCategories: draft.subCategories.map(
          ({ key: _k, ...s }) => (void _k, s),
        ),
      };
      if (category)
        await send(`admin/categories/${category._id}`, payload, "PATCH");
      else await send("admin/categories", payload);
      toast.success(
        category ? "Category saved" : `Category “${draft.name}” created`,
      );
      reloadTaxonomy();
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!category) return;
    const used = category.productCount;
    if (
      !(await confirm({
        title: `Delete ${category.name}?`,
        description: used
          ? `${used} products use this category. They will be kept, but removed from “${category.name}” and its sub-categories. Consider hiding it instead.`
          : "The category will be removed from the storefront menu.",
        confirmLabel: used ? "Delete and detach" : "Delete category",
        destructive: true,
      }))
    )
      return;
    try {
      await api(`admin/categories/${category._id}${used ? "?detach=1" : ""}`, {
        method: "DELETE",
      });
      toast.success("Category deleted");
      reloadTaxonomy();
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl">
        <form onSubmit={save} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{category ? category.name : "New category"}</SheetTitle>
            <SheetDescription>
              {category
                ? `${category.activeCount} published products · ${category.inStockCount} in stock`
                : "Appears in the menu, the categories page, and product filters."}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="grid content-start gap-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" htmlFor="c-name">
                <Input
                  id="c-name"
                  required
                  maxLength={120}
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setDraft((d) => ({
                      ...d,
                      name,
                      ...(slugTouched ? {} : { slug: slugify(name) }),
                    }));
                  }}
                />
              </Field>
              <Field
                label="URL slug"
                htmlFor="c-slug"
                hint={
                  category && draft.slug !== category.slug
                    ? "Products and homepage links are updated automatically."
                    : `/categories/${draft.slug || "…"}`
                }
              >
                <Input
                  id="c-slug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase());
                  }}
                />
              </Field>
            </div>
            <Field
              label="Category image"
              hint="Shown on the homepage category grid and the categories page."
            >
              <ImageField
                value={draft.image}
                onChange={(img) => set("image", img)}
              />
            </Field>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3">
                <span>
                  <span className="block text-sm font-semibold">
                    Visible in storefront
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Hidden categories keep their products.
                  </span>
                </span>
                <Switch
                  checked={draft.active}
                  onCheckedChange={(v) => set("active", v)}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3">
                <span>
                  <span className="block text-sm font-semibold">
                    Trade-in eligible
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Offered on the Trade In page.
                  </span>
                </span>
                <Switch
                  checked={draft.tradeIn}
                  onCheckedChange={(v) => set("tradeIn", v)}
                />
              </label>
            </div>
            <Field
              label="Featured brands"
              hint="Brands shown in this category's menu and filters."
            >
              <Combobox
                multiple
                options={taxonomy.brands.map((b) => ({
                  value: b.slug,
                  label: b.name,
                  image: b.logo,
                }))}
                value={draft.brands}
                onChange={(v) => set("brands", v)}
                placeholder="Select brands…"
              />
            </Field>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Sub-categories</p>
                  <p className="text-xs text-muted-foreground">
                    Drag to reorder how they appear in the mega menu.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    set("subCategories", [
                      ...draft.subCategories,
                      { key: key(), name: "", slug: "", image: null },
                    ])
                  }
                >
                  <Plus /> Add
                </Button>
              </div>
              {draft.subCategories.length ? (
                <SortableList
                  items={draft.subCategories}
                  getId={(s) => s.key}
                  onChange={(v) => set("subCategories", v)}
                  className="grid gap-1.5"
                >
                  {(sub, i, handle) => (
                    <div className="grid gap-1.5 rounded-xl border bg-card p-1.5">
                      <div className="flex items-center gap-2">
                        <DragHandle {...handle} />
                        <SubImage
                          value={sub.image}
                          onChange={(img) => updateSub(i, { image: img })}
                        />
                        <Input
                          required
                          value={sub.name}
                          placeholder="Name"
                          aria-label="Sub-category name"
                          onChange={(e) =>
                            updateSub(i, {
                              name: e.target.value,
                              ...(sub.id
                                ? {}
                                : { slug: slugify(e.target.value) }),
                            })
                          }
                        />
                        <Input
                          required
                          pattern="[a-z0-9]+(-[a-z0-9]+)*"
                          value={sub.slug}
                          placeholder="slug"
                          aria-label="Sub-category slug"
                          className="w-40 font-mono text-xs"
                          onChange={(e) =>
                            updateSub(i, { slug: e.target.value.toLowerCase() })
                          }
                        />
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Remove sub-category"
                          onClick={() =>
                            set(
                              "subCategories",
                              draft.subCategories.filter((_, j) => j !== i),
                            )
                          }
                        >
                          <X />
                        </Button>
                      </div>
                      <ChildChips
                        value={sub.children ?? []}
                        onChange={(children) => updateSub(i, { children })}
                      />
                    </div>
                  )}
                </SortableList>
              ) : (
                <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
                  No sub-categories yet.
                </p>
              )}
            </div>
            {category && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
                <div>
                  <p className="text-sm font-bold">
                    {category.productCount} products
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add existing products to this category in one step.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild type="button" size="sm" variant="ghost">
                    <Link href={`/admin/products?category=${category.slug}`}>
                      View <ArrowUpRight />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAdding(true)}
                  >
                    <PackagePlus /> Add products
                  </Button>
                </div>
              </div>
            )}
          </SheetBody>
          <SheetFooter className="justify-between">
            {category ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={remove}
              >
                <Trash2 /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={busy}>
                {busy && <Spinner />}{" "}
                {category ? "Save category" : "Create category"}
              </Button>
            </div>
          </SheetFooter>
        </form>
        {category && (
          <ProductSearchDialog
            open={adding}
            onOpenChange={setAdding}
            title={`Add products to ${category.name}`}
            onPick={async (products) => {
              try {
                const r = await send<{ affected: number }>(
                  "admin/products/bulk",
                  {
                    ids: products.map((p) => p._id),
                    action: "add-category",
                    category: category.slug,
                  },
                );
                toast.success(
                  `${r.affected} products added to ${category.name}`,
                );
                onSaved();
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

export function CategoriesPage({ description }: { description: string }) {
  const params = useSearchParams();
  const { data, error, loading, reload } = useApi<{ items: CategoryRow[] }>(
    "admin/categories",
  );
  const [order, setOrder] = useState<CategoryRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CategoryRow | "new" | null>(
    params.get("new") ? "new" : null,
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- local copy for optimistic drag ordering
    if (data) setOrder(data.items);
  }, [data]);
  const list = (order ?? []).filter(
    (c) =>
      !query ||
      `${c.name} ${c.slug}`.toLowerCase().includes(query.toLowerCase()),
  );
  const reorder = async (next: CategoryRow[]) => {
    setOrder(next);
    try {
      await send("admin/categories/reorder", { ids: next.map((c) => c._id) });
      toast.success("Category order saved", {
        description: "The storefront menu uses the new order.",
      });
    } catch (err) {
      toast.error((err as Error).message);
      reload();
    }
  };
  const card = (c: CategoryRow, handle?: React.ReactNode) => (
    <Card
      className={cn(
        "group h-full cursor-pointer gap-0 overflow-hidden py-0 transition hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-lg",
        c.active === false && "opacity-70",
      )}
      onClick={() => setEditing(c)}
    >
      <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_50%_40%,#fff_0%,#f6efe6_70%)] dark:bg-[radial-gradient(circle_at_50%_40%,#342a20_0%,#1f1a16_70%)]">
        {c.image ? (
          <Image
            src={c.image.src}
            alt=""
            fill
            sizes="280px"
            className="object-contain p-6 transition duration-300 group-hover:scale-105"
          />
        ) : (
          <FolderTree className="absolute inset-0 m-auto size-10 text-muted-foreground/40" />
        )}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {c.active === false && (
            <Badge variant="muted" className="bg-card/90">
              <EyeOff /> Hidden
            </Badge>
          )}
          {c.tradeIn && (
            <Badge variant="brand" className="bg-card/90">
              <Repeat /> Trade-in
            </Badge>
          )}
        </div>
        {handle && (
          <div
            className="absolute top-2 right-2"
            onClick={(e) => e.stopPropagation()}
          >
            {handle}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-2 border-t p-4">
        <div className="min-w-0">
          <p className="truncate font-bold">{c.name}</p>
          <p className="text-xs text-muted-foreground">
            {c.subCategories.length} sub-categories · {c.brands.length} brands
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg leading-none font-extrabold tabular-nums">
            {c.productCount}
          </p>
          <p className="text-[11px] text-muted-foreground">products</p>
        </div>
      </div>
    </Card>
  );
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Categories"
        description={description}
        actions={
          <Button variant="brand" onClick={() => setEditing("new")}>
            <Plus /> New category
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search categories…"
        />
        <p className="text-xs text-muted-foreground">
          {query
            ? "Clear the search to reorder."
            : "Drag the handle on a card to change the menu order."}
        </p>
      </div>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !order ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : !list.length ? (
        <Card>
          <EmptyState
            icon={FolderTree}
            title={query ? "No categories match" : "No categories yet"}
            description="Categories organize your storefront menu and product filters."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> New category
              </Button>
            }
          />
        </Card>
      ) : query ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((c) => (
            <div key={c._id}>{card(c)}</div>
          ))}
        </div>
      ) : (
        <SortableList
          items={list}
          getId={(c) => c._id}
          onChange={reorder}
          grid
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {(c, _i, handle) =>
            card(c, <DragHandle {...handle} className="bg-card/90 shadow-sm" />)
          }
        </SortableList>
      )}
      {editing && (
        <CategoryEditor
          key={editing === "new" ? "new" : editing._id}
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}
