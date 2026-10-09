import { z } from "zod";
import { HOME_SECTION_IDS } from "../lib/home-sections.ts";
const text = z.string().trim().min(1).max(180);
const money = z.number().finite().min(0).max(100_000_000);
export const imagePath = z
  .string()
  .refine(
    (v) =>
      (v.startsWith("/images/") && !v.includes("..")) ||
      /^\/api\/commerce\/media\/[a-f0-9]{24}$/.test(v),
    "Use a local image or upload a product image",
  );
export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
  .max(180);
export const imageAsset = z.object({
  src: imagePath,
  width: z.number().int().positive().max(20000).nullable().default(null),
  height: z.number().int().positive().max(20000).nullable().default(null),
});
const uniqueBy =
  <T>(key: (v: T) => string) =>
  (list: T[]) =>
    new Set(list.map(key)).size === list.length;
const variantGroup = z.object({
  name: z.string().trim().min(1).max(60),
  options: z
    .array(
      z.object({
        value: z.string().trim().min(1).max(80),
        imageIndex: z.number().int().min(0).max(11).default(0),
        /** Swatch colour for colour options. */
        hex: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
      }),
    )
    .min(1)
    .max(24),
});
export const productSchema = z
  .object({
    name: text,
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(180),
    code: text,
    price: money,
    regularPrice: money,
    /** Purchase cost; admin-only and never sent to the storefront. */
    costPrice: money.optional(),
    stock: z.number().int().min(0).max(1_000_000),
    /** Scanned at the POS; defaults to the SKU when empty. */
    barcode: z.string().trim().max(64).regex(/^[\x20-\x7e]*$/, "Barcodes use plain letters, digits, and symbols").default(""),
    /** Per-product low-stock alert level; falls back to the store threshold. */
    lowStockThreshold: z.number().int().min(0).max(100000).nullable().default(null),
    freeShipping: z.boolean().default(false),
    /** When on, stock and optional price are tracked per variant combination. */
    trackVariants: z.boolean().default(false),
    variantStock: z
      .array(
        z.object({
          key: z.string().trim().min(1).max(200),
          stock: z.number().int().min(0).max(1_000_000),
          price: money.nullable().default(null),
          cost: money.nullable().default(null),
          sku: z.string().trim().max(120).default(""),
          barcode: z.string().trim().max(64).default(""),
        }),
      )
      .max(300)
      .refine(uniqueBy((v) => v.key.toLowerCase()), "Each variant combination must be unique")
      .default([]),
    childCategorySlugs: z.array(z.string().max(120)).max(60).default([]),
    brandSlug: z.string().max(120).nullable(),
    brandName: z.string().max(120).nullable(),
    categorySlugs: z.array(z.string().max(120)).max(15),
    subCategorySlugs: z.array(z.string().max(120)).max(40).default([]),
    /** Legacy single-image field; `images` takes precedence when provided. */
    imageSrc: imagePath.or(z.literal("")).default(""),
    images: z.array(imageAsset).max(12).optional(),
    badge: z.string().max(100).default(""),
    recognitionBadge: z.string().max(60).optional(),
    active: z.boolean().default(true),
    isTba: z.boolean().default(false),
    endOfLife: z.boolean().default(false),
    allowPreOrder: z.boolean().default(false),
    isBestDeal: z.boolean().default(false),
    description: z.string().max(50000).optional(),
    shortDescription: z.string().max(3000).optional(),
    variants: z
      .array(variantGroup)
      .max(4)
      .refine(uniqueBy((g) => g.name.toLowerCase()), "Variant group names must be unique")
      .optional(),
    specs: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(80),
          value: z.string().trim().min(1).max(500),
        }),
      )
      .max(60)
      .optional(),
    seo: z
      .object({
        title: z.string().trim().max(180).default(""),
        description: z.string().trim().max(400).default(""),
        keywords: z.string().trim().max(400).default(""),
      })
      .optional(),
    carePlans: z.array(z.object({ id: z.string().min(1).max(80), title: z.string().trim().min(2).max(180), coverage: z.string().max(180), price: money })).max(3).refine(plans => new Set(plans.map(p => p.title)).size === plans.length, "Care plan names must be unique").default([]),
  })
  .refine((p) => p.regularPrice >= p.price, {
    message: "Regular price must be at least the sale price",
    path: ["regularPrice"],
  });
export type ProductInput = z.infer<typeof productSchema>;
export const productBulkSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f0-9]{24}$/i))
    .min(1)
    .max(200),
  action: z.enum(["publish", "archive", "delete", "add-category", "remove-category", "set-brand"]),
  category: z.string().max(120).optional(),
  brandSlug: z.string().max(120).nullable().optional(),
});
export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugField,
  image: imageAsset.nullable().default(null),
  tradeIn: z.boolean().default(false),
  active: z.boolean().default(true),
  brands: z.array(z.string().max(120)).max(150).default([]),
  subCategories: z
    .array(
      z.object({
        id: z.string().max(80).optional(),
        name: z.string().trim().min(1).max(120),
        slug: slugField,
        image: imageAsset.nullable().default(null),
        /** Third level: child categories inside a sub-category. */
        children: z
          .array(z.object({ id: z.string().max(80).optional(), name: z.string().trim().min(1).max(120), slug: slugField }))
          .max(100)
          .refine(uniqueBy((c) => c.slug), "Child category slugs must be unique")
          .default([]),
      }),
    )
    .max(100)
    .refine(uniqueBy((s) => s.slug), "Sub-category slugs must be unique")
    .default([]),
});
export const brandSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugField,
  logo: imageAsset.nullable().default(null),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});
