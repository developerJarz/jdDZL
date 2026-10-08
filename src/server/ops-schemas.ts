import { z } from "zod";
import { ALL_PERMISSIONS } from "../lib/permissions.ts";
import { imageAsset, slugField } from "./schemas.ts";

const money = z.number().finite().min(0).max(100_000_000);
const name = z.string().trim().min(1).max(160);
const isoDate = z.string().datetime();
const phone = z.string().trim().regex(/^(\+?880|0)?1[3-9]\d{8}$/, "Enter a Bangladesh mobile number");

export const staffSchema = z.object({
  name,
  email: z.string().trim().toLowerCase().email().max(180),
  phone: phone.or(z.literal("")).default(""),
  role: z.enum(["admin", "staff"]),
  staffRole: z.string().trim().max(60).default(""),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).max(ALL_PERMISSIONS.length).default([]),
  active: z.boolean().default(true),
  /** Required when creating; optional when editing (resets the password). */
  password: z.string().min(8).max(72).optional(),
});

export const colorSchema = z.object({ name, hex: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a hex colour such as #1a1a1a") });
export const sizeSchema = z.object({ name: z.string().trim().min(1).max(40), group: z.string().trim().max(60).default("General"), sortOrder: z.number().int().min(0).max(10000).default(0) });

export const supplierSchema = z.object({
  name,
  contactPerson: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(30).default(""),
  email: z.string().trim().email().max(180).or(z.literal("")).default(""),
  address: z.string().trim().max(500).default(""),
  note: z.string().trim().max(2000).default(""),
  active: z.boolean().default(true),
});

export const purchaseSchema = z.object({
  supplierId: z.string().regex(/^[a-f0-9]{24}$/i).nullable(),
  reference: z.string().trim().max(80).default(""),
  date: isoDate,
  status: z.enum(["ordered", "received"]),
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(180),
        variant: z.string().trim().max(200).default(""),
        qty: z.number().int().min(1).max(100000),
        unitCost: money,
      }),
    )
    .min(1)
    .max(200),
  otherCost: money.default(0),
  paid: money.default(0),
  paymentMethod: z.string().trim().max(40).default("Cash"),
  note: z.string().trim().max(2000).default(""),
});

export const EXPENSE_CATEGORIES = ["Rent", "Salaries", "Utilities", "Marketing", "Delivery", "Packaging", "Software", "Maintenance", "Other"];
export const expenseSchema = z.object({
  date: isoDate,
  category: z.string().trim().min(1).max(60),
  amount: money.refine((v) => v > 0, "Enter an amount"),
  method: z.string().trim().max(40).default("Cash"),
  reference: z.string().trim().max(120).default(""),
  note: z.string().trim().max(1000).default(""),
});

export const blockSchema = z.object({
  type: z.enum(["phone", "ip"]),
  value: z.string().trim().min(3).max(60),
  reason: z.string().trim().max(300).default(""),
});

const heading = z.string().trim().max(160).default("");
const body = z.string().max(20000).default("");
const blockBase = { id: z.string().max(40) };
export const landingBlockSchema = z.discriminatedUnion("type", [
  z.object({ ...blockBase, type: z.literal("hero"), heading, subheading: z.string().max(600).default(""), image: imageAsset.nullable().default(null), ctaLabel: z.string().max(60).default("Order now") }),
  z.object({ ...blockBase, type: z.literal("text"), heading, body }),
  z.object({ ...blockBase, type: z.literal("features"), heading, items: z.array(z.object({ title: z.string().max(120), text: z.string().max(600).default("") })).max(12).default([]) }),
  z.object({ ...blockBase, type: z.literal("gallery"), heading, images: z.array(imageAsset).max(12).default([]) }),
  z.object({ ...blockBase, type: z.literal("video"), heading, url: z.string().trim().max(300).refine((v) => !v || /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(v), "Use a YouTube link").default("") }),
  z.object({ ...blockBase, type: z.literal("testimonials"), heading, items: z.array(z.object({ name: z.string().max(80), text: z.string().max(600) })).max(12).default([]) }),
  z.object({ ...blockBase, type: z.literal("faq"), heading, items: z.array(z.object({ q: z.string().max(200), a: z.string().max(1500) })).max(20).default([]) }),
  z.object({ ...blockBase, type: z.literal("countdown"), heading, endsAt: isoDate.nullable().default(null) }),
  z.object({ ...blockBase, type: z.literal("products"), heading }),
  z.object({ ...blockBase, type: z.literal("order"), heading, buttonLabel: z.string().max(60).default("Confirm order"), note: z.string().max(400).default("") }),
]);
export type LandingBlock = z.infer<typeof landingBlockSchema>;

