import type { Document } from "mongodb";
import { cleanStoreIdentity } from "../content-brand";
import { z } from "zod";
import { db } from "../db";

/**
 * Third-party credentials (payments, couriers, SMS, Meta Conversions API). Stored in the
 * `settings` collection under key "integrations". Secrets are never returned to the browser
 * in full: GET responses mask them, and a masked value sent back means "keep the saved one".
 */
const str = (max = 400) => z.string().trim().max(max).default("");
export const SMS_EVENTS = ["placed", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type SmsEvent = (typeof SMS_EVENTS)[number];

export const integrationsSchema = z.object({
  courier: z
    .object({
      default: z.enum(["", "steadfast", "pathao"]).default(""),
      steadfast: z.object({ apiKey: str(), secretKey: str() }).default({}),
      pathao: z
        .object({
          sandbox: z.boolean().default(false),
          clientId: str(),
          clientSecret: str(),
          username: str(),
          password: str(),
          storeId: str(40),
        })
        .default({}),
    })
    .default({}),
  sms: z
    .object({
      provider: z.enum(["", "bulksmsbd", "smsnetbd", "custom"]).default(""),
      apiKey: str(),
      senderId: str(40),
      /** GET URL with {phone} and {message} placeholders (custom gateways). */
      customUrl: str(600),
      events: z.object(Object.fromEntries(SMS_EVENTS.map((e) => [e, z.boolean().default(false)])) as Record<SmsEvent, z.ZodDefault<z.ZodBoolean>>).default({}),
      templates: z.object(Object.fromEntries(SMS_EVENTS.map((e) => [e, str(480)])) as Record<SmsEvent, z.ZodDefault<z.ZodString>>).default({}),
    })
    .default({}),
  payments: z
    .object({
      bkash: z
        .object({ enabled: z.boolean().default(false), sandbox: z.boolean().default(true), appKey: str(), appSecret: str(), username: str(), password: str() })
        .default({}),
      nagad: z
        .object({
          enabled: z.boolean().default(false),
          sandbox: z.boolean().default(true),
          merchantId: str(40),
          merchantNumber: str(20),
          /** Nagad's payment-gateway public key (PEM or base64 body). */
          gatewayPublicKey: str(4000),
          /** Your merchant private key (PEM or base64 body). */
          merchantPrivateKey: str(6000),
        })
        .default({}),
      surjopay: z
        .object({ enabled: z.boolean().default(false), sandbox: z.boolean().default(true), username: str(), password: str(), prefix: str(10) })
        .default({}),
    })
    .default({}),
  pixel: z.object({ accessToken: str(600), testEventCode: str(40) }).default({}),
});
export type Integrations = z.infer<typeof integrationsSchema>;

const SECRET_KEYS = new Set(["apiKey", "secretKey", "clientSecret", "password", "appSecret", "merchantPrivateKey", "accessToken"]);
const MASK = "••••";

export async function getIntegrations(): Promise<Integrations> {
  const stored: Document = (await (await db()).collection("settings").findOne({ key: "integrations" })) ?? {};
  const { _id, key, updatedAt, ...rest } = stored;
  void _id;
  void key;
  void updatedAt;
  return integrationsSchema.parse(rest);
}

type Tree = { [k: string]: unknown };
function walk(value: unknown, fn: (key: string, v: unknown, saved: unknown) => unknown, saved?: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value as Tree).map(([k, v]) => {
      const prior = (saved as Tree | undefined)?.[k];
      return [k, v && typeof v === "object" && !Array.isArray(v) ? walk(v, fn, prior) : fn(k, v, prior)];
    }),
  );
}

/** Masks secrets for display: "••••abcd" when set, "" when not. */
export function maskIntegrations(value: Integrations) {
  return walk(value, (k, v) => (SECRET_KEYS.has(k) && typeof v === "string" && v ? MASK + v.slice(-4) : v)) as Integrations;
}

/** Applies an edit, keeping saved secrets whose masked placeholder was sent back unchanged. */
export async function saveIntegrations(input: unknown) {
  const saved = await getIntegrations();
  const merged = walk(input, (k, v, prior) => (SECRET_KEYS.has(k) && typeof v === "string" && v.startsWith(MASK) ? prior : v), saved);
  const value = integrationsSchema.parse(merged);
  await (await db()).collection("settings").updateOne({ key: "integrations" }, { $set: { ...value, updatedAt: new Date() } }, { upsert: true });
  return value;
}

/** Public store settings with safe defaults for fields added after the original import. */
export async function getStoreSettings() {
  const s: Document = (await (await db()).collection("settings").findOne({ key: "store" })) ?? {};
  const identity = cleanStoreIdentity(s);
  return {
    ...identity,
    shippingFee: (s.shippingFee as number) ?? 120,
    outsideDhakaFee: (s.outsideDhakaFee as number) ?? (s.shippingFee as number) ?? 120,
    pickupEnabled: Boolean(s.pickupEnabled),
    freeShippingAbove: (s.freeShippingAbove as number) ?? 0,
    lowStockThreshold: (s.lowStockThreshold as number) ?? 5,
    shippingZones: (s.shippingZones as { id: string; name: string; fee: number }[]) ?? [],
    partialPayment: (s.partialPayment as { enabled: boolean; type: "shipping" | "fixed" | "percent"; value: number }) ?? {
      enabled: false,
      type: "shipping" as const,
      value: 0,
    },
    tracking: (s.tracking as { pixelId: string; gtmId: string }) ?? { pixelId: "", gtmId: "" },
    stockAlert: (s.stockAlert as { smsEnabled: boolean; phone: string }) ?? { smsEnabled: false, phone: "" },
  };
}
