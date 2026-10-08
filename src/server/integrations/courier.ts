import type { Document } from "mongodb";
import { db } from "../db";
import { HttpError } from "../http";
import { getIntegrations } from "./config";

export type CourierProvider = "steadfast" | "pathao";
export interface Consignment {
  courier: string;
  consignmentId: string;
  trackingNumber: string;
  trackingUrl: string;
  status: string;
}

const STEADFAST = "https://portal.packzy.com/api/v1";
const pathaoBase = (sandbox: boolean) => (sandbox ? "https://courier-api-sandbox.pathao.com" : "https://api-hermes.pathao.com");

async function json(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = (body as { message?: string; errors?: unknown }).message || JSON.stringify((body as { errors?: unknown }).errors ?? "") || `HTTP ${response.status}`;
    throw new HttpError(502, `Courier rejected the request: ${String(detail).slice(0, 240)}`);
  }
  return body as Record<string, unknown>;
}

async function steadfastHeaders() {
  const { courier } = await getIntegrations();
  if (!courier.steadfast.apiKey || !courier.steadfast.secretKey) throw new HttpError(400, "Add your Steadfast API key and secret key in Settings → Couriers.");
  return { "Api-Key": courier.steadfast.apiKey, "Secret-Key": courier.steadfast.secretKey, "Content-Type": "application/json" };
}

/** Pathao access tokens last days; cache one in the database until shortly before expiry. */
async function pathaoToken() {
  const { courier } = await getIntegrations();
  const p = courier.pathao;
  if (!p.clientId || !p.clientSecret || !p.username || !p.password) throw new HttpError(400, "Add your Pathao client credentials in Settings → Couriers.");
  const database = await db();
  const cached = await database.collection("settings").findOne({ key: "pathaoToken" });
  if (cached?.token && cached.expiresAt > new Date() && cached.sandbox === p.sandbox && cached.clientId === p.clientId) return { token: cached.token as string, p };
  const body = await json(
    await fetch(`${pathaoBase(p.sandbox)}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: p.clientId, client_secret: p.clientSecret, username: p.username, password: p.password, grant_type: "password" }),
      signal: AbortSignal.timeout(20000),
    }),
  );
  const token = String(body.access_token ?? "");
  if (!token) throw new HttpError(502, "Pathao did not return an access token.");
  await database.collection("settings").updateOne(
    { key: "pathaoToken" },
    { $set: { token, sandbox: p.sandbox, clientId: p.clientId, expiresAt: new Date(Date.now() + (Number(body.expires_in) || 3600) * 900) } },
    { upsert: true },
  );
  return { token, p };
}

async function pathaoGet(path: string) {
  const { token, p } = await pathaoToken();
  return json(await fetch(`${pathaoBase(p.sandbox)}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) }));
}

export async function pathaoLocations(kind: "cities" | "zones" | "areas", parent?: string) {
  const path =
    kind === "cities"
      ? "/aladdin/api/v1/city-list"
      : kind === "zones"
        ? `/aladdin/api/v1/cities/${Number(parent)}/zone-list`
        : `/aladdin/api/v1/zones/${Number(parent)}/area-list`;
  const body = await pathaoGet(path);
  const rows = ((body.data as { data?: Record<string, unknown>[] })?.data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.city_id ?? r.zone_id ?? r.area_id),
    name: String(r.city_name ?? r.zone_name ?? r.area_name),
  }));
}

/** Amount the courier should collect: whatever the customer has not paid yet. */
export const collectAmount = (order: Document) => Math.max(0, Math.round(Number(order.dueAmount ?? (order.paymentStatus === "paid" ? 0 : order.total))));

export async function createConsignment(order: Document, provider: CourierProvider, options: { cityId?: string; zoneId?: string; areaId?: string; weight?: number; note?: string } = {}): Promise<Consignment> {
  const address = `${order.customer.address}, ${order.customer.city}`.slice(0, 250);
  const note = (options.note || order.note || "").slice(0, 200);
  if (provider === "steadfast") {
    const body = await json(
      await fetch(`${STEADFAST}/create_order`, {
        method: "POST",
        headers: await steadfastHeaders(),
        body: JSON.stringify({
          invoice: order.orderNo,
          recipient_name: order.customer.name,
          recipient_phone: String(order.customer.phone).replace(/\D/g, "").replace(/^88/, ""),
          recipient_address: address,
          cod_amount: collectAmount(order),
          note,
        }),
        signal: AbortSignal.timeout(20000),
      }),
    );
    const c = body.consignment as { consignment_id?: number; tracking_code?: string; status?: string } | undefined;
    if (!c?.consignment_id) throw new HttpError(502, `Steadfast: ${String(body.message ?? "consignment was not created")}`);
    return {
      courier: "Steadfast",
      consignmentId: String(c.consignment_id),
      trackingNumber: c.tracking_code ?? "",
      trackingUrl: c.tracking_code ? `https://steadfast.com.bd/t/${c.tracking_code}` : "",
      status: c.status ?? "in_review",
    };
  }
  if (!options.cityId || !options.zoneId) throw new HttpError(400, "Choose the Pathao city and zone for this address.");
  const { token, p } = await pathaoToken();
  if (!p.storeId) throw new HttpError(400, "Add your Pathao store ID in Settings → Couriers.");
  const body = await json(
    await fetch(`${pathaoBase(p.sandbox)}/aladdin/api/v1/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: Number(p.storeId),
        merchant_order_id: order.orderNo,
        recipient_name: order.customer.name,
        recipient_phone: String(order.customer.phone).replace(/\D/g, "").replace(/^88/, ""),
        recipient_address: address,
        recipient_city: Number(options.cityId),
        recipient_zone: Number(options.zoneId),
        ...(options.areaId ? { recipient_area: Number(options.areaId) } : {}),
        delivery_type: 48,
        item_type: 2,
        special_instruction: note,
        item_quantity: order.items.reduce((s: number, i: { qty: number }) => s + i.qty, 0),
        item_weight: options.weight ?? 0.5,
        amount_to_collect: collectAmount(order),
        item_description: order.items.map((i: { name: string }) => i.name).join(", ").slice(0, 250),
      }),
      signal: AbortSignal.timeout(20000),
    }),
  );
  const d = body.data as { consignment_id?: string; order_status?: string } | undefined;
  if (!d?.consignment_id) throw new HttpError(502, `Pathao: ${String(body.message ?? "consignment was not created")}`);
  return {
    courier: "Pathao",
    consignmentId: d.consignment_id,
    trackingNumber: d.consignment_id,
    trackingUrl: `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(d.consignment_id)}&phone=${encodeURIComponent(order.customer.phone)}`,
    status: d.order_status ?? "Pending",
  };
}

export async function consignmentStatus(shipment: { courier: string; consignmentId: string }) {
  if (shipment.courier === "Steadfast") {
    const body = await json(await fetch(`${STEADFAST}/status_by_cid/${encodeURIComponent(shipment.consignmentId)}`, { headers: await steadfastHeaders(), signal: AbortSignal.timeout(20000) }));
    return String(body.delivery_status ?? "unknown");
  }
  if (shipment.courier === "Pathao") {
    const body = await pathaoGet(`/aladdin/api/v1/orders/${encodeURIComponent(shipment.consignmentId)}/info`);
    return String((body.data as { order_status?: string })?.order_status ?? "unknown");
  }
  throw new HttpError(400, "This shipment was not booked through a connected courier.");
}
