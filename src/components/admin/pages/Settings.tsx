"use client";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  CreditCard,
  KeyRound,
  MessageSquareText,
  Plus,
  Save,
  Send,
  Share2,
  Store,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import { cn } from "../lib/utils";
import { dateTime, send, useApi } from "../lib/api";
import type { Settings } from "../lib/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input, NativeSelect, Textarea } from "../ui/input";
import { Skeleton, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/controls";
import { ErrorNote, Field, PageHeader, Spinner } from "../shared/kit";
import { PasswordCard } from "./Admin";

/* ---------------- Integrations types ---------------- */
interface Integrations {
  courier: {
    default: "" | "steadfast" | "pathao";
    steadfast: { apiKey: string; secretKey: string };
    pathao: { sandbox: boolean; clientId: string; clientSecret: string; username: string; password: string; storeId: string };
  };
  sms: {
    provider: "" | "bulksmsbd" | "smsnetbd" | "custom";
    apiKey: string;
    senderId: string;
    customUrl: string;
    events: Record<SmsEvent, boolean>;
    templates: Record<SmsEvent, string>;
  };
  payments: {
    bkash: { enabled: boolean; sandbox: boolean; appKey: string; appSecret: string; username: string; password: string };
    nagad: { enabled: boolean; sandbox: boolean; merchantId: string; merchantNumber: string; gatewayPublicKey: string; merchantPrivateKey: string };
    surjopay: { enabled: boolean; sandbox: boolean; username: string; password: string; prefix: string };
  };
  pixel: { accessToken: string; testEventCode: string };
}
type SmsEvent = "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
const SMS_EVENTS: { key: SmsEvent; label: string }[] = [
  { key: "placed", label: "Order placed" },
  { key: "confirmed", label: "Order confirmed" },
  { key: "shipped", label: "Order shipped" },
  { key: "delivered", label: "Order delivered" },
  { key: "cancelled", label: "Order cancelled" },
];

function Secret(props: React.ComponentProps<typeof Input>) {
  return <Input type="password" autoComplete="off" spellCheck={false} {...props} />;
}

function SaveBar({ busy, dirty, onSave, onReset }: { busy: boolean; dirty: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <CardFooter className="justify-end gap-2 border-t">
      {dirty && (
        <Button type="button" variant="ghost" onClick={onReset}>
          Discard
        </Button>
      )}
      <Button type="button" variant="brand" disabled={busy || !dirty} onClick={onSave}>
        {busy ? <Spinner /> : <Save />} Save
      </Button>
    </CardFooter>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-3.5 py-3">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/* ---------------- Store settings tabs ---------------- */
function useDraft<T>(initial: T) {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  return { draft, setDraft, saved, setSaved, dirty: JSON.stringify(draft) !== JSON.stringify(saved) };
}

function useStoreTabs({ settings }: { settings: Settings }) {
  const normal = (s: Settings): Settings => ({
    ...s,
    outsideDhakaFee: s.outsideDhakaFee ?? s.shippingFee,
    pickupEnabled: Boolean(s.pickupEnabled),
    social: { facebook: "", instagram: "", youtube: "", linkedin: "", tiktok: "", twitter: "", messenger: "", whatsapp: "", ...(s.social ?? {}) },
    shippingZones: s.shippingZones ?? [],
    partialPayment: s.partialPayment ?? { enabled: false, type: "shipping", value: 0 },
    tracking: s.tracking ?? { pixelId: "", gtmId: "" },
    stockAlert: s.stockAlert ?? { smsEnabled: false, phone: "" },
  });
  const { draft, setDraft, saved, setSaved, dirty } = useDraft(normal(settings));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const num = (v: string) => Math.max(0, Number(v) || 0);
  const save = async () => {
    setBusy(true);
    try {
      const { name, email, phone, address, shippingFee, outsideDhakaFee, pickupEnabled, freeShippingAbove, lowStockThreshold, social, shippingZones, partialPayment, tracking, stockAlert } = draft;
      await send("admin/settings", { name, email, phone, address, shippingFee, outsideDhakaFee, pickupEnabled, freeShippingAbove, lowStockThreshold, currency: "BDT", social, shippingZones, partialPayment, tracking, stockAlert }, "PATCH");
      setSaved(draft);
      toast.success("Settings saved", { description: "Changes are live in the storefront." });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const bar = <SaveBar busy={busy} dirty={dirty} onSave={save} onReset={() => setDraft(saved)} />;
  const zones = draft.shippingZones ?? [];
  return {
    store: (
      <Card>
        <CardHeader>
          <CardTitle>Store details</CardTitle>
          <CardDescription>Shown in the storefront header, footer, invoices, and receipts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Store name">
            <Input required value={draft.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Contact email">
            <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Contact phone">
            <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Currency">
            <Input value="Bangladeshi Taka (BDT)" readOnly disabled />
          </Field>
          <Field label="Business address" className="sm:col-span-2">
            <Textarea rows={3} value={draft.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label="Low-stock alert level" hint="Products at or below this quantity are flagged (each product can override it).">
            <Input type="number" min={0} max={1000} value={draft.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Math.min(1000, num(e.target.value)))} />
          </Field>
          <div className="grid gap-2">
            <ToggleRow
              label="SMS me when stock runs low"
              description="Uses your SMS gateway after orders and POS sales."
              checked={draft.stockAlert!.smsEnabled}
              onChange={(v) => set("stockAlert", { ...draft.stockAlert!, smsEnabled: v })}
            />
            {draft.stockAlert!.smsEnabled && <Input placeholder="Alert phone, e.g. 017XXXXXXXX" value={draft.stockAlert!.phone} onChange={(e) => set("stockAlert", { ...draft.stockAlert!, phone: e.target.value })} aria-label="Alert phone" />}
          </div>
        </CardContent>
        {bar}
      </Card>
    ),
    delivery: (
      <Card>
        <CardHeader>
          <CardTitle>Delivery charges & free shipping</CardTitle>
          <CardDescription>Delivery areas appear as a dropdown at checkout. Without areas, the inside/outside Dhaka charges apply.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Inside Dhaka (BDT)">
              <Input type="number" min={0} value={draft.shippingFee} onChange={(e) => set("shippingFee", num(e.target.value))} />
            </Field>
            <Field label="Outside Dhaka (BDT)">
              <Input type="number" min={0} value={draft.outsideDhakaFee} onChange={(e) => set("outsideDhakaFee", num(e.target.value))} />
            </Field>
            <Field label="Free delivery above (BDT)" hint="0 turns it off. Products and coupons can also give free delivery.">
              <Input type="number" min={0} value={draft.freeShippingAbove} onChange={(e) => set("freeShippingAbove", num(e.target.value))} />
            </Field>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Delivery areas</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={zones.length >= 30}
                onClick={() => set("shippingZones", [...zones, { id: Math.random().toString(36).slice(2, 8), name: "", fee: draft.shippingFee }])}
              >
                <Plus /> Add area
              </Button>
            </div>
            {zones.length ? (
              zones.map((z, i) => (
                <div key={z.id} className="grid grid-cols-[1fr_140px_auto] gap-2">
                  <Input aria-label="Area name" placeholder="e.g. Inside Dhaka, Dhaka suburbs, Chattogram city" value={z.name} onChange={(e) => set("shippingZones", zones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <Input aria-label="Charge" type="number" min={0} value={z.fee} onChange={(e) => set("shippingZones", zones.map((x, j) => (j === i ? { ...x, fee: num(e.target.value) } : x)))} />
                  <Button type="button" size="icon" variant="ghost" aria-label="Remove area" onClick={() => set("shippingZones", zones.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">No delivery areas — checkout uses the city rule above.</p>
            )}
          </div>
          <ToggleRow label="Store pickup" description="Customers can collect from your store address at no charge." checked={Boolean(draft.pickupEnabled)} onChange={(v) => set("pickupEnabled", v)} />
        </CardContent>
        {bar}
      </Card>
    ),
    partial: (
      <Card>
        <CardHeader>
          <CardTitle>Partial payment (advance)</CardTitle>
          <CardDescription>Ask cash-on-delivery customers to pay an advance online before you ship. Needs at least one gateway below.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <ToggleRow label="Require an advance for cash on delivery" checked={draft.partialPayment!.enabled} onChange={(v) => set("partialPayment", { ...draft.partialPayment!, enabled: v })} />
          </div>
          <Field label="Advance amount">
            <NativeSelect value={draft.partialPayment!.type} onChange={(e) => set("partialPayment", { ...draft.partialPayment!, type: e.target.value as "shipping" | "fixed" | "percent" })}>
              <option value="shipping">The delivery charge</option>
              <option value="fixed">A fixed amount</option>
              <option value="percent">A percentage of the total</option>
            </NativeSelect>
          </Field>
          {draft.partialPayment!.type !== "shipping" && (
            <Field label={draft.partialPayment!.type === "fixed" ? "Amount (BDT)" : "Percent"}>
              <Input type="number" min={0} max={draft.partialPayment!.type === "percent" ? 100 : undefined} value={draft.partialPayment!.value} onChange={(e) => set("partialPayment", { ...draft.partialPayment!, value: num(e.target.value) })} />
            </Field>
          )}
        </CardContent>
        {bar}
      </Card>
    ),
    tracking: (
      <Card>
        <CardHeader>
          <CardTitle>Tracking IDs</CardTitle>
          <CardDescription>Loaded on every storefront page. Purchase, add-to-cart, view-item and checkout events are sent automatically.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Google Tag Manager container" hint="GTM-XXXXXXX — events go to the dataLayer in GA4 ecommerce format.">
            <Input placeholder="GTM-ABC1234" value={draft.tracking!.gtmId} onChange={(e) => set("tracking", { ...draft.tracking!, gtmId: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Meta (Facebook) pixel ID" hint="Add a Conversions API token below for server-side tracking.">
            <Input placeholder="123456789012345" inputMode="numeric" value={draft.tracking!.pixelId} onChange={(e) => set("tracking", { ...draft.tracking!, pixelId: e.target.value.replace(/\D/g, "") })} />
          </Field>
        </CardContent>
        {bar}
      </Card>
    ),
    social: (
      <Card>
        <CardHeader>
          <CardTitle>Social media</CardTitle>
          <CardDescription>Shown as icons in the storefront footer. A WhatsApp number adds a floating chat button.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(["facebook", "instagram", "youtube", "tiktok", "linkedin", "twitter", "messenger"] as const).map((k) => (
            <Field key={k} label={k === "twitter" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)}>
              <Input type="url" placeholder={`https://${k === "messenger" ? "m.me" : k === "twitter" ? "x.com" : `${k}.com`}/yourstore`} value={draft.social![k] ?? ""} onChange={(e) => set("social", { ...draft.social!, [k]: e.target.value })} />
            </Field>
          ))}
          <Field label="WhatsApp number">
            <Input type="tel" placeholder="017XXXXXXXX" value={draft.social!.whatsapp ?? ""} onChange={(e) => set("social", { ...draft.social!, whatsapp: e.target.value })} />
          </Field>
        </CardContent>
        {bar}
      </Card>
    ),
  };
}

/* ---------------- Integrations tabs ---------------- */
function useIntegrationTabs({ value, gateways }: { value: Integrations; gateways: string[] }) {
  const { draft, setDraft, saved, setSaved, dirty } = useDraft(value);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(gateways);
  const [testPhone, setTestPhone] = useState("");
  const logs = useApi<{ items: { _id: string; event: string; orderNo: string; ok: boolean; response: string; createdAt: string }[] }>("admin/integrations/logs");
  const patch = <K extends keyof Integrations>(k: K, v: Integrations[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      const r = await send<{ integrations: Integrations; gateways: string[] }>("admin/integrations", draft, "PATCH");
      setDraft(r.integrations);
      setSaved(r.integrations);
      setLive(r.gateways);
      toast.success("Integration settings saved");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const bar = <SaveBar busy={busy} dirty={dirty} onSave={save} onReset={() => setDraft(saved)} />;
  const p = draft.payments;
  const gatewayCard = (key: "bkash" | "nagad" | "surjopay", title: string, fields: React.ReactNode) => (
    <div className={cn("rounded-2xl border p-4", p[key].enabled && "border-brand/40")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-bold">{title}</p>
          {live.includes(key) ? <Badge variant="success">Live at checkout</Badge> : p[key].enabled ? <Badge variant="warning">Missing credentials</Badge> : <Badge variant="muted">Off</Badge>}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            Sandbox <Switch checked={p[key].sandbox} onCheckedChange={(v) => patch("payments", { ...p, [key]: { ...p[key], sandbox: v } })} />
          </label>
          <label className="flex items-center gap-2">
            Enabled <Switch checked={p[key].enabled} onCheckedChange={(v) => patch("payments", { ...p, [key]: { ...p[key], enabled: v } })} />
          </label>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{fields}</div>
    </div>
  );
  const pf = <G extends "bkash" | "nagad" | "surjopay">(g: G, k: keyof Integrations["payments"][G], v: string) => patch("payments", { ...p, [g]: { ...p[g], [k]: v } });
  return {
    payments: (
      <Card>
        <CardHeader>
          <CardTitle>Payment gateways</CardTitle>
          <CardDescription>
            Customers can pay the full amount or a cash-on-delivery advance. Payments are confirmed with the gateway before an order is marked paid. Test in sandbox mode first. Callback URL: <code className="text-xs">/api/payments/&lt;gateway&gt;/callback</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {gatewayCard(
            "bkash",
            "bKash (tokenized checkout)",
            <>
              <Field label="App key">
                <Input value={p.bkash.appKey} onChange={(e) => pf("bkash", "appKey", e.target.value)} />
              </Field>
              <Field label="App secret">
                <Secret value={p.bkash.appSecret} onChange={(e) => pf("bkash", "appSecret", e.target.value)} />
              </Field>
              <Field label="Username">
                <Input value={p.bkash.username} onChange={(e) => pf("bkash", "username", e.target.value)} />
              </Field>
              <Field label="Password">
                <Secret value={p.bkash.password} onChange={(e) => pf("bkash", "password", e.target.value)} />
              </Field>
            </>,
          )}
          {gatewayCard(
            "nagad",
            "Nagad",
            <>
              <Field label="Merchant ID">
                <Input value={p.nagad.merchantId} onChange={(e) => pf("nagad", "merchantId", e.target.value)} />
              </Field>
              <Field label="Merchant number">
                <Input value={p.nagad.merchantNumber} onChange={(e) => pf("nagad", "merchantNumber", e.target.value)} />
              </Field>
              <Field label="Nagad public key" className="sm:col-span-2">
                <Textarea rows={3} className="font-mono text-xs" value={p.nagad.gatewayPublicKey} onChange={(e) => pf("nagad", "gatewayPublicKey", e.target.value)} />
              </Field>
              <Field label="Merchant private key" className="sm:col-span-2">
                <Textarea rows={3} className="font-mono text-xs" value={p.nagad.merchantPrivateKey} onChange={(e) => pf("nagad", "merchantPrivateKey", e.target.value)} />
              </Field>
            </>,
          )}
          {gatewayCard(
            "surjopay",
            "SurjoPay (cards, mobile banking)",
            <>
              <Field label="Username">
                <Input value={p.surjopay.username} onChange={(e) => pf("surjopay", "username", e.target.value)} />
              </Field>
              <Field label="Password">
                <Secret value={p.surjopay.password} onChange={(e) => pf("surjopay", "password", e.target.value)} />
              </Field>
              <Field label="Order prefix" hint="Provided by SurjoPay, e.g. NOK">
                <Input value={p.surjopay.prefix} maxLength={10} onChange={(e) => pf("surjopay", "prefix", e.target.value)} />
              </Field>
            </>,
          )}
        </CardContent>
        {bar}
      </Card>
    ),
    couriers: (
      <Card>
        <CardHeader>
          <CardTitle>Courier integrations</CardTitle>
          <CardDescription>Book consignments from the order screen (one at a time or in bulk) and sync their delivery status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Field label="Default courier">
            <NativeSelect value={draft.courier.default} onChange={(e) => patch("courier", { ...draft.courier, default: e.target.value as "" | "steadfast" | "pathao" })}>
              <option value="">Ask each time</option>
              <option value="steadfast">Steadfast</option>
              <option value="pathao">Pathao</option>
            </NativeSelect>
          </Field>
          <div className="rounded-2xl border p-4">
            <p className="mb-3 font-bold">Steadfast</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="API key">
                <Secret value={draft.courier.steadfast.apiKey} onChange={(e) => patch("courier", { ...draft.courier, steadfast: { ...draft.courier.steadfast, apiKey: e.target.value } })} />
              </Field>
              <Field label="Secret key">
                <Secret value={draft.courier.steadfast.secretKey} onChange={(e) => patch("courier", { ...draft.courier, steadfast: { ...draft.courier.steadfast, secretKey: e.target.value } })} />
              </Field>
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold">Pathao</p>
              <label className="flex items-center gap-2 text-sm">
                Sandbox <Switch checked={draft.courier.pathao.sandbox} onCheckedChange={(v) => patch("courier", { ...draft.courier, pathao: { ...draft.courier.pathao, sandbox: v } })} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["clientId", "Client ID", false],
                  ["clientSecret", "Client secret", true],
                  ["username", "Merchant email", false],
                  ["password", "Merchant password", true],
                  ["storeId", "Store ID", false],
                ] as const
              ).map(([k, label, secret]) => (
                <Field key={k} label={label}>
                  {secret ? (
                    <Secret value={draft.courier.pathao[k]} onChange={(e) => patch("courier", { ...draft.courier, pathao: { ...draft.courier.pathao, [k]: e.target.value } })} />
                  ) : (
                    <Input value={draft.courier.pathao[k]} onChange={(e) => patch("courier", { ...draft.courier, pathao: { ...draft.courier.pathao, [k]: e.target.value } })} />
                  )}
                </Field>
              ))}
            </div>
          </div>
        </CardContent>
        {bar}
      </Card>
    ),
    sms: (
      <Card>
        <CardHeader>
          <CardTitle>SMS gateway & automatic messages</CardTitle>
          <CardDescription>
            Placeholders: <code className="text-xs">{"{name} {orderNo} {total} {due} {courier} {tracking} {store}"}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Provider">
              <NativeSelect value={draft.sms.provider} onChange={(e) => patch("sms", { ...draft.sms, provider: e.target.value as Integrations["sms"]["provider"] })}>
                <option value="">Not connected</option>
                <option value="bulksmsbd">BulkSMSBD</option>
                <option value="smsnetbd">sms.net.bd (Alpha SMS)</option>
                <option value="custom">Other (custom URL)</option>
              </NativeSelect>
            </Field>
            {draft.sms.provider !== "custom" && (
              <>
                <Field label="API key">
                  <Secret value={draft.sms.apiKey} onChange={(e) => patch("sms", { ...draft.sms, apiKey: e.target.value })} />
                </Field>
                <Field label="Sender ID">
                  <Input value={draft.sms.senderId} onChange={(e) => patch("sms", { ...draft.sms, senderId: e.target.value })} />
                </Field>
              </>
            )}
            {draft.sms.provider === "custom" && (
              <Field label="Gateway URL" className="sm:col-span-2" hint="https:// URL with {phone} and {message} placeholders, sent as GET.">
                <Input value={draft.sms.customUrl} onChange={(e) => patch("sms", { ...draft.sms, customUrl: e.target.value })} placeholder="https://api.example.com/send?key=…&to={phone}&text={message}" />
              </Field>
            )}
          </div>
          <div className="grid gap-3">
            {SMS_EVENTS.map((ev) => (
              <div key={ev.key} className="rounded-xl border p-3">
                <label className="mb-2 flex items-center justify-between text-sm font-semibold">
                  {ev.label}
                  <Switch checked={draft.sms.events[ev.key]} onCheckedChange={(v) => patch("sms", { ...draft.sms, events: { ...draft.sms.events, [ev.key]: v } })} />
                </label>
                {draft.sms.events[ev.key] && (
                  <Textarea rows={2} maxLength={480} value={draft.sms.templates[ev.key]} placeholder="Leave empty to use the default message" onChange={(e) => patch("sms", { ...draft.sms, templates: { ...draft.sms.templates, [ev.key]: e.target.value } })} />
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2 rounded-xl bg-muted/40 p-3">
            <Field label="Send a test SMS (save first)" className="flex-1">
              <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="01XXXXXXXXX" />
            </Field>
            <Button
              type="button"
              variant="outline"
              disabled={!testPhone}
              onClick={async () => {
                const r = await send<{ ok: boolean; message: string }>("admin/integrations/test-sms", { phone: testPhone }).catch((e) => ({ ok: false, message: (e as Error).message }));
                if (r.ok) toast.success("Test SMS sent");
                else toast.error("Test SMS failed", { description: r.message });
              }}
            >
              <Send /> Send test
            </Button>
          </div>
        </CardContent>
        {bar}
      </Card>
    ),
    capi: (
      <Card>
        <CardHeader>
          <CardTitle>Meta Conversions API (server-side pixel)</CardTitle>
          <CardDescription>Purchases are sent from the server with hashed customer data, de-duplicated against the browser pixel by order number.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Access token" hint="Events Manager → Settings → Conversions API → Generate access token.">
              <Secret value={draft.pixel.accessToken} onChange={(e) => patch("pixel", { ...draft.pixel, accessToken: e.target.value })} />
            </Field>
            <Field label="Test event code (optional)" hint="Shows events in Events Manager → Test events. Clear it when you go live.">
              <Input value={draft.pixel.testEventCode} onChange={(e) => patch("pixel", { ...draft.pixel, testEventCode: e.target.value })} placeholder="TEST12345" />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">Recent server events</p>
            {logs.data?.items.length ? (
              <div className="divide-y rounded-xl border text-sm">
                {logs.data.items.map((l) => (
                  <div key={l._id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span>
                      {l.event} · {l.orderNo}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge variant={l.ok ? "success" : "destructive"}>{l.ok ? "Accepted" : "Rejected"}</Badge>
                      <span className="text-xs text-muted-foreground">{dateTime(l.createdAt)}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No server events yet. They appear after the next order once a pixel ID and token are saved.</p>
            )}
          </div>
        </CardContent>
        {bar}
      </Card>
    ),
  };
}

export function SettingsPage({ description }: { description: string }) {
  const store = useApi<{ settings: Settings }>("admin/settings");
  const integrations = useApi<{ integrations: Integrations; gateways: string[] }>("admin/integrations");
  const [tab, setTab] = useState("store");
  if (store.error) return <ErrorNote message={store.error} onRetry={store.reload} />;
  if (!store.data || !integrations.data)
    return (
      <>
        <PageHeader eyebrow="Administration" title="Settings" description={description} />
        <Skeleton className="h-96 rounded-2xl" />
      </>
    );
  return (
    <>
      <PageHeader eyebrow="Administration" title="Settings" description={description} />
      <SettingsTabs key="loaded" settings={store.data.settings} integrations={integrations.data.integrations} gateways={integrations.data.gateways} tab={tab} setTab={setTab} />
    </>
  );
}

function SettingsTabs({ settings, integrations, gateways, tab, setTab }: { settings: Settings; integrations: Integrations; gateways: string[]; tab: string; setTab: (t: string) => void }) {
  const storeTabs = useStoreTabs({ settings });
  const integrationTabs = useIntegrationTabs({ value: integrations, gateways });
  const tabs = [
    { value: "store", label: "Store", icon: Store, body: storeTabs.store },
    { value: "delivery", label: "Delivery", icon: Truck, body: storeTabs.delivery },
    { value: "payments", label: "Payments", icon: CreditCard, body: <div className="grid gap-6">{storeTabs.partial}{integrationTabs.payments}</div> },
    { value: "couriers", label: "Couriers", icon: Wallet, body: integrationTabs.couriers },
    { value: "sms", label: "SMS", icon: MessageSquareText, body: integrationTabs.sms },
    { value: "tracking", label: "Tracking", icon: BarChart3, body: <div className="grid gap-6">{storeTabs.tracking}{integrationTabs.capi}</div> },
    { value: "social", label: "Social links", icon: Share2, body: storeTabs.social },
    { value: "security", label: "Security", icon: KeyRound, body: <div className="max-w-xl"><PasswordCard /></div> },
  ];
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-5 h-auto flex-wrap justify-start">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="py-1.5">
            <t.icon /> {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} forceMount className="data-[state=inactive]:hidden">
          {t.body}
        </TabsContent>
      ))}
    </Tabs>
  );
}
