"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CallIcon,
  ChevronRightBoldIcon,
  ChevronRightThinIcon,
  CompareGoldIcon,
  EmiTagIcon,
  ExchangeIcon,
  HeartOutlineIcon,
  MessengerIcon,
  PriceCheckIcon,
  ProfitMeterIcon,
  ReplacementCalcIcon,
  StorePickupIcon,
  TruckIcon,
  ViewingIcon,
  WhatsappFilledIcon,
  WhatsappIcon,
} from "@/components/icons";
import { Dialog } from "@/components/ui/Dialog";
import { Img } from "@/components/ui/Img";
import { useStore } from "@/context/store";
import { cn, formatPlain, formatPrice, monthlyEmi } from "@/lib/format";
import type { CarePlan } from "@/services/productServices";
import type { ImageAsset, Product, ProductDetail } from "@/types";
import { ProductGallery } from "./ProductGallery";
import { trackAddToCart, trackViewItem } from "@/lib/tracking";
import { QuantityStepper } from "./QuantityStepper";

export interface ProductDetailViewProps {
  product: Product;
  detail: ProductDetail | null;
  carePlans: CarePlan[];
  contact: { phone: string; whatsapp: string; messenger: string };
  delivery: { express: string; standard: string; estimate: string };
  icons: { delivery: ImageAsset; points: ImageAsset; booking: ImageAsset };
}

type Popup = "emi" | "exchange" | "profit" | "replacement" | "price" | "stores" | null;

