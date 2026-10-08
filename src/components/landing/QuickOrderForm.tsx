"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Img } from "@/components/ui/Img";
import { trackPurchase } from "@/lib/tracking";
import type { ImageAsset, VariantGroup } from "@/types";

interface FormProduct {
  slug: string;
  name: string;
  price: number;
  regularPrice: number;
  image: ImageAsset | null;
  inStock: boolean;
  variants?: VariantGroup[];
}

const field = "w-full rounded-xl border border-[#e8dccd] dark:border-[#3a2f28] bg-white dark:bg-[#1f1b18] px-4 py-3 text-[15px] outline-none focus:border-[var(--lp)] focus:ring-2 focus:ring-[var(--lp)]/20";
const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-BD")}`;

export function QuickOrderForm(props: {
  slug: string;
  heading: string;
  buttonLabel: string;
  note: string;
  accent: string;
  products: FormProduct[];
  zones: { id: string; name: string; fee: number }[];
  insideFee: number;
  outsideFee: number;
  freeAbove: number;
}) {
  const available = props.products.filter((p) => p.inStock);
  const [slug, setSlug] = useState(available[0]?.slug ?? "");
  const [qty, setQty] = useState(1);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [zone, setZone] = useState(props.zones[0]?.id ?? "");
  const [city, setCity] = useState("Dhaka");
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ orderNo: string; total: number } | null>(null);
  const key = useRef<string>("");
  const product = available.find((p) => p.slug === slug);
  const groups = product?.variants ?? [];
  const variant = groups.map((g) => choice[g.name] ?? g.options[0]?.value).filter(Boolean).join(" / ");
  const subtotal = (product?.price ?? 0) * qty;
  const shipping = useMemo(() => {
    if (props.freeAbove > 0 && subtotal >= props.freeAbove) return 0;
    if (props.zones.length) return props.zones.find((z) => z.id === zone)?.fee ?? 0;
    return city.trim().toLowerCase() === "dhaka" ? props.insideFee : props.outsideFee;
  }, [props, zone, city, subtotal]);

  // Save the partly filled form so staff can follow up if the visitor leaves.
  useEffect(() => {
    if (!key.current) key.current = crypto.randomUUID();
    if (customer.phone.replace(/\D/g, "").length < 11 || !product) return;
    const timer = setTimeout(() => {
      fetch("/api/commerce/checkout/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: key.current,
          source: `landing:${props.slug}`,
          customer: { name: customer.name, phone: customer.phone, address: customer.address, city: props.zones.find((z) => z.id === zone)?.name ?? city },
          items: [{ slug: product.slug, qty, variant }],
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [customer, product, qty, variant, zone, city, props.slug, props.zones]);

  if (done)
    return (
      <div className="rounded-3xl border-2 bg-white dark:bg-[#25221f] p-8 text-center" style={{ borderColor: props.accent }}>
        <p className="text-sm font-bold tracking-widest uppercase" style={{ color: props.accent }}>
          Order received
        </p>
        <h2 className="mt-2 text-2xl md:text-3xl font-extrabold text-[#222] dark:text-white">Thank you, {customer.name.split(" ")[0]}!</h2>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          Your order number is <strong className="text-[#222] dark:text-white">{done.orderNo}</strong>. Our team will call you to confirm. Pay{" "}
          <strong>{taka(done.total)}</strong> on delivery.
        </p>
      </div>
    );

  return (
    <form
      className="rounded-3xl bg-white dark:bg-[#25221f] border border-[#f0e4d6] dark:border-[#3a2f28] p-5 md:p-8 shadow-xl shadow-[#6d3f0e]/5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!product) return;
        setBusy(true);
        setError("");
        try {
          const res = await fetch(`/api/commerce/landing/${props.slug}/order`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: customer.name,
              phone: customer.phone,
              address: customer.address,
              city: props.zones.find((z) => z.id === zone)?.name ?? city,
              ...(props.zones.length ? { zone } : {}),
              items: [{ slug: product.slug, qty, variant }],
              note: customer.note,
              idempotencyKey: key.current,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "We couldn't place the order. Please call us.");
          trackPurchase({ orderNo: data.order.orderNo, total: data.order.total, items: [{ slug: product.slug, name: product.name, price: product.price, qty }] });
          setDone({ orderNo: data.order.orderNo, total: data.order.total });
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-2xl md:text-3xl font-extrabold text-center text-[#222] dark:text-white">{props.heading}</h2>
      {props.note && <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">{props.note}</p>}
      <div className="mt-6 grid md:grid-cols-[1.1fr_1fr] gap-6">
        <div className="space-y-3">
          {!available.length && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">This offer is sold out right now.</p>}
          {available.map((p) => (
            <label
              key={p.slug}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition ${slug === p.slug ? "bg-[#fffaf3] dark:bg-[#2c241d]" : "border-[#f0e4d6] dark:border-[#3a2f28]"}`}
              style={slug === p.slug ? { borderColor: props.accent } : undefined}
            >
              <input type="radio" name="product" className="sr-only" checked={slug === p.slug} onChange={() => setSlug(p.slug)} />
              <span className="relative size-16 shrink-0 rounded-xl bg-[#f5f5f5]">
                <Img asset={p.image} alt="" fill sizes="64px" className="object-contain p-1" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[#222] dark:text-white line-clamp-2">{p.name}</span>
                <span className="font-extrabold" style={{ color: props.accent }}>
                  {taka(p.price)}
                </span>
                {p.regularPrice > p.price && <s className="ml-2 text-xs text-gray-400">{taka(p.regularPrice)}</s>}
              </span>
            </label>
          ))}
          {groups.map((g) => (
            <div key={g.name}>
              <p className="mb-2 text-sm font-semibold text-[#222] dark:text-white">{g.name}</p>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const on = (choice[g.name] ?? g.options[0]?.value) === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setChoice((c) => ({ ...c, [g.name]: o.value }))}
                      className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold ${on ? "text-white" : "border-[#e8dccd] text-[#333] dark:text-gray-200"}`}
                      style={on ? { background: props.accent, borderColor: props.accent } : undefined}
                    >
                      {o.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#222] dark:text-white">Quantity</span>
            <div className="flex items-center rounded-full border border-[#e8dccd]">
              <button type="button" aria-label="Decrease quantity" className="size-10 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button type="button" aria-label="Increase quantity" className="size-10 text-lg" onClick={() => setQty((q) => Math.min(20, q + 1))}>
                +
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <input className={field} required minLength={2} placeholder="Your full name" autoComplete="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} aria-label="Full name" />
          <input className={field} required type="tel" inputMode="numeric" placeholder="Mobile number (01XXXXXXXXX)" autoComplete="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} aria-label="Mobile number" />
          <textarea className={field} required minLength={8} rows={2} placeholder="Full address (house, road, area)" autoComplete="street-address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} aria-label="Address" />
          {props.zones.length ? (
            <select className={field} value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Delivery area">
              {props.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} — {taka(z.fee)}
                </option>
              ))}
            </select>
          ) : (
            <input className={field} required placeholder="City / district" value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" />
          )}
          <dl className="rounded-2xl bg-[#fffaf3] dark:bg-[#1f1b18] p-4 text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="font-semibold">{taka(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd className="font-semibold">{shipping ? taka(shipping) : "Free"}</dd>
            </div>
            <div className="flex justify-between border-t border-[#f0e4d6] pt-2 text-base font-extrabold">
              <dt>Total (cash on delivery)</dt>
              <dd>{taka(subtotal + shipping)}</dd>
            </div>
          </dl>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button disabled={busy || !product} className="w-full rounded-2xl py-4 text-lg font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60" style={{ background: props.accent }}>
            {busy ? "Placing order…" : props.buttonLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
