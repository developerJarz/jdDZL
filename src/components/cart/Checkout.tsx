"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/context/store";
import { api, money, type Order } from "@/components/admin/types";
import type { Address } from "@/components/auth/account-types";
import { trackBeginCheckout, trackPurchase } from "@/lib/tracking";

type Quote = {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  lines: { name: string; qty: number; unitPrice: number; variant?: string }[];
};
type Gateway = "bkash" | "nagad" | "surjopay";
type Options = {
  pickupEnabled: boolean;
  address: string;
  zones: { id: string; name: string; fee: number }[];
  gateways: Gateway[];
  partialPayment: { enabled: boolean; type: "shipping" | "fixed" | "percent"; value: number };
};
const GATEWAY: Record<Gateway, string> = { bkash: "bKash", nagad: "Nagad", surjopay: "SurjoPay (cards, mobile banking)" };
const inputClass = "w-full rounded-xl border border-gray-200 bg-white dark:bg-zinc-800 dark:border-zinc-700 px-4 py-3 mt-2";

/** Mirrors the server rule so the customer sees the advance before ordering. */
function advanceFor(rule: Options["partialPayment"] | undefined, quote: Quote | null) {
  if (!rule?.enabled || !quote) return 0;
  const amount = rule.type === "shipping" ? quote.shipping : rule.type === "fixed" ? rule.value : (quote.total * rule.value) / 100;
  return Math.min(quote.total, Math.max(0, Math.round(amount)));
}

