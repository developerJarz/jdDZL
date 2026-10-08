"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  Check,
  Download,
  MapPin,
  MessageSquareText,
  Pencil,
  Phone,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Truck,
  User,
  UserCheck,
  Wallet,
  X,
} from "lucide-react";
import { transitions } from "@/server/pricing";
import { cn } from "../lib/utils";
import { api, date, dateTime, exportCsv, money, send, timeAgo, useApi } from "../lib/api";
import type { AdminProduct, Order, PageResult } from "../lib/types";
import { useCan } from "../lib/me";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Input, NativeSelect, Textarea } from "../ui/input";
import { Checkbox, Separator, Switch, Tabs, TabsList, TabsTrigger } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/dialog";
import { EmptyState, ErrorNote, Field, LoadingRows, PageHeader, Pagination, SearchInput, Spinner, StatusBadge, Thumb, useConfirm } from "../shared/kit";
import { refreshBadges } from "../AdminShell";
import { FraudPanel } from "./FraudPanel";
import { OrderForm, type OrderPrefill } from "./OrderForm";

const FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"];
const ACTION_LABEL: Record<string, string> = {
  confirmed: "Confirm order",
  processing: "Start processing",
  shipped: "Mark as shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};
const CHANNEL: Record<string, string> = { web: "Website", landing: "Landing page", pos: "POS", admin: "Phone / admin" };
const METHODS = ["Cash", "bKash", "Nagad", "Rocket", "Bank transfer", "Card"];
const printInvoices = (ids: string[]) => window.open(`/admin/print/invoices?ids=${ids.join(",")}&auto=1`, "_blank");

function Stepper({ order }: { order: Order }) {
  const reached = FLOW.indexOf(order.status);
  const cancelled = order.status === "cancelled";
  return (
    <ol className="flex items-center">
      {FLOW.map((step, i) => {
        const done = !cancelled && i <= reached;
        const at = order.timeline.find((t) => t.status === step)?.at;
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span className={cn("flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-bold transition", done ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground")}>
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("text-[10.5px] font-semibold capitalize", done ? "text-foreground" : "text-muted-foreground")}>{step}</span>
              <span className="h-3 text-[10px] text-muted-foreground">{at ? date(at).replace(/ \d{4}$/, "") : ""}</span>
            </div>
            {i < FLOW.length - 1 && <span className={cn("mx-1 mb-8 h-0.5 flex-1 rounded", !cancelled && i < reached ? "bg-primary" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- Courier booking ---------------- */
function useLocations(kind: "cities" | "zones" | "areas", parent: string | null, enabled: boolean) {
  const path = enabled && (kind === "cities" || parent) ? `admin/courier/pathao?kind=${kind}${parent ? `&parent=${parent}` : ""}` : null;
  return useApi<{ items: { id: string; name: string }[] }>(path);
}

export function CourierDialog({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: () => void }) {
  const [provider, setProvider] = useState<"steadfast" | "pathao">("steadfast");
  const [city, setCity] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [area, setArea] = useState("");
  const [weight, setWeight] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ orderNo: string; ok: boolean; message: string }[] | null>(null);
  const pathao = provider === "pathao";
  const cities = useLocations("cities", null, pathao);
  const zones = useLocations("zones", city || null, pathao);
  const areas = useLocations("areas", zoneId || null, pathao);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send {ids.length} order{ids.length > 1 ? "s" : ""} to courier</DialogTitle>
          <DialogDescription>Creates consignments with the courier. The amount to collect is whatever the customer still owes.</DialogDescription>
        </DialogHeader>
        {results ? (
          <div className="divide-y rounded-xl border text-sm">
            {results.map((r) => (
              <div key={r.orderNo} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="font-semibold">{r.orderNo}</span>
                <span className={cn("text-right text-xs", r.ok ? "text-success" : "text-destructive")}>{r.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2">
              {(["steadfast", "pathao"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={cn("rounded-xl border-2 px-3 py-3 text-left text-sm font-bold capitalize transition", provider === p ? "border-brand bg-brand-soft/60" : "border-input hover:bg-muted/50")}
                >
                  {p}
                </button>
              ))}
            </div>
            {pathao && (
              <div className="grid gap-3 sm:grid-cols-2">
                {cities.error && <ErrorNote message={cities.error} />}
                <Field label="City">
                  <NativeSelect value={city} onChange={(e) => (setCity(e.target.value), setZoneId(""), setArea(""))}>
                    <option value="">Choose…</option>
                    {cities.data?.items.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Zone">
                  <NativeSelect value={zoneId} disabled={!city} onChange={(e) => (setZoneId(e.target.value), setArea(""))}>
                    <option value="">Choose…</option>
                    {zones.data?.items.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Area (optional)">
                  <NativeSelect value={area} disabled={!zoneId} onChange={(e) => setArea(e.target.value)}>
                    <option value="">—</option>
                    {areas.data?.items.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Weight (kg)">
                  <Input type="number" min={0.1} max={30} step={0.1} value={weight} onChange={(e) => setWeight(Number(e.target.value) || 0.5)} />
                </Field>
                {ids.length > 1 && <p className="text-xs text-muted-foreground sm:col-span-2">All selected orders use this city and zone.</p>}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={results ? onDone : onClose}>
            {results ? "Done" : "Cancel"}
          </Button>
          {!results && (
            <Button
              disabled={busy || (pathao && (!city || !zoneId))}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await send<{ results: { orderNo: string; ok: boolean; message: string }[] }>("admin/courier/send", {
                    ids,
                    provider,
                    ...(pathao ? { cityId: city, zoneId, ...(area ? { areaId: area } : {}), weight } : {}),
                  });
                  setResults(r.results);
                  const okCount = r.results.filter((x) => x.ok).length;
                  if (okCount) toast.success(`${okCount} consignment${okCount > 1 ? "s" : ""} booked`);
                } catch (err) {
                  toast.error((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <Spinner /> : <Truck />} Book with {provider === "pathao" ? "Pathao" : "Steadfast"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- SMS dialog ---------------- */
export function SmsDialog({ phone, orderNo, onClose }: { phone: string; orderNo?: string; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send SMS</DialogTitle>
          <DialogDescription>To {phone}</DialogDescription>
        </DialogHeader>
        <Textarea rows={4} maxLength={480} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Dear customer, your order…" />
        <p className="text-xs text-muted-foreground">
          {message.length}/480 characters · {Math.max(1, Math.ceil(message.length / 160))} SMS
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || !message.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await send<{ sent: number; error: string }>("admin/sms/send", { message, phones: [phone], orderNo });
                if (r.sent) toast.success("SMS sent");
                else toast.error("SMS not sent", { description: r.error });
                if (r.sent) onClose();
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner /> : <MessageSquareText />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Order sheet ---------------- */
function PaymentForm({ order, onSaved }: { order: Order; onSaved: () => void }) {
  const due = order.dueAmount ?? (order.paymentStatus === "paid" ? 0 : order.total);
  const [amount, setAmount] = useState(due);
  const [method, setMethod] = useState("bKash");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  if (due <= 0 || order.status === "cancelled") return null;
  return (
    <form
      className="grid gap-2 sm:grid-cols-[110px_1fr_1fr_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await send(`admin/orders/${order._id}/payment`, { amount, method, reference });
          toast.success(`${money(amount)} recorded`);
          onSaved();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Input type="number" min={1} max={due} aria-label="Amount" value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} />
      <NativeSelect aria-label="Method" value={method} onChange={(e) => setMethod(e.target.value)}>
        {METHODS.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </NativeSelect>
      <Input aria-label="Reference" placeholder="TrxID / reference" value={reference} onChange={(e) => setReference(e.target.value)} />
      <Button variant="outline" disabled={busy || amount <= 0}>
        {busy ? <Spinner /> : <Wallet />} Record
      </Button>
    </form>
  );
}

function OrderSheet({ order, onClose, onChanged, onEdit }: { order: Order; onClose: () => void; onChanged: (o?: Order) => void; onEdit: () => void }) {
  const confirm = useConfirm();
  const { can } = useCan();
  const [busy, setBusy] = useState("");
  const [sms, setSms] = useState(false);
  const [courier, setCourier] = useState(false);
  const [images, setImages] = useState<Record<string, AdminProduct["image"]>>({});
  useEffect(() => {
    const slugs = [...new Set(order.items.map((i) => i.slug))].join(",");
    api<PageResult<AdminProduct>>(`admin/products?limit=100&slugs=${encodeURIComponent(slugs)}`)
      .then((r) => setImages(Object.fromEntries(r.items.map((p) => [p.slug, p.image]))))
      .catch(() => {});
  }, [order.items]);
  const refresh = async () => {
    const fresh = await api<PageResult<Order>>(`admin/orders?limit=1&q=${encodeURIComponent(order.orderNo)}`);
    onChanged(fresh.items.find((o) => o._id === order._id));
  };
  const move = async (status: string) => {
    if (status === "cancelled" && !(await confirm({ title: `Cancel ${order.orderNo}?`, description: "Reserved stock is returned to inventory. This can't be undone.", confirmLabel: "Cancel order", destructive: true }))) return;
    if (status === "delivered" && !(await confirm({ title: "Mark as delivered?", description: "This records the remaining due as collected and counts the order toward revenue.", confirmLabel: "Mark delivered" }))) return;
    setBusy(status);
    try {
      await send(`admin/orders/${order._id}`, { status }, "PATCH");
      toast.success(`${order.orderNo} is now ${status}`);
      refreshBadges();
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy("");
    }
  };
  const next = transitions[order.status] ?? [];
  const paid = order.paidAmount ?? (order.paymentStatus === "paid" ? order.total : 0);
  const due = Math.max(0, order.total - paid);
  const editable = ["pending", "confirmed", "processing"].includes(order.status) && order.channel !== "pos";
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-xl">{order.orderNo}</SheetTitle>
            <StatusBadge value={order.status} />
            <StatusBadge value={order.paymentStatus} />
            {order.channel && order.channel !== "web" && <Badge variant="secondary">{CHANNEL[order.channel]}</Badge>}
          </div>
          <SheetDescription>
            Placed {dateTime(order.createdAt)} · {order.delivery === "pickup" ? "Store pickup" : "Home delivery"}
            {order.assignedTo && ` · Assigned to ${order.assignedTo.name}`}
          </SheetDescription>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {editable && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil /> Edit
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => printInvoices([order._id])}>
              <Printer /> Invoice
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSms(true)}>
              <MessageSquareText /> SMS
            </Button>
            {!order.shipment?.consignmentId && ["confirmed", "processing"].includes(order.status) && (
              <Button size="sm" variant="outline" onClick={() => setCourier(true)}>
                <Truck /> Book courier
              </Button>
            )}
            {(can("orders") || can("customers")) && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  if (!(await confirm({ title: `Block ${order.customer.phone}?`, description: "Checkout and landing-page orders from this number will be refused. You can unblock it from Fraud & blocking.", confirmLabel: "Block number", destructive: true }))) return;
                  try {
                    await send("admin/blocklist", { type: "phone", value: order.customer.phone, reason: `From order ${order.orderNo}` });
                    if (order.ip) await send("admin/blocklist", { type: "ip", value: order.ip, reason: `From order ${order.orderNo}` });
                    toast.success("Customer blocked");
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                }}
              >
                <Ban /> Block
              </Button>
            )}
          </div>
        </SheetHeader>
        <SheetBody className="grid content-start gap-6">
          <div className="rounded-2xl border bg-muted/30 px-4 pt-4">
            {order.status === "cancelled" ? <p className="pb-4 text-sm font-semibold text-destructive">This order was cancelled and its stock restored.</p> : <Stepper order={order} />}
          </div>
          {next.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {next.map((s) => (
                <Button key={s} variant={s === "cancelled" ? "outline" : "default"} className={cn(s === "cancelled" && "text-destructive")} disabled={Boolean(busy)} onClick={() => move(s)}>
                  {busy === s && <Spinner />} {ACTION_LABEL[s] ?? s}
                </Button>
              ))}
            </div>
          )}
          <FraudPanel phone={order.customer.phone} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                <User className="size-3.5" /> Customer
              </p>
              <p className="font-semibold">{order.customer.name}</p>
              {order.customer.email && <p className="text-sm text-muted-foreground">{order.customer.email}</p>}
              <a href={`tel:${order.customer.phone}`} className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline dark:text-brand">
                <Phone className="size-3.5" /> {order.customer.phone}
              </a>
            </div>
            <div className="rounded-xl border p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                <MapPin className="size-3.5" /> Delivery address
              </p>
              <p className="text-sm">{order.customer.address}</p>
              <p className="text-sm font-semibold">{order.customer.city}</p>
              {order.note && <p className="mt-2 rounded-md bg-warning/10 px-2 py-1 text-xs text-warning">Note: {order.note}</p>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">Items</p>
            <div className="divide-y rounded-xl border">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Thumb image={images[item.slug]} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.variant || "Standard"} · {item.qty} × {money(item.unitPrice)}
                      {item.sku ? ` · ${item.sku}` : ""}
                    </p>
                  </div>
                  <span className="font-bold tabular-nums">{money(item.unitPrice * item.qty)}</span>
                </div>
              ))}
              <div className="space-y-1.5 bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{money(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount{order.coupon ? ` (${order.coupon})` : ""}</span>
                    <span className="text-success tabular-nums">−{money(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="tabular-nums">{order.shipping ? money(order.shipping) : "Free"}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-extrabold">
                  <span>Total</span>
                  <span className="tabular-nums">{money(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Wallet className="size-4 text-brand" /> Payments
              </p>
              <p className="text-sm">
                Paid <strong className="tabular-nums">{money(paid)}</strong> · Due <strong className={cn("tabular-nums", due > 0 && "text-warning")}>{money(due)}</strong>
                {order.advanceRequired ? <span className="text-muted-foreground"> · advance {money(order.advanceRequired)}</span> : null}
              </p>
            </div>
            {(order.payments ?? []).length > 0 && (
              <ul className="space-y-1 text-sm">
                {order.payments!.map((p, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      {p.method}
                      {p.reference && <span className="text-xs text-muted-foreground"> · {p.reference}</span>}
                    </span>
                    <span className="tabular-nums">
                      {money(p.amount)} <span className="text-xs text-muted-foreground">{dateTime(p.at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <PaymentForm key={`${order._id}-${due}`} order={order} onSaved={refresh} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Truck className="size-4 text-brand" /> Courier & shipment
              </p>
              {order.shipment?.consignmentId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const r = await send<{ results: { status: string }[] }>("admin/courier/sync", { ids: [order._id] });
                      toast.success(`Courier status: ${r.results[0]?.status ?? "unknown"}`);
                      await refresh();
                    } catch (err) {
                      toast.error((err as Error).message);
                    }
                  }}
                >
                  <RefreshCw /> Sync status
                </Button>
              )}
            </div>
            {order.shipment?.consignmentId ? (
              <div className="rounded-xl border p-3 text-sm">
                <p>
                  <strong>{order.shipment.courier}</strong> · {order.shipment.trackingNumber}
                </p>
                <p className="text-muted-foreground">Courier status: {order.shipment.status ?? "—"}</p>
                {order.shipment.trackingUrl && (
                  <a href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline dark:text-brand">
                    Open tracking
                  </a>
                )}
              </div>
            ) : (
              <ShipmentForm order={order} onSaved={refresh} />
            )}
          </div>
          <div>
            <p className="mb-3 text-sm font-bold">History</p>
            <ol className="relative space-y-3 border-l pl-5">
              {[...order.timeline].reverse().map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-1 -left-[25px] size-2.5 rounded-full border-2 border-popover bg-brand" />
                  <p className="text-sm font-semibold capitalize">{t.status}</p>
                  <p className="text-xs text-muted-foreground">{dateTime(t.at)}</p>
                </li>
              ))}
            </ol>
          </div>
        </SheetBody>
        {sms && <SmsDialog phone={order.customer.phone} orderNo={order.orderNo} onClose={() => setSms(false)} />}
        {courier && (
          <CourierDialog
            ids={[order._id]}
            onClose={() => setCourier(false)}
            onDone={() => {
              setCourier(false);
              refresh();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ShipmentForm({ order, onSaved }: { order: Order; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  if (["cancelled", "delivered"].includes(order.status))
    return <p className="text-sm text-muted-foreground">{order.shipment ? `${order.shipment.courier} · ${order.shipment.trackingNumber}` : "No shipment reference was recorded."}</p>;
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await send(`admin/operations/shipment/${order._id}`, Object.fromEntries(new FormData(e.currentTarget)));
          toast.success("Shipment details saved");
          onSaved();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-xs text-muted-foreground">Booking manually with another courier? Record the reference here.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="courier" required maxLength={80} defaultValue={order.shipment?.courier} placeholder="Courier (RedX, Sundarban…)" aria-label="Courier" />
        <Input name="trackingNumber" required maxLength={120} defaultValue={order.shipment?.trackingNumber} placeholder="Tracking number" aria-label="Tracking number" />
      </div>
      <Input name="trackingUrl" type="url" maxLength={500} defaultValue={order.shipment?.trackingUrl} placeholder="https://… tracking link (optional)" aria-label="Tracking link" />
      <Input name="note" maxLength={1500} defaultValue={order.shipment?.note} placeholder="Note for the customer (optional)" aria-label="Note" />
      <Button variant="outline" disabled={busy} className="w-fit">
        {busy ? <Spinner /> : <Truck />} Save shipment
      </Button>
    </form>
  );
}

/* ---------------- Bulk bar ---------------- */
function BulkBar({ ids, onDone, onClear }: { ids: string[]; onDone: () => void; onClear: () => void }) {
  const [busy, setBusy] = useState(false);
  const [courier, setCourier] = useState(false);
  const staff = useApi<{ items: { _id: string; name: string; staffRole?: string }[] }>("admin/orders/assignees");
  const run = async (body: Record<string, unknown>, label: string) => {
    setBusy(true);
    try {
      const r = await send<{ affected: number; failed: { id: string; message: string }[] }>("admin/orders/bulk", { ids, ...body });
      toast.success(`${r.affected} order${r.affected === 1 ? "" : "s"} ${label}`, {
        description: r.failed.length ? `${r.failed.length} skipped: ${r.failed[0].message}` : undefined,
      });
      refreshBadges();
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="sticky top-[72px] z-20 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft/90 px-3 py-2 shadow-lg backdrop-blur">
      <span className="mr-1 text-sm font-bold">{ids.length} selected</span>
      <NativeSelect aria-label="Change status" className="h-8 w-auto text-xs" value="" disabled={busy} onChange={(e) => e.target.value && run({ action: "status", status: e.target.value }, `moved to ${e.target.value}`)}>
        <option value="">Change status…</option>
        {[...FLOW.slice(1), "cancelled"].map((s) => (
          <option key={s} value={s}>
            {s[0].toUpperCase() + s.slice(1)}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Assign to" className="h-8 w-auto text-xs" value="" disabled={busy} onChange={(e) => e.target.value && run({ action: "assign", staffId: e.target.value === "none" ? null : e.target.value }, "assigned")}>
        <option value="">Assign to…</option>
        {staff.data?.items.map((s) => (
          <option key={s._id} value={s._id}>
            {s.name}
          </option>
        ))}
        <option value="none">Unassign</option>
      </NativeSelect>
      <Button size="sm" variant="outline" onClick={() => printInvoices(ids)}>
        <Printer /> Print invoices
      </Button>
      <Button size="sm" variant="outline" onClick={() => setCourier(true)}>
        <Truck /> Send to courier
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          try {
            const r = await send<{ results: unknown[] }>("admin/courier/sync", { ids });
            toast.success(`Synced ${r.results.length} shipments`);
            onDone();
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      >
        <RefreshCw /> Sync courier
      </Button>
      <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label="Clear selection" onClick={onClear}>
        <X />
      </Button>
      {courier && (
        <CourierDialog
          ids={ids}
          onClose={() => setCourier(false)}
          onDone={() => {
            setCourier(false);
            onDone();
          }}
        />
      )}
    </div>
  );
}

export function OrdersPage({ description, prefill }: { description: string; prefill?: OrderPrefill }) {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [channel, setChannel] = useState("");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<Order | null>(null);
  const [form, setForm] = useState<{ order?: Order; prefill?: OrderPrefill } | null>(prefill ? { prefill } : null);
  const filters = new URLSearchParams({ q: query, status, channel, ...(mine ? { assigned: "me" } : {}) }).toString();
  const { data, error, loading, reload, setData } = useApi<PageResult<Order>>(`admin/orders?limit=20&page=${page}&${filters}`, 200);
  const counts = data?.counts ?? {};
  const all = Object.values(counts).reduce((s, n) => s + n, 0);
  const items = data?.items ?? [];
  const allChecked = items.length > 0 && items.every((o) => selected.includes(o._id));
  useEffect(() => {
    const q = params.get("q");
    const match = q && data?.items.find((o) => o.orderNo === q.toUpperCase());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deep link (?q=ORDERNO) opens the order
    if (match) setOpen((cur) => cur ?? match);
  }, [data, params]);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
    setSelected([]);
  };
  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        description={description}
        actions={
          <>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  toast.success(`Exported ${await exportCsv("orders", filters)} orders`);
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            >
              <Download /> Export
            </Button>
            <Button variant="brand" onClick={() => setForm({})}>
              <Plus /> New order
            </Button>
          </>
        }
      />
      <Tabs value={status} onValueChange={reset(setStatus)} className="mb-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="" className="py-1.5">
            All <span className="rounded-full bg-muted px-1.5 text-[10.5px] tabular-nums">{all}</span>
          </TabsTrigger>
          {[...FLOW, "cancelled"].map((s) => (
            <TabsTrigger key={s} value={s} className="py-1.5 capitalize">
              {s} <span className="rounded-full bg-muted px-1.5 text-[10.5px] tabular-nums">{counts[s] ?? 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {selected.length > 0 && <BulkBar ids={selected} onDone={() => (setSelected([]), reload())} onClear={() => setSelected([])} />}
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={reset(setQuery)} placeholder="Order no, name, phone or email…" className="sm:max-w-sm" />
          <div className="flex flex-1 flex-wrap items-center gap-3 sm:justify-end">
            <NativeSelect aria-label="Filter by channel" value={channel} onChange={(e) => reset(setChannel)(e.target.value)} className="w-auto">
              <option value="">All channels</option>
              {Object.entries(CHANNEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch checked={mine} onCheckedChange={reset(setMine)} /> <UserCheck className="size-4 text-muted-foreground" /> Assigned to me
            </label>
          </div>
        </div>
        {error && (
          <div className="p-3">
            <ErrorNote message={error} onRetry={reload} />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">
                <Checkbox aria-label="Select all on this page" checked={allChecked ? true : selected.length ? "indeterminate" : false} onCheckedChange={(on) => setSelected(on ? items.map((o) => o._id) : [])} />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Courier</TableHead>
              <TableHead className="pr-5 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <LoadingRows cols={8} />
            ) : (
              items.map((o) => {
                const on = selected.includes(o._id);
                const due = o.dueAmount ?? (o.paymentStatus === "paid" ? 0 : o.total);
                return (
                  <TableRow key={o._id} data-state={on ? "selected" : undefined} className="cursor-pointer" onClick={() => setOpen(o)}>
                    <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox aria-label={`Select ${o.orderNo}`} checked={on} onCheckedChange={(v) => setSelected((s) => (v ? [...s, o._id] : s.filter((x) => x !== o._id)))} />
                    </TableCell>
                    <TableCell>
                      <span className="block font-bold text-primary dark:text-brand">{o.orderNo}</span>
                      <span className="text-[11px] text-muted-foreground">{CHANNEL[o.channel ?? "web"]}</span>
                    </TableCell>
                    <TableCell>
                      <span className="block font-medium">{o.customer.name}</span>
                      <span className="text-xs text-muted-foreground">{o.customer.phone}</span>
                    </TableCell>
                    <TableCell>
                      <span className="block text-sm">{date(o.createdAt)}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(o.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={o.paymentStatus} />
                      {due > 0 && o.paymentStatus !== "unpaid" && <span className="mt-0.5 block text-[11px] text-muted-foreground">Due {money(due)}</span>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={o.status} />
                      {o.assignedTo && <span className="mt-0.5 block text-[11px] text-muted-foreground">{o.assignedTo.name}</span>}
                    </TableCell>
                    <TableCell className="text-xs">{o.shipment?.courier ? <span className="font-semibold">{o.shipment.courier}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="pr-5 text-right font-bold tabular-nums">{money(o.total)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {data && !items.length && <EmptyState icon={Receipt} title={query || status || channel || mine ? "No orders match" : "No orders yet"} description="Orders appear here as soon as customers check out." />}
        {data && <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} label="orders" />}
      </Card>
      {open && !form && (
        <OrderSheet
          key={open._id + open.status + (open.dueAmount ?? "")}
          order={open}
          onClose={() => setOpen(null)}
          onEdit={() => setForm({ order: open })}
          onChanged={(updated) => {
            if (updated) {
              setOpen(updated);
              setData((d) => d && { ...d, items: d.items.map((o) => (o._id === updated._id ? updated : o)) });
            }
            reload();
          }}
        />
      )}
      {form && (
        <OrderForm
          order={form.order}
          prefill={form.prefill}
          onClose={() => setForm(null)}
          onSaved={(order) => {
            setForm(null);
            setOpen(order);
            reload();
          }}
        />
      )}
    </>
  );
}
