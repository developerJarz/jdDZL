import type { Document } from "mongodb";
import { db } from "../db";
import { getIntegrations, getStoreSettings, type SmsEvent } from "./config";

export const DEFAULT_TEMPLATES: Record<SmsEvent, string> = {
  placed: "Dear {name}, your order {orderNo} of {total} has been received. Thank you for shopping with {store}.",
  confirmed: "Your order {orderNo} is confirmed. We will ship it soon. - {store}",
  shipped: "Your order {orderNo} has been shipped via {courier}. Tracking: {tracking}. - {store}",
  delivered: "Your order {orderNo} has been delivered. Thank you for choosing {store}!",
  cancelled: "Your order {orderNo} has been cancelled. Call us for help. - {store}",
};

/** Normalises Bangladesh mobile numbers to 8801XXXXXXXXX; returns null when invalid. */
export function bdMsisdn(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(2) : digits.startsWith("0") ? digits : `0${digits}`;
  return /^01[3-9]\d{8}$/.test(local) ? `88${local}` : null;
}

export function fillTemplate(template: string, values: Record<string, string | number | undefined>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export interface SmsResult {
  ok: boolean;
  message: string;
}

/** Sends one SMS through the configured gateway and logs the attempt. */
export async function sendSms(phone: string, message: string, context: { kind: string; orderNo?: string; actorId?: string }): Promise<SmsResult> {
  const database = await db();
  const { sms } = await getIntegrations();
  const to = bdMsisdn(phone);
  let result: SmsResult;
  if (!sms.provider) result = { ok: false, message: "No SMS gateway is configured." };
  else if (!to) result = { ok: false, message: "Invalid Bangladesh mobile number." };
  else {
    try {
      let response: Response;
      if (sms.provider === "bulksmsbd") {
        const url = new URL("https://bulksmsbd.net/api/smsapi");
        url.search = new URLSearchParams({ api_key: sms.apiKey, type: "text", number: to, senderid: sms.senderId, message }).toString();
        response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        const body = (await response.json().catch(() => ({}))) as { response_code?: number; error_message?: string; success_message?: string };
        result = body.response_code === 202 ? { ok: true, message: body.success_message || "Sent" } : { ok: false, message: body.error_message || `Gateway error ${body.response_code ?? response.status}` };
      } else if (sms.provider === "smsnetbd") {
        response = await fetch("https://api.sms.net.bd/sendsms", {
          method: "POST",
          body: new URLSearchParams({ api_key: sms.apiKey, msg: message, to, ...(sms.senderId ? { sender_id: sms.senderId } : {}) }),
          signal: AbortSignal.timeout(15000),
        });
        const body = (await response.json().catch(() => ({}))) as { error?: number; msg?: string };
        result = body.error === 0 ? { ok: true, message: body.msg || "Sent" } : { ok: false, message: body.msg || `Gateway error ${response.status}` };
      } else {
        if (!/^https:\/\//.test(sms.customUrl)) throw new Error("The custom gateway URL must use https://.");
        const url = sms.customUrl.replaceAll("{phone}", encodeURIComponent(to)).replaceAll("{message}", encodeURIComponent(message));
        response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        result = response.ok ? { ok: true, message: `HTTP ${response.status}` } : { ok: false, message: `HTTP ${response.status}` };
      }
    } catch (error) {
      result = { ok: false, message: (error as Error).message.slice(0, 200) };
    }
  }
  await database.collection("smsLogs").insertOne({
    to: to ?? phone,
    message,
    ok: result.ok,
    response: result.message,
    provider: sms.provider,
    ...context,
    createdAt: new Date(),
  });
  return result;
}

/** Sends the customer notification for an order event when that event is switched on. */
export async function notifyOrder(event: SmsEvent, order: Document) {
  const { sms } = await getIntegrations();
  if (!sms.provider || !sms.events[event] || !order.customer?.phone) return null;
  const store = await getStoreSettings();
  const message = fillTemplate(sms.templates[event] || DEFAULT_TEMPLATES[event], {
    name: order.customer.name,
    orderNo: order.orderNo,
    total: `BDT ${Number(order.total).toLocaleString("en-BD")}`,
    due: `BDT ${Number(order.dueAmount ?? order.total).toLocaleString("en-BD")}`,
    courier: order.shipment?.courier ?? "",
    tracking: order.shipment?.trackingNumber ?? "",
    store: store.name,
  });
  return sendSms(order.customer.phone, message, { kind: `order.${event}`, orderNo: order.orderNo });
}