export function Checkout() {
  const router = useRouter();
  const { cart, ready, clearCart } = useStore();
  const params = useSearchParams();
  const [coupon, setCoupon] = useState(params.get("coupon") || "");
  const [quoteRefresh, setQuoteRefresh] = useState(0);
  const [applied, setApplied] = useState(params.get("coupon") || "");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [order, setOrder] = useState<(Order & { advanceRequired?: number }) | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [city, setCity] = useState("Dhaka");
  const [zone, setZone] = useState("");
  const [delivery, setDelivery] = useState("delivery");
  const [method, setMethod] = useState<"cod" | Gateway>("cod");
  const [advanceGateway, setAdvanceGateway] = useState<Gateway | "">("");
  const [options, setOptions] = useState<Options | null>(null);
  const key = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api<{ user: (NonNullable<typeof current> & { addresses?: Address[] }) | null }>("auth/me")
      .then((result) => {
        if (cancelled) return;
        if (!result.user) router.replace(`/auth/login?redirect=${encodeURIComponent("/checkout" + location.search)}`);
        else {
          setCurrent(result.user);
          setAddresses(result.user.addresses || []);
          const preferred = result.user.addresses?.find((a) => a.default);
          if (preferred) {
            setSelectedAddress(preferred);
            setCity(preferred.city);
          }
        }
      })
      .catch((err) => !cancelled && setError(err.message));
    api<Options>("checkout/options")
      .then((v) => {
        if (cancelled) return;
        setOptions(v);
        if (v.zones.length) setZone(v.zones[0].id);
        if (v.gateways.length) setAdvanceGateway(v.gateways[0]);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!ready || !cart.length || !current || !options) return;
    let cancelled = false;
    api<Quote>("checkout/quote", {
      method: "POST",
      body: JSON.stringify({
        items: cart.map((l) => ({ slug: l.slug, qty: l.qty, variant: l.variant, extras: l.extras })),
        coupon: applied,
        city,
        delivery,
        ...(options.zones.length && delivery === "delivery" ? { zone } : {}),
      }),
    })
      .then((result) => {
        if (cancelled) return;
        setQuote(result);
        setError("");
        if (!tracked.current) {
          tracked.current = true;
          trackBeginCheckout(cart.map((l) => ({ slug: l.slug, name: l.name, price: l.price, qty: l.qty, variant: l.variant })), result.total);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQuote(null);
          setError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready, cart, current, applied, quoteRefresh, city, delivery, zone, options]);

  // Saves what the customer has typed so the store can follow up on abandoned checkouts.
  const saveDraft = () => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const form = formRef.current;
      if (!form || !cart.length) return;
      if (!key.current) key.current = crypto.randomUUID();
      const f = new FormData(form);
      fetch("/api/commerce/checkout/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: key.current,
          source: "checkout",
          customer: { name: f.get("name"), phone: f.get("phone"), email: f.get("email"), address: f.get("address"), city: f.get("city") },
          items: cart.map((l) => ({ slug: l.slug, qty: l.qty, variant: l.variant || "" })),
        }),
      }).catch(() => {});
    }, 2000);
  };

  const advance = method === "cod" && options?.gateways.length ? advanceFor(options.partialPayment, quote) : 0;

  if (order)
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 text-center">
        <span className="text-[#6D3F0E] dark:text-[#E9CCAE] font-semibold tracking-widest">ORDER RECEIVED</span>
        <h1 className="text-3xl font-bold mt-4">Thank you, {order.customer.name}!</h1>
        <p className="mt-4">
          Your order number is <strong>{order.orderNo}</strong>.
        </p>
        <p className="mt-2">
          {order.advanceRequired
            ? `Please pay the ${money(order.advanceRequired)} advance to confirm your order; the rest is due on delivery.`
            : `Pay ${money(order.total)} on delivery. We’ll prepare your order after confirmation.`}
        </p>
        {paymentNote && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{paymentNote}</p>}
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/account" className="rounded-xl bg-[#6D3F0E] text-white px-5 py-3">
            View my orders
          </Link>
          <Link href="/" className="rounded-xl border border-gray-300 px-5 py-3">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  if (!ready || !current)
    return (
      <div className="max-w-2xl mx-auto px-5 py-20" role="status">
        {error || "Preparing checkout…"}
      </div>
    );
  if (!cart.length)
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/" className="inline-block mt-6 underline">
          Browse products
        </Link>
      </div>
    );
  const radio = (on: boolean) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${on ? "border-[#CB843B] bg-[#fffaf3] dark:bg-zinc-800" : "border-gray-200 dark:border-zinc-700"}`;
  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <Link href="/cart" className="text-sm text-gray-500">
        ← Back to cart
      </Link>
      <h1 className="text-3xl font-bold mt-5 mb-8">Checkout</h1>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
        <form
          ref={formRef}
          onInput={saveDraft}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            if (!key.current) key.current = crypto.randomUUID();
            try {
              const result = await api<{ order: Order & { advanceRequired?: number }; paymentUrl: string | null; paymentError: string }>("orders", {
                method: "POST",
                body: JSON.stringify({
                  customer: { name: f.get("name"), email: f.get("email"), phone: f.get("phone"), address: f.get("address"), city: f.get("city") },
                  items: cart.map((l) => ({ slug: l.slug, qty: l.qty, variant: l.variant, extras: l.extras })),
                  coupon: applied,
                  delivery,
                  ...(options?.zones.length && delivery === "delivery" ? { zone } : {}),
                  paymentMethod: method,
                  ...(method === "cod" && advanceGateway ? { advanceGateway } : {}),
                  note: f.get("note"),
                  idempotencyKey: key.current,
                }),
              });
              trackPurchase({
                orderNo: result.order.orderNo,
                total: result.order.total,
                shipping: result.order.shipping,
                items: result.order.items.map((i) => ({ slug: i.slug, name: i.name, price: i.unitPrice, qty: i.qty, variant: i.variant })),
              });
              clearCart();
              if (result.paymentUrl) {
                location.href = result.paymentUrl;
                return;
              }
              if (result.paymentError) setPaymentNote(`Online payment couldn't start (${result.paymentError}). You can pay later from your account.`);
              setOrder(result.order);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="text-lg font-bold mb-5">Delivery details</h2>
          {addresses.length > 0 && (
            <label className="block mb-5">
              Saved address
              <select
                className={inputClass}
                value={selectedAddress?.id || ""}
                onChange={(e) => {
                  const a = addresses.find((a) => a.id === e.target.value) || null;
                  setSelectedAddress(a);
                  setCity(a?.city || "Dhaka");
                  setQuote(null);
                }}
              >
                <option value="">Use a new address</option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} — {a.address}, {a.city}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid sm:grid-cols-2 gap-5" key={selectedAddress?.id || "new"}>
            <label>
              Full name
              <input className={inputClass} name="name" autoComplete="name" required defaultValue={selectedAddress?.name || current.name} />
            </label>
            <label>
              Email address
              <input className={inputClass} name="email" type="email" autoComplete="email" required defaultValue={current.email} />
            </label>
            <label>
              Phone number
              <input className={inputClass} name="phone" type="tel" autoComplete="tel" required defaultValue={selectedAddress?.phone || current.phone} />
            </label>
            <label>
              City
              <input
                className={inputClass}
                name="city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setQuote(null);
                }}
                autoComplete="address-level2"
                required
              />
            </label>
            {options?.zones.length && delivery === "delivery" ? (
              <label className="sm:col-span-2">
                Delivery area
                <select
                  className={inputClass}
                  value={zone}
                  onChange={(e) => {
                    setZone(e.target.value);
                    setQuote(null);
                  }}
                >
                  {options.zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} — {money(z.fee)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="sm:col-span-2">
              Full delivery address
              <textarea className={inputClass} name="address" defaultValue={selectedAddress?.address || ""} autoComplete="street-address" minLength={10} required rows={3} />
            </label>
          </div>
          {options?.pickupEnabled && (
            <label className="block mt-5">
              Delivery method
              <select
                className={inputClass}
                value={delivery}
                onChange={(e) => {
                  setDelivery(e.target.value);
                  setQuote(null);
                }}
              >
                <option value="delivery">Home delivery</option>
                <option value="pickup">Collect from store — free</option>
              </select>
              {delivery === "pickup" && (
                <span className="block text-sm mt-2">Collection address: {options.address}. Wait for the store to confirm your collection time.</span>
              )}
            </label>
          )}
          <label className="block mt-5">
            Order note (optional)
            <textarea name="note" className={inputClass} maxLength={1000} placeholder="Delivery instructions or a preferred contact time" />
          </label>
          <p className="text-sm text-gray-500 mt-4">
            Manage saved delivery addresses in{" "}
            <Link href="/account" className="underline">
              your account
            </Link>
            .
          </p>
          <h2 className="text-lg font-bold mt-8 mb-3">Payment</h2>
          <div className="space-y-3" role="radiogroup" aria-label="Payment method">
            <label className={radio(method === "cod")}>
              <input type="radio" name="payment" className="mt-1 accent-[#CB843B]" checked={method === "cod"} onChange={() => setMethod("cod")} />
              <span>
                <span className="block font-semibold">Cash on delivery</span>
                <span className="text-sm text-gray-500">
                  {advance > 0 ? `Pay ${money(advance)} advance online now, and ${money((quote?.total ?? 0) - advance)} when you receive the order.` : "Pay when you receive your order."}
                </span>
                {advance > 0 && options && options.gateways.length > 1 && (
                  <select className={inputClass} value={advanceGateway} onChange={(e) => setAdvanceGateway(e.target.value as Gateway)} aria-label="Pay the advance with">
                    {options.gateways.map((g) => (
                      <option key={g} value={g}>
                        Pay advance with {GATEWAY[g]}
                      </option>
                    ))}
                  </select>
                )}
              </span>
            </label>
            {options?.gateways.map((g) => (
              <label key={g} className={radio(method === g)}>
                <input type="radio" name="payment" className="mt-1 accent-[#CB843B]" checked={method === g} onChange={() => setMethod(g)} />
                <span>
                  <span className="block font-semibold">Pay online with {GATEWAY[g]}</span>
                  <span className="text-sm text-gray-500">You&apos;ll be redirected to complete the full payment securely.</span>
                </span>
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl mt-5">
              {error}
            </p>
          )}
          <button className="w-full bg-[#6D3F0E] hover:bg-[#5a330b] text-white rounded-xl py-4 mt-7 font-bold disabled:opacity-50" disabled={busy || !quote}>
            {busy ? "Placing order…" : method !== "cod" ? `Pay ${quote ? money(quote.total) : ""} with ${GATEWAY[method].split(" ")[0]}` : advance > 0 ? `Place order & pay ${money(advance)} advance` : "Place order"}
          </button>
        </form>
        <aside className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 h-fit">
          <h2 className="text-lg font-bold mb-5">Order summary</h2>
          {(quote?.lines || cart.map((l) => ({ name: l.name, qty: l.qty, unitPrice: l.price, variant: l.variant }))).map((l, i) => (
            <div key={i} className="flex gap-4 justify-between border-b border-gray-100 dark:border-zinc-800 py-4 text-sm">
              <span>
                {l.name}
                <small className="block text-gray-500 mt-1">
                  {l.variant ? `${l.variant} · ` : ""}Quantity: {l.qty}
                </small>
              </span>
              <strong className="shrink-0">{money(l.unitPrice * l.qty)}</strong>
            </div>
          ))}
          <label className="block mt-5 text-sm">
            Coupon code
            <div className="flex gap-2">
              <input className={inputClass} value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Enter your code" />
              <button
                type="button"
                className="border border-gray-200 rounded-xl px-4 mt-2 text-sm"
                onClick={() => {
                  setQuote(null);
                  setApplied(coupon.trim());
                  setQuoteRefresh((n) => n + 1);
                }}
              >
                Apply
              </button>
            </div>
          </label>
          {applied && (
            <button
              className="text-sm underline mt-2 text-gray-500"
              onClick={() => {
                setApplied("");
                setCoupon("");
              }}
            >
              Remove coupon
            </button>
          )}
          {quote && (
            <dl className="space-y-3 mt-6 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{money(quote.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Discount</dt>
                <dd>− {money(quote.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Delivery</dt>
                <dd>{quote.shipping ? money(quote.shipping) : "Free"}</dd>
              </div>
              <div className="flex justify-between pt-4 border-t border-gray-200 text-lg font-bold">
                <dt>Total</dt>
                <dd>{money(quote.total)}</dd>
              </div>
              {advance > 0 && (
                <div className="flex justify-between rounded-lg bg-[#fffaf3] dark:bg-zinc-800 px-3 py-2 font-semibold text-[#6D3F0E] dark:text-[#E9CCAE]">
                  <dt>Advance due now</dt>
                  <dd>{money(advance)}</dd>
                </div>
              )}
            </dl>
          )}
        </aside>
      </div>
    </div>
  );
}
