"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { QuantityStepper } from "@/components/product/QuantityStepper";
import { Img } from "@/components/ui/Img";
import { useStore } from "@/context/store";
import { formatPlain } from "@/lib/format";

/** Cart lines, promo / voucher inputs and order summary (reference: /cart). */
export function CartView() {
  const router = useRouter();
  const { cart, ready, cartCount, cartTotal, updateQty, removeFromCart } =
    useStore();
  const [promo, setPromo] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountKey, setDiscountKey] = useState("");
  const quoteKey = JSON.stringify({ cart, promo });
  const currentDiscount = discountKey === quoteKey ? discount : 0;
  const [message, setMessage] = useState<string | null>(null);

  const applyCode = async () => {
    try {
      const res = await fetch("/api/commerce/checkout/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: cart.map((l) => ({
            slug: l.slug,
            qty: l.qty,
            variant: l.variant,
            extras: l.extras,
          })),
          coupon: promo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setDiscount(data.discount);
      setDiscountKey(quoteKey);
      setMessage(`Coupon applied. Discount: BDT ${data.discount}.`);
    } catch (error) {
      setDiscount(0);
      setMessage((error as Error).message);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Shopping Cart{" "}
        <span className="text-[#E6A817]">({ready ? cartCount : 0})</span>
      </h1>
      <div className="w-full">
        <div className="bg-white dark:bg-[#1c1a17] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm px-5 divide-y divide-gray-100 dark:divide-gray-800">
          {!ready || cart.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500">
              <p className="text-4xl mb-3" aria-hidden="true">
                🛒
              </p>
              <p className="font-semibold text-lg">Your cart is empty</p>
              <p className="text-sm mt-1">Add some products to get started</p>
              <Link
                href="/"
                className="inline-block mt-4 bg-[#D4A97A] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#c89a6b] transition"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            cart.map((l) => {
              const extras = (l.extras ?? []).reduce((s, e) => s + e.price, 0);
              return (
                <div
                  key={l.id || l.slug + (l.variant ?? "")}
                  className="py-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <Link
                    href={`/product/${l.slug}`}
                    className="relative w-20 h-20 shrink-0 rounded-xl border border-gray-100 bg-white overflow-hidden"
                  >
                    <Img
                      asset={l.image}
                      alt={l.name}
                      fill
                      sizes="80px"
                      className="object-contain p-1.5"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${l.slug}`}
                      className="font-semibold text-gray-900 dark:text-white hover:underline line-clamp-2"
                    >
                      {l.name}
                    </Link>
                    {l.variant && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {l.variant}
                      </p>
                    )}
                    {(l.extras ?? []).map((e) => (
                      <p
                        key={e.label}
                        className="text-xs text-[#6D3F0E] dark:text-[#D4A97A] mt-0.5"
                      >
                        + {e.label} (৳{formatPlain(e.price)})
                      </p>
                    ))}
                    <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
                      <span className="font-bold">৳{formatPlain(l.price)}</span>
                      {l.regularPrice > l.price && (
                        <span className="ml-2 text-gray-400 line-through text-xs">
                          ৳{formatPlain(l.regularPrice)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <QuantityStepper
                      value={l.qty}
                      onChange={(n) => updateQty(l.slug, n, l.variant, l.id)}
                    />
                    <p className="w-28 text-right font-bold text-gray-900 dark:text-white">
                      ৳{formatPlain((l.price + extras) * l.qty)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFromCart(l.slug, l.variant, l.id)}
                      aria-label={`Remove ${l.name}`}
                      className="text-gray-400 hover:text-red-500 text-xl leading-none px-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:justify-between gap-4">
          <div className="w-full md:w-80 lg:w-96 rounded-2xl space-y-3 border border-gray-100 dark:border-zinc-800 p-5 dark:bg-[#1C1A17] bg-white shadow-sm">
            {[
              {
                label: "Apply promo code",
                value: promo,
                set: setPromo,
                kind: "Promo",
              },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={f.label}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.label}
                  className="flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A97A] text-gray-800 dark:text-white"
                />
                <button
                  type="button"
                  disabled={!f.value.trim()}
                  onClick={() => applyCode()}
                  className="shrink-0 bg-[#E9DCCF] hover:bg-[#d8c7b8] text-gray-800 font-bold px-4 py-3 rounded-xl transition text-xs tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  APPLY
                </button>
              </div>
            ))}
            {message && (
              <p role="status" className="text-xs text-red-500">
                {message}
              </p>
            )}
          </div>
          <div className="w-full md:w-80 lg:w-96 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5 dark:bg-[#1C1A17] bg-white shadow-sm">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-300">
                Subtotal
              </span>
              <span className="text-sm text-gray-900 font-bold dark:text-white">
                {formatPlain(ready ? cartTotal : 0)} BDT
              </span>
            </div>
            <hr className="border-dashed border-gray-300 dark:border-gray-600" />
            <div className="flex justify-between my-4">
              <span className="text-sm text-gray-500 dark:text-gray-300">
                Total
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-bold">
                {formatPlain(ready ? cartTotal - currentDiscount : 0)} BDT
              </span>
            </div>
            <div className="flex gap-3 mt-4">
              <Link
                href="/"
                className="flex-1 inline-flex items-center justify-center text-sm font-medium text-white hover:opacity-80 transition bg-[#D4A97A] rounded-lg px-3 py-3"
              >
                Continue Shopping
              </Link>
              <button
                type="button"
                disabled={!cart.length}
                onClick={() =>
                  router.push(`/checkout?coupon=${encodeURIComponent(promo)}`)
                }
                className="flex-1 inline-flex items-center justify-center text-sm font-medium text-white hover:opacity-80 transition bg-[#101518] dark:bg-[#2a2420] rounded-lg px-3 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