const href = z
  .string()
  .trim()
  .max(500)
  .refine(
    // "#" marks a banner without a link (used by imported banners).
    (v) => v === "#" || (v.startsWith("/") && !v.startsWith("//")) || /^https:\/\/\S+$/.test(v),
    "Use a site path such as /offer, a full https:// address, or # for no link",
  );
const banner = z.object({
  image: imageAsset, href, newTab: z.boolean().default(false),
  headline: z.string().trim().max(160).optional(),
  text: z.string().trim().max(600).optional(),
  eyebrow: z.string().trim().max(80).optional(),
});
const productTab = z.object({
  label: z.string().trim().min(1).max(40),
  productSlugs: z.array(z.string().max(180)).max(40),
});
const slugList = (max: number) => z.array(z.string().max(180)).max(max);
export const homeSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.enum(HOME_SECTION_IDS),
        visible: z.boolean(),
        title: z.string().trim().max(80).default(""),
      }),
    )
    .refine(uniqueBy((s) => s.id), "Each section can appear only once"),
  marquee: z.array(z.object({ label: z.string().trim().min(1).max(160), href })).max(30),
  heroSlides: z.array(banner).max(12),
  categorySlugs: slugList(40),
  flashSale: z.object({
    title: z.string().trim().min(1).max(80),
    endsAt: z.string().datetime().nullable(),
    href,
    tabs: z.array(productTab).max(8),
  }),
  offerBanners: z.object({
    afterFlashSale: z.array(banner).max(4),
    afterClipToCart: z.array(banner).max(4),
    afterNewArrivals: z.array(banner).max(4),
    mostPopular: z.array(banner).max(10),
    afterFeatured: z.array(banner).max(2),
  }),
  shopByBrandSlugs: slugList(30),
  newArrivals: z.object({ tabs: z.array(productTab).max(8) }),
  mostPopularSlugs: slugList(40),
  hotDealSlugs: slugList(40),
  featuredSlugs: slugList(40),
});
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{3,30}$/),
    type: z.enum(["percent", "fixed"]),
    value: money,
    minOrder: money,
    expiresAt: z.string().datetime(),
    active: z.boolean(),
    /** Total number of orders that may use the code; 0 means unlimited. */
    usageLimit: z.number().int().min(0).max(1_000_000).default(0),
    /** Also waives the delivery charge. */
    freeShipping: z.boolean().default(false),
  })
  .refine((c) => c.type !== "percent" || c.value <= 100, {
    message: "Percentage cannot exceed 100",
    path: ["value"],
  });
export const checkoutSchema = z.object({
  delivery: z.enum(["delivery", "pickup"]).default("delivery"),
  city: z.string().max(80).optional(),
  note: z.string().trim().max(1000).default(""),
  customer: z.object({
    name: text,
    email: z.string().email().max(180),
    phone: z.string().regex(/^\+?[0-9 -]{8,20}$/),
    address: z.string().trim().min(10).max(800),
    city: text,
  }),
  items: z
    .array(
      z.object({
        slug: text,
        qty: z.number().int().min(1).max(50),
        variant: z.string().max(180).optional(),
        extras: z
          .array(z.object({ label: z.string().max(180) }))
          .max(3)
          .optional(),
      }),
    )
    .min(1)
    .max(50),
  coupon: z.string().max(30).default(""),
  idempotencyKey: z.string().uuid(),
  /** Delivery area id from the store's shipping zones. */
  zone: z.string().max(40).optional(),
  /** "cod" or an online gateway for the full amount. */
  paymentMethod: z.enum(["cod", "bkash", "nagad", "surjopay"]).default("cod"),
  /** Gateway used for a required cash-on-delivery advance. */
  advanceGateway: z.enum(["bkash", "nagad", "surjopay"]).optional(),
});
export const orderStatus = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);
const socialUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => !v || /^https:\/\/\S+$/.test(v), "Use a full https:// link")
  .default("");
export const settingsSchema = z.object({
  name: text,
  phone: text,
  email: z.string().email(),
  address: z.string().min(1).max(800),
  shippingFee: money,
  outsideDhakaFee: money.optional(),
  pickupEnabled: z.boolean().default(false),
  freeShippingAbove: money,
  lowStockThreshold: z.number().int().min(0).max(1000),
  currency: z.literal("BDT"),
  social: z
    .object({
      facebook: socialUrl,
      instagram: socialUrl,
      youtube: socialUrl,
      linkedin: socialUrl,
      tiktok: socialUrl,
      twitter: socialUrl,
      messenger: socialUrl,
      whatsapp: z.string().trim().regex(/^((\+?880|0)?1[3-9]\d{8})?$/,"Enter a Bangladesh mobile number").default(""),
    })
    .optional(),
  /** Delivery areas shown at checkout. Empty uses the inside/outside Dhaka charges. */
  shippingZones: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(40),
        name: z.string().trim().min(1).max(80),
        fee: money,
      }),
    )
    .max(30)
    .optional(),
  partialPayment: z
    .object({
      enabled: z.boolean(),
      type: z.enum(["shipping", "fixed", "percent"]),
      value: money,
    })
    .optional(),
  tracking: z
    .object({
      pixelId: z.string().trim().regex(/^(\d{10,20})?$/, "A Meta pixel ID is 10–20 digits").default(""),
      gtmId: z.string().trim().toUpperCase().regex(/^(GTM-[A-Z0-9]{4,12})?$/, "Use the GTM-XXXXXXX container ID").default(""),
    })
    .optional(),
  stockAlert: z.object({ smsEnabled: z.boolean(), phone: z.string().trim().max(20).default("") }).optional(),
});
export type StoreSettings = z.infer<typeof settingsSchema>;
