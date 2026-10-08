"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, MoreHorizontal, Pencil, Percent, Plus, Tag, Trash2, Wand2 } from "lucide-react";
import { cn } from "../lib/utils";
import { api, date, money, send, useApi } from "../lib/api";
import type { Coupon, PageResult } from "../lib/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Switch, Tabs, TabsList, TabsTrigger } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/menu";
import { EmptyState, ErrorNote, Field, LoadingRows, PageHeader, Pagination, SearchInput, Spinner, StatusBadge, useConfirm } from "../shared/kit";

const couponState = (c: Coupon) => (new Date(c.expiresAt) <= new Date() ? "expired" : c.active ? "active" : "disabled");
const toLocal = (iso: string) => new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

function CouponEditor({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<Coupon["type"]>(coupon?.type ?? "percent");
  const [code, setCode] = useState(coupon?.code ?? "");
  const [active, setActive] = useState(coupon?.active ?? true);
  const [freeShipping, setFreeShipping] = useState(coupon?.freeShipping ?? false);
  const [busy, setBusy] = useState(false);
  const [defaultExpiry] = useState(() => toLocal(coupon?.expiresAt ?? new Date(Date.now() + 30 * 86400_000).toISOString()));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            try {
              await send(
                `admin/coupons${coupon ? `/${coupon._id}` : ""}`,
                {
                  code,
                  type,
                  value: Number(f.get("value")),
                  minOrder: Number(f.get("minOrder")),
                  expiresAt: new Date(String(f.get("expiresAt"))).toISOString(),
                  active,
                  usageLimit: Math.max(0, Math.floor(Number(f.get("usageLimit")) || 0)),
                  freeShipping,
                },
                coupon ? "PATCH" : "POST",
              );
              toast.success(coupon ? "Coupon saved" : `Coupon ${code.toUpperCase()} created`);
              onSaved();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{coupon ? `Edit ${coupon.code}` : "Create a coupon"}</DialogTitle>
            <DialogDescription>Customers enter the code at checkout. Totals are always recalculated on the server.</DialogDescription>
          </DialogHeader>
          <Field
            label="Coupon code"
            htmlFor="cp-code"
            aside={
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-brand"
                onClick={() => setCode(`DAZZLE${Math.random().toString(36).slice(2, 7).toUpperCase()}`)}
              >
                <Wand2 className="size-3" /> Generate
              </button>
            }
          >
            <Input
              id="cp-code"
              required
              pattern="[A-Za-z0-9\-]{3,30}"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="EID2026"
              className="font-mono text-base font-bold tracking-widest uppercase"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {(["percent", "fixed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold transition",
                  type === t ? "border-brand bg-brand-soft/60" : "border-input hover:bg-muted/50",
                )}
              >
                {t === "percent" ? <Percent className="size-4 text-brand" /> : <Tag className="size-4 text-brand" />}
                {t === "percent" ? "Percentage off" : "Fixed amount (৳)"}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={type === "percent" ? "Discount (%)" : "Discount (BDT)"}>
              <Input name="value" type="number" min={1} max={type === "percent" ? 100 : undefined} step={1} required defaultValue={coupon?.value ?? 10} />
            </Field>
            <Field label="Minimum order (BDT)">
              <Input name="minOrder" type="number" min={0} step={1} required defaultValue={coupon?.minOrder ?? 0} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Expires">
              <Input name="expiresAt" type="datetime-local" required defaultValue={defaultExpiry} />
            </Field>
            <Field label="Usage limit" hint={coupon?.usedCount ? `Used ${coupon.usedCount} times so far. 0 = unlimited.` : "Total orders that can use it. 0 = unlimited."}>
              <Input name="usageLimit" type="number" min={0} step={1} defaultValue={coupon?.usageLimit ?? 0} />
            </Field>
          </div>
          <label className="flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-semibold">
            Also gives free delivery
            <Switch checked={freeShipping} onCheckedChange={setFreeShipping} />
          </label>
          <label className="flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-semibold">
            Coupon is active
            <Switch checked={active} onCheckedChange={setActive} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy}>{busy && <Spinner />} {coupon ? "Save coupon" : "Create coupon"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CouponsPage({ description }: { description: string }) {
  const params = useSearchParams();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Coupon | "new" | null>(params.get("new") ? "new" : null);
  const { data, error, loading, reload } = useApi<PageResult<Coupon>>(`admin/coupons?limit=50&page=${page}&q=${encodeURIComponent(query)}`, 200);
  const items = (data?.items ?? []).filter((c) => filter === "all" || couponState(c) === filter);
  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Coupons"
        description={description}
        actions={
          <Button variant="brand" onClick={() => setEditing("new")}>
            <Plus /> Create coupon
          </Button>
        }
      />
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Search codes…"
          />
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="disabled">Disabled</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
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
              <TableHead className="pl-5">Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Minimum order</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <LoadingRows cols={6} />
            ) : (
              items.map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="pl-5">
                    <button
                      type="button"
                      title="Copy code"
                      onClick={() => navigator.clipboard.writeText(c.code).then(() => toast.success(`${c.code} copied`))}
                      className="group inline-flex items-center gap-2 rounded-lg border border-dashed border-brand/50 bg-brand-soft/50 px-2.5 py-1 font-mono text-sm font-bold tracking-wider"
                    >
                      {c.code}
                      <Copy className="size-3 opacity-50 group-hover:opacity-100" />
                    </button>
                  </TableCell>
                  <TableCell className="font-bold">
                    {c.type === "percent" ? `${c.value}% off` : `${money(c.value)} off`}
                    {c.freeShipping && <span className="block text-xs font-medium text-muted-foreground">+ free delivery</span>}
                  </TableCell>
                  <TableCell className="tabular-nums">{c.minOrder ? money(c.minOrder) : "None"}</TableCell>
                  <TableCell className="text-sm">
                    {date(c.expiresAt)}
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      Used {c.usedCount ?? 0}
                      {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={couponState(c)} />
                  </TableCell>
                  <TableCell className="pr-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.code}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(c)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          onSelect={async () => {
                            if (!(await confirm({ title: `Delete ${c.code}?`, description: "Customers will no longer be able to use this code. Past orders keep their discount.", confirmLabel: "Delete coupon", destructive: true })))
                              return;
                            try {
                              await api(`admin/coupons/${c._id}`, { method: "DELETE" });
                              toast.success("Coupon deleted");
                              reload();
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
        {data && !items.length && (
          <EmptyState
            icon={Tag}
            title="No coupons here"
            description="Create a code to reward loyal customers or run a campaign."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> Create coupon
              </Button>
            }
          />
        )}
        {data && <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} label="coupons" />}
      </Card>
      {editing && (
        <CouponEditor
          coupon={editing === "new" ? null : editing}
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
