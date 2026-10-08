"use client";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { api, money, send, useApi } from "../lib/api";
import type { AdminProduct, Order, PageResult } from "../lib/types";
import { Button } from "../ui/button";
import { Input, NativeSelect, Textarea } from "../ui/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/dialog";
import { Field, Spinner } from "../shared/kit";
import { LineEditor, lineFromProduct, type Line } from "../shared/list";
import { FraudPanel } from "./FraudPanel";
import { refreshBadges } from "../AdminShell";

export interface OrderPrefill {
  customer?: Partial<Order["customer"]>;
  items?: { slug: string; qty: number; variant?: string }[];
  incompleteId?: string;
}

type Options = { zones: { id: string; name: string; fee: number }[]; shippingFee: number; outsideDhakaFee: number; freeShippingAbove: number };

/** Create a backend order, or edit one that hasn't shipped yet. */
export function OrderForm({ order, prefill, onClose, onSaved }: { order?: Order | null; prefill?: OrderPrefill; onClose: () => void; onSaved: (order: Order) => void }) {
  const editing = Boolean(order);
  const options = useApi<Options>("checkout/options");
  const [customer, setCustomer] = useState({
    name: order?.customer.name ?? prefill?.customer?.name ?? "",
    phone: order?.customer.phone ?? prefill?.customer?.phone ?? "",
    email: order?.customer.email ?? prefill?.customer?.email ?? "",
    address: order?.customer.address ?? prefill?.customer?.address ?? "",
    city: order?.customer.city ?? prefill?.customer?.city ?? "Dhaka",
  });
  const [lines, setLines] = useState<Line[]>(() =>
    (order?.items ?? []).map((i) => ({ slug: i.slug, name: i.name, image: i.image ?? null, variant: i.variant, qty: i.qty, price: i.price ?? i.unitPrice, variants: [], stock: 0 })),
  );
  const [zone, setZone] = useState<string>(order?.zone ?? "");
  const [shipping, setShipping] = useState<number | null>(order ? order.shipping : null);
  const [discount, setDiscount] = useState(order?.discount ?? 0);
  const [note, setNote] = useState(order?.note ?? "");
  const [status, setStatus] = useState<"pending" | "confirmed">("confirmed");
  const [payment, setPayment] = useState({ amount: 0, method: "Cash", reference: "" });
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID());

  // Load current stock/variants for lines (edit and prefill), so variant pickers work.
  const slugs = [...new Set([...(order?.items ?? []), ...(prefill?.items ?? [])].map((i) => i.slug))].join(",");
  useEffect(() => {
    if (!slugs) return;
    api<PageResult<AdminProduct>>(`admin/products?limit=100&slugs=${encodeURIComponent(slugs)}`)
      .then((r) => {
        const bySlug = new Map(r.items.map((p) => [p.slug, p]));
        setLines((current) => {
          if (current.length)
            return current.map((l) => {
              const p = bySlug.get(l.slug);
              const base = p ? lineFromProduct(p) : null;
              return base ? { ...l, variants: base.variants, stock: base.variants.find((v) => v.key === l.variant)?.stock ?? p!.stock } : l;
            });
          return (prefill?.items ?? []).flatMap((i) => {
            const p = bySlug.get(i.slug);
            if (!p) return [];
            const line = lineFromProduct(p);
            return [{ ...line, qty: i.qty, variant: i.variant || line.variant }];
          });
        });
      })
      .catch(() => {});
  }, [slugs, prefill?.items]);

  const zones = useMemo(() => options.data?.zones ?? [], [options.data]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- default delivery area once options load
    if (!zone && zones.length && !editing) setZone(zones[0].id);
  }, [zones, zone, editing]);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const autoShipping = useMemo(() => {
    const o = options.data;
    if (!o) return 0;
    if (o.freeShippingAbove > 0 && subtotal - discount >= o.freeShippingAbove) return 0;
    const z = zones.find((x) => x.id === zone);
    if (z) return z.fee;
    return customer.city.trim().toLowerCase() === "dhaka" ? o.shippingFee : o.outsideDhakaFee;
  }, [options.data, zones, zone, customer.city, subtotal, discount]);
  const delivery = shipping ?? autoShipping;
  const total = Math.max(0, subtotal - discount) + delivery;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lines.length) return toast.error("Add at least one product.");
    setBusy(true);
    try {
      const body = {
        customer,
        items: lines.map((l) => ({ slug: l.slug, variant: l.variant, qty: l.qty, unitPrice: l.price })),
        zone: zone || null,
        shipping: delivery,
        discount,
        note,
      };
      const result = editing
        ? await send<{ order: Order }>(`admin/orders/${order!._id}/edit`, body, "PATCH")
        : await send<{ order: Order }>("admin/orders/create", {
            ...body,
            status,
            payment: payment.amount > 0 ? payment : null,
            idempotencyKey: key,
            ...(prefill?.incompleteId ? { incompleteId: prefill.incompleteId } : {}),
          });
      toast.success(editing ? "Order updated" : `Order ${result.order.orderNo} created`, { description: editing ? "Stock was adjusted for any changed items." : undefined });
      refreshBadges();
      onSaved(result.order);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-3xl">
        <form onSubmit={submit} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{editing ? `Edit ${order!.orderNo}` : "New order"}</SheetTitle>
            <SheetDescription>{editing ? "Change items, prices, delivery or customer details. Stock is adjusted by the difference." : "Phone and in-store orders. Stock is reserved straight away."}</SheetDescription>
          </SheetHeader>
          <SheetBody className="grid content-start gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer name">
                <Input required maxLength={180} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              </Field>
              <Field label="Mobile number">
                <Input required type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="01XXXXXXXXX" />
              </Field>
              <Field label="Email (optional)">
                <Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              </Field>
              <Field label="City / district">
                <Input required value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} />
              </Field>
              <Field label="Full address" className="sm:col-span-2">
                <Textarea required minLength={5} rows={2} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
              </Field>
            </div>
            {customer.phone.replace(/\D/g, "").length >= 11 && <FraudPanel phone={customer.phone} compact />}
            <div>
              <p className="mb-2 text-sm font-bold">Items</p>
              <LineEditor lines={lines} onChange={setLines} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {zones.length > 0 && (
                <Field label="Delivery area">
                  <NativeSelect
                    value={zone}
                    onChange={(e) => {
                      setZone(e.target.value);
                      setShipping(null);
                    }}
                  >
                    <option value="">Custom</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} — {money(z.fee)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              <Field label="Delivery charge" hint={shipping === null ? "Calculated from the area" : "Set manually"}>
                <Input type="number" min={0} value={delivery} onChange={(e) => setShipping(Math.max(0, Number(e.target.value) || 0))} />
              </Field>
              <Field label="Discount">
                <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} />
              </Field>
            </div>
            <Field label="Note">
              <Textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Delivery instructions, gift message…" />
            </Field>
            {!editing && (
              <div className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-4">
                <Field label="Status">
                  <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as "pending" | "confirmed")}>
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                  </NativeSelect>
                </Field>
                <Field label="Advance received">
                  <Input type="number" min={0} max={total} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: Math.max(0, Number(e.target.value) || 0) })} />
                </Field>
                <Field label="Method">
                  <NativeSelect value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
                    {["Cash", "bKash", "Nagad", "Rocket", "Bank transfer", "Card"].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Reference">
                  <Input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} placeholder="TrxID" />
                </Field>
              </div>
            )}
          </SheetBody>
          <SheetFooter className="items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Total </span>
              <strong className="text-lg tabular-nums">{money(total)}</strong>
              {!editing && payment.amount > 0 && <span className="ml-2 text-muted-foreground">· due {money(Math.max(0, total - payment.amount))}</span>}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="brand" disabled={busy}>
                {busy ? <Spinner /> : <Save />} {editing ? "Save changes" : "Create order"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
