"use client";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Palette, Plus, Ruler, Trash2 } from "lucide-react";
import { api, send, useApi } from "../lib/api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/controls";
import { EmptyState, ErrorNote, PageHeader } from "../shared/kit";

export interface Color {
  _id: string;
  name: string;
  hex: string;
}
export interface Size {
  _id: string;
  name: string;
  group: string;
  sortOrder: number;
}

export function AttributesPage({ description }: { description: string }) {
  const colors = useApi<{ items: Color[] }>("admin/colors?limit=200");
  const sizes = useApi<{ items: Size[] }>("admin/sizes?limit=200");
  const [color, setColor] = useState({ name: "", hex: "#cb843b" });
  const [size, setSize] = useState({ name: "", group: "General" });
  const groups = [...new Set((sizes.data?.items ?? []).map((s) => s.group))];
  const remove = async (kind: "colors" | "sizes", id: string, reload: () => void) => {
    try {
      await api(`admin/${kind}/${id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  return (
    <>
      <PageHeader eyebrow="Catalog" title="Colors & sizes" description={`${description} Pick them in the product editor's Variants section — each combination can have its own stock, price, SKU and barcode.`} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-4 text-brand" /> Colors
            </CardTitle>
            <CardDescription>Shown as swatches on the product page.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await send("admin/colors", color);
                  setColor({ name: "", hex: color.hex });
                  colors.reload();
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            >
              <Input type="color" value={color.hex} onChange={(e) => setColor({ ...color, hex: e.target.value })} className="h-9 w-12 shrink-0 p-1" aria-label="Color" />
              <Input required value={color.name} onChange={(e) => setColor({ ...color, name: e.target.value })} placeholder="Midnight Blue" aria-label="Color name" />
              <Button>
                <Plus /> Add
              </Button>
            </form>
            {colors.error && <ErrorNote message={colors.error} />}
            {!colors.data ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : colors.data.items.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {colors.data.items.map((c) => (
                  <div key={c._id} className="group flex items-center gap-2 rounded-xl border p-2">
                    <span className="size-7 shrink-0 rounded-lg border border-black/10" style={{ background: c.hex }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{c.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase">{c.hex}</span>
                    </span>
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${c.name}`} className="opacity-60 group-hover:opacity-100" onClick={() => remove("colors", c._id, colors.reload)}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Palette} title="No colors yet" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="size-4 text-brand" /> Sizes & options
            </CardTitle>
            <CardDescription>Group them, e.g. Storage, RAM, Strap size, Clothing.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await send("admin/sizes", { ...size, sortOrder: (sizes.data?.items.filter((s) => s.group === size.group).length ?? 0) });
                  setSize({ ...size, name: "" });
                  sizes.reload();
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            >
              <Input list="size-groups" value={size.group} onChange={(e) => setSize({ ...size, group: e.target.value })} placeholder="Group" aria-label="Group" className="w-40" />
              <datalist id="size-groups">
                {groups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <Input required value={size.name} onChange={(e) => setSize({ ...size, name: e.target.value })} placeholder="256GB" aria-label="Size" />
              <Button>
                <Plus /> Add
              </Button>
            </form>
            {sizes.error && <ErrorNote message={sizes.error} />}
            {!sizes.data ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : groups.length ? (
              groups.map((g) => (
                <div key={g}>
                  <p className="mb-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">{g}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sizes.data!.items
                      .filter((s) => s.group === g)
                      .map((s) => (
                        <span key={s._id} className="group inline-flex items-center gap-1 rounded-lg border bg-card py-1 pr-1 pl-2.5 text-sm font-semibold">
                          {s.name}
                          <button type="button" aria-label={`Delete ${s.name}`} onClick={() => remove("sizes", s._id, sizes.reload)} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                            <Trash2 className="size-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon={Ruler} title="No sizes yet" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
