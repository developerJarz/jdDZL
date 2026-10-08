"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Boxes, Download, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { exportCsv, money, send, useApi } from "../lib/api";
import type { AdminProduct, Badges, PageResult } from "../lib/types";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Tabs, TabsList, TabsTrigger } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/menu";
import { EmptyState, ErrorNote, Field, LoadingRows, PageHeader, Pagination, SearchInput, Spinner, StatusBadge, Thumb } from "../shared/kit";
import { stockState } from "./Products";
import { refreshBadges } from "../AdminShell";

const REASONS = ["Stock received from supplier", "Inventory count correction", "Damaged / unsellable", "Inspected customer return"];

function AdjustStock({ product, onDone }: { product: AdminProduct; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const result = product.stock + delta;
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setDelta(1);
          setReason(REASONS[0]);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <SlidersHorizontal /> Adjust
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!delta) return;
            setBusy(true);
            try {
              await send("admin/operations/stock", { slug: product.slug, delta, reason });
              toast.success(`${product.name}: ${product.stock} → ${result}`);
              setOpen(false);
              refreshBadges();
              onDone();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <p className="text-sm font-bold">Adjust stock</p>
            <p className="truncate text-xs text-muted-foreground">{product.name}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" size="icon" variant="outline" aria-label="Decrease" onClick={() => setDelta((d) => d - 1)}>
              <Minus />
            </Button>
            <Input
              type="number"
              aria-label="Quantity change"
              value={delta}
              onChange={(e) => setDelta(Math.trunc(Number(e.target.value)) || 0)}
              className="h-10 text-center text-lg font-bold tabular-nums"
            />
            <Button type="button" size="icon" variant="outline" aria-label="Increase" onClick={() => setDelta((d) => d + 1)}>
              <Plus />
            </Button>
          </div>
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-center text-sm">
            {product.stock} <span className="text-muted-foreground">→</span>{" "}
            <strong className={result < 0 ? "text-destructive" : ""}>{result}</strong> units
          </p>
          <Field label="Reason">
            <Input list="stock-reasons" value={reason} minLength={5} maxLength={300} required onChange={(e) => setReason(e.target.value)} />
            <datalist id="stock-reasons">
              {REASONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
          <Button disabled={busy || !delta || result < 0}>{busy && <Spinner />} Record adjustment</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function InventoryPage({ description }: { description: string }) {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "active");
  const [sort, setSort] = useState("stock-asc");
  const [page, setPage] = useState(1);
  const filters = new URLSearchParams({ q: query, status, sort }).toString();
  const { data, error, loading, reload } = useApi<PageResult<AdminProduct>>(`admin/products?limit=25&page=${page}&${filters}`, 200);
  const badges = useApi<Badges>("admin/badges");
  const b = badges.data;
  const tabs = [
    { value: "active", label: "All active", count: b?.activeProducts },
    { value: "low", label: "Low stock", count: b?.lowStock },
    { value: "out", label: "Out of stock", count: b?.outOfStock },
    { value: "archived", label: "Archived", count: b?.archived },
  ];
  const done = () => {
    reload();
    badges.reload();
  };
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Inventory"
        description={description}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/stock-ledger">View movements</Link>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  toast.success(`Exported ${await exportCsv("products", filters, "inventory")} products`);
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            >
              <Download /> Export
            </Button>
          </>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Active products", value: b?.activeProducts, tone: "" },
          { label: "Running low", value: b?.lowStock, tone: "text-warning" },
          { label: "Out of stock", value: b?.outOfStock, tone: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="py-4">
            <CardContent>
              <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-extrabold tabular-nums ${s.tone}`}>{s.value ?? "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        className="mb-4"
      >
        <TabsList className="h-auto flex-wrap justify-start">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="py-1.5">
              {t.label} {t.count !== undefined && <span className="rounded-full bg-muted px-1.5 text-[10.5px] tabular-nums">{t.count}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:justify-between">
          <SearchInput
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Search name or SKU…"
          />
          <Tabs value={sort} onValueChange={setSort}>
            <TabsList>
              <TabsTrigger value="stock-asc">Lowest stock</TabsTrigger>
              <TabsTrigger value="stock-desc">Highest stock</TabsTrigger>
              <TabsTrigger value="updated">Recently updated</TabsTrigger>
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
              <TableHead className="pl-5">Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Retail value</TableHead>
              <TableHead className="pr-5 text-right">Adjust</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <LoadingRows cols={6} />
            ) : (
              data?.items.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="max-w-[360px] pl-5">
                    <Link href={`/admin/products/${p._id}`} className="flex items-center gap-3">
                      <Thumb image={p.image} size={40} />
                      <span className="truncate font-semibold hover:text-primary dark:hover:text-brand">{p.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.code}</TableCell>
                  <TableCell>
                    <StatusBadge value={p.active ? stockState(p) : "archived"} />
                  </TableCell>
                  <TableCell className="text-right text-base font-extrabold tabular-nums">{p.stock}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{money(p.stock * p.price)}</TableCell>
                  <TableCell className="pr-5 text-right">
                    <AdjustStock product={p} onDone={done} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data && !data.items.length && <EmptyState icon={Boxes} title="Nothing here" description="No products match this view." />}
        {data && <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} label="products" />}
      </Card>
    </>
  );
}