export function ProductDetailView({ product: p, detail, carePlans, contact, delivery, icons }: ProductDetailViewProps) {
  const router = useRouter();
  const { addToCart, toggleWishlist, inWishlist } = useStore();
  const images = p.images.length ? p.images : p.image ? [p.image] : [];
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [care, setCare] = useState<string[]>([]);
  const [careOpen, setCareOpen] = useState(true);
  const [payment, setPayment] = useState<"offer" | "regular">("offer");
  const [popup, setPopup] = useState<Popup>(null);
  const variantGroups = detail?.variants ?? [];
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(variantGroups.map((g) => [g.name, g.options[0]?.value ?? ""])),
  );

  // Tracked variants carry their own stock and (optionally) price.
  const variantKey = variantGroups.map((g) => selected[g.name]).filter(Boolean).join(" / ");
  const variantRow = p.trackVariants ? p.variantStock?.find((v) => v.key.toLowerCase() === variantKey.toLowerCase()) : undefined;
  const variantSoldOut = Boolean(p.trackVariants && p.variantStock?.length && (!variantRow || variantRow.stock <= 0));
  const purchasable = p.inStock && p.price > 0 && !p.isTba && !variantSoldOut;
  const unitPrice = variantRow?.price || p.price;
  useEffect(() => {
    trackViewItem({ slug: p.slug, name: p.name, price: p.price });
  }, [p.slug, p.name, p.price]);
  const extras = carePlans.filter((c) => care.includes(c.id)).map((c) => ({ label: c.title, price: c.price }));
  const variantLabel = Object.values(selected).filter(Boolean).join(" / ") || undefined;
  const wished = inWishlist(p.slug);
  const emiBase = p.regularPrice || p.price;

  const add = (goToCart: boolean) => {
    if (!purchasable) return;
    addToCart({ slug: p.slug, name: p.name, image: images[active] ?? p.image, price: unitPrice, regularPrice: p.regularPrice, qty, variant: variantLabel, extras });
    trackAddToCart({ slug: p.slug, name: p.name, price: unitPrice, qty, variant: variantLabel });
    if (goToCart) router.push("/checkout");
  };

  const toolButtons = [
    { key: "profit" as const, label: "Your savings", icon: <ProfitMeterIcon /> },
    { key: "replacement" as const, label: "Returns & warranty", icon: <ReplacementCalcIcon /> },
    { key: "price" as const, label: "Compare products", icon: <PriceCheckIcon /> },
  ];

  const emiRows = useMemo(() => [3, 6, 9, 12, 18, 24, 36].map((m) => ({ months: m, monthly: monthlyEmi(emiBase, m) })), [emiBase]);

  const alsoOrderFrom = (
    <div className="space-y-2">
      <h4 className="text-[20px] font-bold text-[#222222] dark:text-white tracking-wider">Questions about this model?</h4>
      {!contact.whatsapp && !contact.messenger && !contact.phone && <Link href="/support" className="inline-block rounded-xl bg-[#222] px-5 py-3 text-sm font-semibold text-white">Ask dazzle.bd about this product</Link>}
      <div className="grid grid-cols-3 gap-2">
        {contact.whatsapp && <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-colors bg-[#E9CCAE47] py-[30px] hover:opacity-80">
          <WhatsappIcon />
          <span className="text-[14px] font-semibold text-[#222222] dark:text-white">WhatsApp Us</span>
        </a>}
        {contact.messenger && <a href={contact.messenger} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-colors bg-[#E9CCAE47] py-[30px] hover:opacity-80">
          <MessengerIcon />
          <span className="text-[14px] font-semibold text-[#222222] dark:text-white">Messenger</span>
        </a>}
        {contact.phone && <a href={`tel:${contact.phone}`} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-colors bg-[#E9CCAE47] py-[30px] hover:opacity-80">
          <CallIcon />
          <span className="text-[14px] font-semibold text-[#222222] dark:text-white">Call Us</span>
        </a>}
      </div>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* left: gallery */}
        <div className="lg:col-span-5 lg:self-start lg:sticky lg:top-6">
          <div className="rounded-2xl shadow-sm p-3 transition-colors duration-200 dark:bg-[#3e3329]">
            <ProductGallery images={images} active={active} onSelect={setActive} name={p.name} />
            <div className="hidden lg:block space-y-6 pt-2">{alsoOrderFrom}</div>
          </div>
        </div>

        {/* right: purchase panel */}
        <div className="lg:col-span-7">
          <div className="space-y-5 text-gray-800 dark:text-gray-100">
            <div className="flex items-start justify-between gap-3 mb-0">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#222222] dark:text-white leading-snug">{p.name}</h1>
                {p.brandName && (
                  <div className="flex gap-1 mb-0">
                    <span className="text-gray-500 dark:text-white">By:</span>
                    <Link href={`/brands/${p.brandSlug}`} className="text-[#B57908] dark:text-[#D4A97A] hover:underline font-semibold">
                      {p.brandName}
                    </Link>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 py-4">
                  <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-gray-700">
                    <ViewingIcon />
                    <span>{p.inStock ? "In stock at our store" : "Currently out of stock"}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                  aria-pressed={wished}
                  onClick={() => toggleWishlist({ slug: p.slug, name: p.name, image: p.image, price: p.price })}
                  className={cn(
                    "w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 bg-white",
                    wished ? "border-red-300 [&_path]:fill-[#B57908]" : "border-gray-200 hover:border-red-300",
                  )}
                >
                  <HeartOutlineIcon className="text-[#B57908]" />
                </button>
                <Link
                  href={`/product-compare/${p.slug}`}
                  aria-label="Compare"
                  className="w-10 h-10 border border-[#EEEEEE] dark:border-gray-700 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  <CompareGoldIcon />
                </Link>
              </div>
            </div>

            {/* price + short description */}
            <div className="lg:flex items-center justify-between gap-4 text-sm bg-[#FAF9F6] dark:bg-[#25221F] p-4 rounded-2xl border border-[#7B4F1E]/20 dark:border-gray-800/80">
              <div className="space-y-1 w-full">
                <div className="flex flex-col md:flex-row justify-between">
                  {p.price > 0 && !p.isTba ? (
                    <div className="flex gap-2.5 items-center">
                      <span className="text-[28px] font-extrabold text-[#B57908] dark:text-[#D4A97A]">BDT {formatPlain(unitPrice)}</span>
                      {p.regularPrice > unitPrice && <span className="text-[18px] text-[#FF7575] line-through font-semibold">BDT {formatPlain(p.regularPrice)}</span>}
                    </div>
                  ) : (
                    <span className="self-start bg-[#6D3F0E] text-white text-sm font-bold px-4 py-1.5 rounded-full">To Be Announced</span>
                  )}
                  {purchasable && (
                    <div className="flex items-center gap-3 mt-3 lg:mt-0 mb-3 md:mb-0">
                      <span className="font-bold text-gray-700 dark:text-gray-300">Quantity:</span>
                      <QuantityStepper value={qty} onChange={setQty} />
                    </div>
                  )}
                </div>
                {!p.inStock && !p.isTba && <p className="text-sm font-semibold text-red-500">Currently out of stock</p>}
                {detail?.shortDescriptionHtml && (
                  <article
                    className="cms-content max-w-none text-gray-700 dark:text-white mt-3 [&_ul]:list-none! [&_ul]:pl-0! [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-[#222] dark:[&_strong]:text-white [&_p]:my-1"
                    dangerouslySetInnerHTML={{ __html: detail.shortDescriptionHtml }}
                  />
                )}
              </div>
            </div>

            {/* variants */}
            {variantGroups.length > 0 && (
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#25221F] p-5 px-9 space-y-4">
                {variantGroups.map((g) => (
                  <div key={g.name}>
                    <p className="text-sm text-[#222] dark:text-white mb-3">
                      <span className="font-medium">{g.name}</span> : <span className="text-gray-500 dark:text-gray-300">{selected[g.name]}</span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {g.options.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          aria-label={`${g.name}: ${o.value}`}
                          aria-pressed={selected[g.name] === o.value}
                          onClick={() => {
                            setSelected((s) => ({ ...s, [g.name]: o.value }));
                            setActive(o.imageIndex);
                          }}
                          className={cn(
                            "relative rounded-xl border-2 bg-white overflow-hidden",
                            o.hex || images[o.imageIndex] ? "w-14 h-14" : "min-w-14 h-11 px-3 text-sm font-semibold text-[#222]",
                            selected[g.name] === o.value ? "border-[#F27C2C]" : "border-gray-200 hover:border-gray-300",
                          )}
                        >
                          {o.hex ? (
                            <span className="absolute inset-1.5 rounded-lg border border-black/10" style={{ background: o.hex }} />
                          ) : images[o.imageIndex] ? (
                            <Img asset={images[o.imageIndex]} alt={o.value} fill sizes="56px" className="object-contain p-1" />
                          ) : (
                            o.value
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="pt-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-300">
                  {p.name} {variantLabel}
                  {variantSoldOut && <span className="ml-2 font-semibold text-[#FF7575]">— this option is sold out</span>}
                  {variantRow && !variantSoldOut && variantRow.stock <= 5 && <span className="ml-2 font-semibold text-[#B57908]">— only {variantRow.stock} left</span>}
                </p>
              </div>
            )}

            {/* dazzle.bd Care add-ons */}
            {carePlans.length > 0 && purchasable && (
              <div className="rounded-2xl bg-[#1d1b19] p-3">
                <button type="button" aria-expanded={careOpen} onClick={() => setCareOpen((o) => !o)} className="w-full flex items-center justify-between px-2 py-1 text-white">
                  <span className="flex items-center gap-2 font-semibold">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F27C2C" strokeWidth="2" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Optional product protection
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={careOpen ? "" : "rotate-180"} aria-hidden="true">
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                </button>
                {careOpen && (
                  <div className="mt-2 space-y-2">
                    {carePlans.map((c) => {
                      const on = care.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-start gap-3 bg-white dark:bg-[#2e2b28] rounded-xl p-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => setCare((cur) => (on ? cur.filter((x) => x !== c.id) : [...cur, c.id]))}
                            className="mt-2 w-4 h-4 accent-[#6D3F0E]"
                          />
                          <span className="w-9 h-9 rounded-lg bg-[#6D3F0E] flex items-center justify-center shrink-0">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" aria-hidden="true">
                              <rect x="4" y="3" width="16" height="18" rx="2" />
                              <path d="M8 8h5M8 12h8M8 16h4M17 3v4M15 5h4" />
                            </svg>
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-[#222] dark:text-white">
                              {c.title}
                              {c.description && <span className="font-normal text-gray-500">: {c.description}</span>}
                            </span>
                            <span className="inline-block mt-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">{c.coverage}</span>
                          </span>
                          <span className="text-sm font-bold text-[#222] dark:text-white whitespace-nowrap">৳{formatPlain(c.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* exchange / EMI */}
            <div className="lg:flex gap-3 my-6">
              <button
                type="button"
                onClick={() => setPopup("exchange")}
                className="flex-1 w-full mb-4 lg:mb-0 flex items-center justify-between gap-2 bg-[linear-gradient(270deg,#2CD8A4_0%,#36654B_94.87%)] text-white font-semibold text-sm px-4 py-3 rounded-xl shadow-sm hover:opacity-90 transition-opacity"
              >
                <span className="flex items-center gap-2">
                  <span className="bg-white rounded-lg p-1.5">
                    <ExchangeIcon />
                  </span>
                  Exchange
                </span>
                <ChevronRightThinIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPopup("emi")}
                className="flex-1 w-full mb-4 lg:mb-0 flex items-center justify-between gap-2 bg-[linear-gradient(90.1deg,#6533F4_0.14%,#A789FF_99.97%)] text-white font-semibold text-sm px-4 py-3 rounded-xl shadow-sm hover:opacity-90 transition-opacity"
              >
                <span className="flex items-center gap-2">
                  <span className="bg-white rounded-lg p-1.5">
                    <EmiTagIcon />
                  </span>
                  EMI
                </span>
                <ChevronRightThinIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-3 my-6">
              {toolButtons.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setPopup(t.key)}
                  className="flex-1 flex flex-col items-center gap-2 bg-[#EEEEEE] text-[#222222] font-semibold text-xs sm:text-sm px-2 sm:px-4 py-3 rounded-xl shadow-sm hover:opacity-90 transition-opacity text-center"
                >
                  <span className="rounded-lg p-1.5">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* payment option */}
            {p.price > 0 && !p.isTba && (
              <div className="lg:flex gap-3 my-6" role="radiogroup" aria-label="Payment option">
                {(
                  [
                    { key: "offer", label: "Online Price", price: p.price, note: "Cash on delivery" },
                  ] as { key: "offer" | "regular"; label: string; price: number; note: string }[]
                ).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    role="radio"
                    aria-checked={payment === o.key}
                    onClick={() => setPayment(o.key)}
                    className={cn(
                      "flex-1 w-full mb-4 lg:mb-0 flex items-center gap-3 bg-white border rounded-xl shadow-sm px-4 py-3 text-left transition-colors",
                      payment === o.key ? "border-orange-400" : "border-gray-200 dark:border-[#4a3f36]",
                    )}
                  >
                    <span className={cn("w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center", payment === o.key ? "border-orange-400" : "border-gray-300")}>
                      {payment === o.key && <span className="w-2 h-2 rounded-full bg-orange-400" />}
                    </span>
                    <span className="flex flex-col items-start text-black">
                      <span className="font-semibold text-sm">
                        {o.label}: <span className="text-[#CB843B]">{formatPlain(o.price)} ৳</span>
                      </span>
                      <span className={cn("text-[#767676] text-xs", o.key === "regular" && "bg-gray-100 px-0.5")}>{o.note}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* delivery / points / booking */}
            <div className="pb-5">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-[#FFFCD3] rounded-2xl px-3 py-6 flex flex-col items-center text-center gap-1.5">
                  <Img asset={icons.delivery} alt="" width={24} height={24} className="w-6 h-6" />
                  <p className="text-[10px] sm:text-xs text-[#222222] font-medium leading-tight">Estimated Delivery</p>
                  <p className="text-sm sm:text-base font-extrabold text-gray-800">{delivery.estimate}</p>
                </div>
                <div className="bg-[#FFEFDE] rounded-2xl px-3 py-6 flex flex-col items-center text-center gap-1.5">
                  <Img asset={icons.points} alt="" width={24} height={24} className="w-6 h-6" />
                  <p className="text-[10px] sm:text-xs text-[#222222] font-medium leading-tight">Compare your options</p>
                  <Link href={`/product-compare/${p.slug}`} className="text-sm font-semibold text-gray-800 underline">Build a shortlist</Link>
                </div>
                <div className="bg-[#F0F4FF] rounded-2xl px-3 py-6 flex flex-col items-center text-center gap-1.5">
                  <Img asset={icons.booking} alt="" width={24} height={24} className="w-6 h-6" />
                  <p className="text-[10px] sm:text-xs text-[#222222] font-medium leading-tight">Product details</p>
                  <Link href="/support" className="text-sm font-semibold text-gray-800 underline">Ask before ordering</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="block lg:hidden mt-2">{alsoOrderFrom}</div>

      {/* sticky purchase bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[1200] bg-[#f5f5f7] dark:bg-[#3e3329] border-t border-gray-200 dark:border-gray-700/60 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <div className="max-w-350 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24 gap-4">
            <div className="hidden md:flex items-start gap-2 shrink-0">
              <StorePickupIcon className="text-gray-700 dark:text-white mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">Store Pickup</p>
                <button type="button" onClick={() => setPopup("stores")} className="text-xs text-[#af7e4a] hover:underline mt-0.5 inline-block">
                  View store availability
                </button>
              </div>
            </div>
            <div className="hidden md:block w-px h-8 bg-gray-300 shrink-0" />
            <div className="hidden md:flex items-start gap-2 shrink-0">
              <TruckIcon className="text-gray-700 dark:text-white mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">Home Delivery</p>
                <p className="text-xs text-orange-500 font-medium mt-0.5">{delivery.express}</p>
                <p className="text-xs text-gray-500 mt-0.5 dark:text-white/90">{delivery.standard}</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-8 bg-gray-300 shrink-0" />
            <div className="flex flex-col justify-center shrink-0">
              {p.price > 0 && !p.isTba ? (
                <>
                  <p className="text-xl sm:text-2xl font-bold leading-tight text-gray-900 dark:text-white">{formatPrice(unitPrice * qty)} BDT</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 dark:text-white/90">Review the final amount at checkout</p>
                  <button type="button" onClick={() => setPopup("emi")} className="flex items-center gap-0.5 text-xs sm:text-sm text-[#af7e4a] font-semibold hover:underline mt-0.5 w-fit">
                    Explore financing options
                    <ChevronRightBoldIcon />
                  </button>
                </>
              ) : (
                <p className="text-lg font-bold text-gray-900 dark:text-white">To Be Announced</p>
              )}
            </div>
            {purchasable && (
              <div className="hidden md:block">
                <QuantityStepper value={qty} onChange={setQty} />
              </div>
            )}
            <div className="flex items-center md:gap-3 gap-1 shrink-0 mr-[10px] md:mr-14 lg:mr-0">
              {purchasable ? (
                <>
                  <button type="button" onClick={() => add(false)} className="shrink-0 md:px-6 px-3 sm:px-8 py-3 text-sm sm:text-base font-semibold rounded-full transition-all duration-200 whitespace-nowrap shadow-sm bg-[#E9CCAE] hover:bg-[#D4B89A] active:bg-[#C0A486] text-black">
                    Add to cart
                  </button>
                  <button type="button" onClick={() => add(true)} className="shrink-0 md:px-6 px-3 sm:px-8 py-3 text-sm sm:text-base font-semibold rounded-full transition-all duration-200 whitespace-nowrap shadow-sm bg-[#222222] hover:bg-[#444444] active:bg-[#000000] text-white">
                    Buy Now
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleWishlist({ slug: p.slug, name: p.name, image: p.image, price: p.price })}
                  className="shrink-0 px-6 py-3 text-sm sm:text-base font-semibold rounded-full bg-[#222222] text-white whitespace-nowrap"
                >
                  {wished ? "In Wishlist" : "Add to Wishlist"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {contact.whatsapp && <a
        href={contact.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact via WhatsApp"
        className="fixed md:bottom-5 bottom-10 mb-24 md:mb-0 right-4 z-[1300] w-12 h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-150"
      >
        <WhatsappFilledIcon />
      </a>}

      {popup === "emi" && (
        <Dialog title="EMI options" onClose={() => setPopup(null)}>
          <p className="text-sm text-gray-500 mb-3">
            Indicative monthly installments on the regular price (BDT {formatPlain(emiBase)}). Contact the store for bank eligibility and in-store financing. Online checkout accepts cash on delivery.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 font-medium">Tenure</th>
                <th className="py-2 font-medium text-right">Per month</th>
              </tr>
            </thead>
            <tbody>
              {emiRows.map((r) => (
                <tr key={r.months} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2 dark:text-white">{r.months} months</td>
                  <td className="py-2 text-right font-semibold dark:text-white">BDT {formatPlain(r.monthly)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link href="/emi-policy" className="inline-block mt-4 text-sm font-semibold text-[#CB843B] hover:underline">
            Read the EMI policy
          </Link>
        </Dialog>
      )}
      {popup === "exchange" && (
        <Dialog title="Exchange your old device" onClose={() => setPopup(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Trade in your current phone, tablet or laptop and put its value towards the {p.name}. Valuation is done in store or through the trade-in form.
          </p>
          <div className="flex gap-3 mt-5">
            <Link href="/trade-in" className="flex-1 text-center h-11 leading-[44px] rounded-xl bg-[#222] text-white font-semibold text-sm">
              Start trade-in
            </Link>
            <Link href="/exchange-policy" className="flex-1 text-center h-11 leading-[44px] rounded-xl border border-gray-300 font-semibold text-sm dark:text-white">
              Exchange policy
            </Link>
          </div>
        </Dialog>
      )}
      {(popup === "profit" || popup === "replacement" || popup === "price") && (
        <Dialog title={toolButtons.find((t) => t.key === popup)!.label} onClose={() => setPopup(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {popup === "profit" ? `Save BDT ${formatPlain(Math.max(0, p.regularPrice - p.price))} compared with the regular price. Your final delivery charge and any coupon discount are calculated at checkout.` : popup === "replacement" ? "Keep your invoice for warranty assistance. You can request a return or repair from your account after delivery. The store reviews eligibility against its policies." : "Compare specifications and prices before choosing your next device."}
          </p>
          <Link className="inline-block mt-5 underline font-semibold" href={popup === "price" ? `/product-compare/${p.slug}` : popup === "replacement" ? "/account" : "/cart"}>{popup === "price" ? "Compare this product" : popup === "replacement" ? "Open my account" : "View cart"}</Link>
        </Dialog>
      )}
      {popup === "stores" && (
        <Dialog title="Store availability" onClose={() => setPopup(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{p.inStock ? "Available in our store inventory. Choose store pickup at checkout when offered, and wait for collection confirmation." : "This product is currently out of stock. Save it to your wishlist or contact us for availability."} Call {contact.phone} for collection assistance.</p>
          <Link href="/shop-location" className="inline-block h-11 leading-[44px] px-6 rounded-xl bg-[#222] text-white font-semibold text-sm">
            See all store locations
          </Link>
        </Dialog>
      )}
    </>
  );
}
