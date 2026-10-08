"use client";
import * as React from "react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Banknote, CreditCard, Minus, Plus, Printer, ScanBarcode, Search, ShoppingBag, Smartphone, Trash2, User } from "lucide-react";
import { cn } from "../lib/utils";
import { api, money, send, useApi } from "../lib/api";
import type { AdminProduct, Order, PageResult } from "../lib/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Input, NativeSelect } from "../ui/input";
import { Skeleton } from "../ui/controls";
import { EmptyState, Spinner, Thumb, useConfirm } from "../shared/kit";
import { lineFromProduct, type Line } from "../shared/list";
import { refreshBadges } from "../AdminShell";

const TENDERS = [
  { method: "Cash", icon: Banknote },
  { method: "Card", icon: CreditCard },
  { method: "bKash", icon: Smartphone },
  { method: "Nagad", icon: Smartphone },
];

export function PosPage() {
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [discount, setDiscount] = useState(0);
  const [tender, setTender] = useState("Cash");
  const [received, setReceived] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Order | null>(null);
  const scan = useRef<HTMLInputElement>(null);
  const products = useApi<PageResult<AdminProduct>>(`admin/products?limit=24&status=active&sort=stock-desc&q=${encodeURIComponent(query)}`, 200);

  const add = (p: AdminProduct, variant?: string) => {
    const base = lineFromProduct(p);
    const v = variant ? base.variants.find((x) => x.key === variant) : null;
    const line = v ? { ...base, variant: v.key, stock: v.stock, price: v.price || p.price } : base;
    if (line.stock <= 0) toast.warning(`${p.name}${line.variant ? ` (${line.variant})` : ""} is out of stock`);
    setLines((list) => {
      const i = list.findIndex((l) => l.slug === line.slug && l.variant === line.variant);
      if (i >= 0) return list.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...list, line];
    });
  };

  const lookup = async (code: string) => {
    if (!code.trim()) return;
    try {
      const r = await api<{ product: AdminProduct; variant: string }>(`admin/pos/lookup?code=${encodeURIComponent(code.trim())}`);
      add(r.product, r.variant || undefined);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = Math.max(0, subtotal - discount);
  const paid = received === "" ? total : received;
  const change = Math.max(0, paid - total);

  const complete = async () => {
    if (!lines.length || busy) return;
    if (paid < total && !(await confirm({ title: "Record a partly paid sale?", description: `Only ${money(paid)} received of ${money(total)}. The rest stays due on this order.`, confirmLabel: "Record sale" }))) return;
    setBusy(true);
    try {
      const r = await send<{ order: Order }>("admin/pos/sale", {
        customer,
        items: lines.map((l) => ({ slug: l.slug, variant: l.variant, qty: l.qty, unitPrice: l.price })),
        discount,
        payments: [{ method: tender, amount: paid, reference: "" }],
        note: "",
        idempotencyKey: crypto.randomUUID(),
      });
      setLast(r.order);
      window.open(`/admin/print/receipt?id=${r.order._id}&tendered=${paid}&auto=1`, "_blank", "width=420,height=720");
      toast.success(`Sale ${r.order.orderNo} completed`, { description: change ? `Give ${money(change)} change` : undefined });
      setLines([]);
      setDiscount(0);
      setReceived("");
      setCustomer({ name: "", phone: "" });
      refreshBadges();
      products.reload();
      scan.current?.focus();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        scan.current?.focus();
      }
      if (e.key === "F9") {
        e.preventDefault();
        complete();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid content-start gap-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <ScanBarcode className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-brand" />
            <Input
              ref={scan}
              autoFocus
              placeholder="Scan barcode or SKU + Enter (F2)"
              className="h-12 pl-11 text-base"
              aria-label="Scan barcode"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookup(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
            />
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products…" className="h-12 pl-10" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.loading && !products.data
            ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)
            : products.data?.items.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => add(p)}
                  className={cn("group overflow-hidden rounded-2xl border bg-card text-left transition hover:-translate-y-0.5 hover:border-ring/50 hover:shadow-md", p.stock <= 0 && "opacity-60")}
                >
                  <div className="relative aspect-square bg-white">
                    {p.image && <Image src={p.image.src} alt="" fill sizes="200px" className="object-contain p-3" />}
                    <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="absolute top-2 right-2">
                      {p.stock > 0 ? `${p.stock} in stock` : "Out"}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 min-h-9 text-[13px] font-semibold">{p.name}</p>
                    <p className="mt-1 font-extrabold text-primary tabular-nums dark:text-brand">{money(p.price)}</p>
                  </div>
                </button>
              ))}
        </div>
      </div>

      <Card className="h-fit gap-0 py-0 xl:sticky xl:top-24">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="flex items-center gap-2 font-bold">
            <ShoppingBag className="size-4 text-brand" /> Current sale
          </p>
          {lines.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setLines([])}>
              Clear
            </Button>
          )}
        </div>
        <div className="admin-scroll max-h-[42vh] divide-y overflow-y-auto">
          {lines.length ? (
            lines.map((l, i) => (
              <div key={`${l.slug}-${l.variant}`} className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-3">
                <Thumb image={l.image} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{l.name}</p>
                  {l.variants.length > 0 && (
                    <NativeSelect
                      aria-label="Variant"
                      className="mt-1 h-7 w-auto text-xs"
                      value={l.variant}
                      onChange={(e) => {
                        const v = l.variants.find((x) => x.key === e.target.value);
                        setLines(lines.map((x, j) => (j === i ? { ...x, variant: e.target.value, stock: v?.stock ?? 0, price: v?.price || x.price } : x)));
                      }}
                    >
                      {l.variants.map((v) => (
                        <option key={v.key} value={v.key}>
                          {v.key} ({v.stock})
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                  <div className="mt-1.5 flex items-center gap-1">
                    <Button size="icon-sm" variant="outline" aria-label="Decrease quantity" onClick={() => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))}>
                      <Minus />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                    <Button size="icon-sm" variant="outline" aria-label="Increase quantity" onClick={() => setLines(lines.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)))}>
                      <Plus />
                    </Button>
                    <Input type="number" min={0} aria-label="Unit price" value={l.price} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, price: Math.max(0, Number(e.target.value) || 0) } : x)))} className="ml-1 h-8 w-24 text-xs tabular-nums" />
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <span className="font-bold tabular-nums">{money(l.price * l.qty)}</span>
                  <Button size="icon-sm" variant="ghost" aria-label="Remove item" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState icon={ScanBarcode} title="Scan or tap a product" description="Items appear here as you add them." className="py-10" />
          )}
        </div>
        <div className="grid gap-3 border-t bg-muted/30 px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Customer name" className="pl-9" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} aria-label="Customer name" />
            </div>
            <Input placeholder="Phone (optional)" type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} aria-label="Customer phone" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{money(subtotal)}</span>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Discount</span>
            <Input type="number" min={0} max={subtotal} value={discount} onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, Number(e.target.value) || 0)))} className="h-8 w-28 text-right tabular-nums" />
          </label>
          <div className="flex items-baseline justify-between">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-extrabold tabular-nums">{money(total)}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {TENDERS.map((t) => (
              <button
                key={t.method}
                type="button"
                onClick={() => setTender(t.method)}
                className={cn("flex flex-col items-center gap-1 rounded-xl border-2 py-2 text-xs font-semibold transition", tender === t.method ? "border-brand bg-brand-soft/70" : "border-input bg-card hover:bg-muted")}
              >
                <t.icon className="size-4" /> {t.method}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Amount received</span>
            <Input type="number" min={0} placeholder={String(total)} value={received} onChange={(e) => setReceived(e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0))} className="h-9 w-32 text-right font-bold tabular-nums" />
          </label>
          {tender === "Cash" && (
            <div className="flex flex-wrap gap-1.5">
              {[500, 1000, 2000, 5000].map((n) => (
                <Button key={n} type="button" size="sm" variant="outline" onClick={() => setReceived(Math.ceil(total / n) * n || n)}>
                  {money(Math.ceil(total / n) * n || n)}
                </Button>
              ))}
            </div>
          )}
          {change > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-success/12 px-3 py-2 text-success">
              <span className="text-sm font-semibold">Change to return</span>
              <span className="text-lg font-extrabold tabular-nums">{money(change)}</span>
            </div>
          )}
          <Button variant="brand" size="lg" disabled={busy || !lines.length} onClick={complete}>
            {busy ? <Spinner /> : <Printer />} Complete sale & print (F9)
          </Button>
          {last && (
            <Button variant="ghost" size="sm" onClick={() => window.open(`/admin/print/receipt?id=${last._id}`, "_blank", "width=420,height=720")}>
              Reprint last receipt · {last.orderNo}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