export const landingSchema = z.object({
  title: name,
  slug: slugField,
  active: z.boolean().default(true),
  productSlugs: z.array(z.string().max(180)).max(12).default([]),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i).default("#cb843b"),
  blocks: z.array(landingBlockSchema).max(30).default([]),
  seo: z.object({ title: z.string().max(180).default(""), description: z.string().max(400).default("") }).default({}),
});

export const pageSchema = z.object({
  title: name,
  slug: slugField,
  content: z.string().max(100000).default(""),
  active: z.boolean().default(true),
  showInFooter: z.boolean().default(false),
  seo: z.object({ title: z.string().max(180).default(""), description: z.string().max(400).default("") }).default({}),
});

export const postSchema = z.object({
  title: z.string().trim().min(1).max(220),
  slug: slugField,
  category: z.string().trim().max(80).default("News"),
  excerpt: z.string().trim().max(600).default(""),
  image: imageAsset.nullable().default(null),
  /** Markdown body for posts written in the dashboard. */
  content: z.string().max(100000).default(""),
  date: isoDate,
  active: z.boolean().default(true),
  seoTitle: z.string().trim().max(180).default(""),
});

export const posSaleSchema = z.object({
  customer: z.object({ name: z.string().trim().max(160).default(""), phone: z.string().trim().max(20).default("") }).default({}),
  items: z
    .array(z.object({ slug: z.string().min(1).max(180), variant: z.string().max(200).default(""), qty: z.number().int().min(1).max(1000), unitPrice: money.optional() }))
    .min(1)
    .max(100),
  discount: money.default(0),
  payments: z.array(z.object({ method: z.string().trim().min(1).max(40), amount: money, reference: z.string().trim().max(120).default("") })).max(5),
  note: z.string().max(500).default(""),
  idempotencyKey: z.string().uuid(),
});

export const adminOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(180),
    phone: phone,
    email: z.string().trim().email().max(180).or(z.literal("")).default(""),
    address: z.string().trim().min(5).max(800),
    city: z.string().trim().min(1).max(80),
  }),
  items: z
    .array(z.object({ slug: z.string().min(1).max(180), variant: z.string().max(200).default(""), qty: z.number().int().min(1).max(1000), unitPrice: money.optional() }))
    .min(1)
    .max(100),
  zone: z.string().max(40).nullable().default(null),
  shipping: money.optional(),
  discount: money.default(0),
  note: z.string().trim().max(1000).default(""),
  status: z.enum(["pending", "confirmed"]).default("confirmed"),
  payment: z.object({ amount: money, method: z.string().trim().max(40), reference: z.string().trim().max(120).default("") }).nullable().default(null),
  idempotencyKey: z.string().uuid(),
  incompleteId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
});

export const quickOrderSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone,
  address: z.string().trim().min(8).max(800),
  city: z.string().trim().max(80).default(""),
  zone: z.string().max(40).optional(),
  items: z.array(z.object({ slug: z.string().min(1).max(180), variant: z.string().max(200).default(""), qty: z.number().int().min(1).max(20) })).min(1).max(12),
  note: z.string().trim().max(600).default(""),
  idempotencyKey: z.string().uuid(),
});

export const draftSchema = z.object({
  key: z.string().uuid(),
  source: z.string().max(200).default("checkout"),
  customer: z.object({
    name: z.string().trim().max(160).default(""),
    phone: z.string().trim().max(20).default(""),
    email: z.string().trim().max(180).default(""),
    address: z.string().trim().max(800).default(""),
    city: z.string().trim().max(80).default(""),
  }),
  items: z.array(z.object({ slug: z.string().max(180), qty: z.number().int().min(1).max(50), variant: z.string().max(200).default("") })).max(50),
});
