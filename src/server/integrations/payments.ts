import { constants, createSign, privateDecrypt, publicEncrypt, randomBytes } from "node:crypto";
import { ObjectId, type Document } from "mongodb";
import { db, mongo } from "../db";
import { HttpError } from "../http";
import { getIntegrations, type Integrations } from "./config";

export type Gateway = "bkash" | "nagad" | "surjopay";
export const GATEWAY_LABEL: Record<Gateway, string> = { bkash: "bKash", nagad: "Nagad", surjopay: "SurjoPay" };

export async function enabledGateways(): Promise<Gateway[]> {
  const { payments } = await getIntegrations();
  return (["bkash", "nagad", "surjopay"] as Gateway[]).filter((g) => {
    const c = payments[g];
    if (!c.enabled) return false;
    if (g === "bkash") return Boolean(payments.bkash.appKey && payments.bkash.appSecret && payments.bkash.username && payments.bkash.password);
    if (g === "nagad") return Boolean(payments.nagad.merchantId && payments.nagad.gatewayPublicKey && payments.nagad.merchantPrivateKey);
    return Boolean(payments.surjopay.username && payments.surjopay.password);
  });
}

/* ---------------- Payment ledger ---------------- */
export interface PaymentEntry {
  amount: number;
  method: string;
  reference: string;
  at: Date;
  actorId?: string;
  gateway?: Gateway;
}

/** Status from what has been paid against the total. */
export const paymentStatusFor = (paid: number, total: number) => (paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial");

/** Adds a payment to an order (idempotent per reference) and recalculates paid/due. */
export async function recordPayment(orderId: ObjectId, entry: PaymentEntry) {
  const database = await db();
  const session = (await mongo()).startSession();
  try {
    return await session.withTransaction(async () => {
      const order = await database.collection("orders").findOne({ _id: orderId }, { session });
      if (!order) throw new HttpError(404, "Order not found.");
      if (order.status === "cancelled") throw new HttpError(409, "Payments can't be added to a cancelled order.");
      const payments: PaymentEntry[] = order.payments ?? [];
      if (entry.reference && payments.some((p) => p.reference === entry.reference && p.method === entry.method)) return order;
      const paid = payments.reduce((s, p) => s + p.amount, 0) + entry.amount;
      if (paid > order.total + 0.5) throw new HttpError(400, `This would exceed the order total. Remaining due: BDT ${order.total - (paid - entry.amount)}.`);
      const update = {
        payments: [...payments, entry],
        paidAmount: paid,
        dueAmount: Math.max(0, order.total - paid),
        paymentStatus: paymentStatusFor(paid, order.total),
        updatedAt: new Date(),
      };
      await database.collection("orders").updateOne({ _id: orderId }, { $set: update }, { session });
      await database.collection("audit").insertOne(
        { action: "orders.payment", entityId: orderId.toString(), actorId: entry.actorId ?? "gateway", detail: `${entry.method} BDT ${entry.amount} ${entry.reference}`.trim(), createdAt: new Date() },
        { session },
      );
      return { ...order, ...update };
    });
  } finally {
    await session.endSession();
  }
}

/* ---------------- bKash (tokenized checkout) ---------------- */
const bkashBase = (sandbox: boolean) => (sandbox ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta" : "https://tokenized.pay.bka.sh/v1.2.0-beta");

async function bkashToken(c: Integrations["payments"]["bkash"]) {
  const res = await fetch(`${bkashBase(c.sandbox)}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", username: c.username, password: c.password },
    body: JSON.stringify({ app_key: c.appKey, app_secret: c.appSecret }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json().catch(() => ({}));
  if (!body.id_token) throw new HttpError(502, `bKash: ${body.statusMessage || body.msg || "could not authenticate"}`);
  return body.id_token as string;
}

async function bkashCall(c: Integrations["payments"]["bkash"], path: string, payload: unknown) {
  const res = await fetch(`${bkashBase(c.sandbox)}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: await bkashToken(c), "X-APP-Key": c.appKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  return res.json().catch(() => ({}));
}

/* ---------------- SurjoPay (shurjoPay v2) ---------------- */
const surjoBase = (sandbox: boolean) => (sandbox ? "https://sandbox.shurjopayment.com" : "https://engine.shurjopayment.com");

async function surjoToken(c: Integrations["payments"]["surjopay"]) {
  const res = await fetch(`${surjoBase(c.sandbox)}/api/get_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: c.username, password: c.password }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json().catch(() => ({}));
  if (!body.token) throw new HttpError(502, `SurjoPay: ${body.message || "could not authenticate"}`);
  return body as { token: string; store_id: number; token_type: string };
}

/* ---------------- Nagad ---------------- */
const nagadBase = (sandbox: boolean) =>
  sandbox ? "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs" : "https://api.mynagad.com/api/dfs";
const pem = (key: string, type: "PUBLIC KEY" | "PRIVATE KEY") =>
  key.includes("BEGIN") ? key : `-----BEGIN ${type}-----\n${key.replace(/\s/g, "").match(/.{1,64}/g)?.join("\n")}\n-----END ${type}-----`;
const nagadTime = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .format(new Date())
    .replace(/\D/g, "");

function nagadSeal(c: Integrations["payments"]["nagad"], data: unknown) {
  const text = JSON.stringify(data);
  const sensitiveData = publicEncrypt({ key: pem(c.gatewayPublicKey, "PUBLIC KEY"), padding: constants.RSA_PKCS1_PADDING }, Buffer.from(text)).toString("base64");
  const signature = createSign("SHA256").update(text).sign(pem(c.merchantPrivateKey, "PRIVATE KEY"), "base64");
  return { sensitiveData, signature };
}

function nagadOpen(c: Integrations["payments"]["nagad"], sealed: string) {
  return JSON.parse(privateDecrypt({ key: pem(c.merchantPrivateKey, "PRIVATE KEY"), padding: constants.RSA_PKCS1_PADDING }, Buffer.from(sealed, "base64")).toString());
}

/* ---------------- Start / verify ---------------- */
/**
 * Starts a gateway payment for `amount` against an order and returns the URL to send the
 * customer to. The intent is stored so the callback can be matched and verified.
 */
export async function startPayment(gateway: Gateway, order: Document, amount: number, origin: string) {
  if (!(await enabledGateways()).includes(gateway)) throw new HttpError(400, `${GATEWAY_LABEL[gateway]} is not available right now.`);
  const { payments } = await getIntegrations();
  const database = await db();
  const callback = `${origin}/api/payments/${gateway}/callback`;
  const value = Math.round(amount * 100) / 100;
  let url = "";
  let reference = "";
  if (gateway === "bkash") {
    const body = await bkashCall(payments.bkash, "/tokenized/checkout/create", {
      mode: "0011",
      payerReference: String(order.customer.phone).slice(-11),
      callbackURL: callback,
      amount: value.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: `${order.orderNo}-${randomBytes(2).toString("hex")}`.slice(0, 50),
    });
    if (!body.bkashURL) throw new HttpError(502, `bKash: ${body.statusMessage || "payment could not be created"}`);
    url = body.bkashURL;
    reference = body.paymentID;
  } else if (gateway === "surjopay") {
    const c = payments.surjopay;
    const auth = await surjoToken(c);
    const res = await fetch(`${surjoBase(c.sandbox)}/api/secret-pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `${auth.token_type || "Bearer"} ${auth.token}` },
      body: JSON.stringify({
        prefix: c.prefix || "DZ",
        token: auth.token,
        store_id: auth.store_id,
        return_url: callback,
        cancel_url: callback,
        amount: value,
        order_id: `${order.orderNo}-${randomBytes(2).toString("hex")}`,
        currency: "BDT",
        customer_name: order.customer.name,
        customer_address: order.customer.address,
        customer_phone: order.customer.phone,
        customer_city: order.customer.city,
        customer_email: order.customer.email || "customer@example.com",
        client_ip: "127.0.0.1",
      }),
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.json().catch(() => ({}));
    if (!body.checkout_url) throw new HttpError(502, `SurjoPay: ${body.message || "payment could not be created"}`);
    url = body.checkout_url;
    reference = body.sp_order_id;
  } else {
    const c = payments.nagad;
    const base = nagadBase(c.sandbox);
    const orderId = `${order.orderNo.replace(/\W/g, "")}${Date.now().toString().slice(-6)}`.slice(0, 30);
    const datetime = nagadTime();
    const headers = { "Content-Type": "application/json", "X-KM-Api-Version": "v-0.2.0", "X-KM-IP-V4": "127.0.0.1", "X-KM-Client-Type": "PC_WEB" };
    const init = await fetch(`${base}/check-out/initialize/${c.merchantId}/${orderId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ accountNumber: c.merchantNumber, dateTime: datetime, ...nagadSeal(c, { merchantId: c.merchantId, datetime, orderId, challenge: randomBytes(20).toString("hex") }) }),
      signal: AbortSignal.timeout(30000),
    }).then((r) => r.json().catch(() => ({})));
    if (!init.sensitiveData) throw new HttpError(502, `Nagad: ${init.message || "payment could not be initialised"}`);
    const opened = nagadOpen(c, init.sensitiveData) as { paymentReferenceId: string; challenge: string };
    const complete = await fetch(`${base}/check-out/complete/${opened.paymentReferenceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...nagadSeal(c, { merchantId: c.merchantId, orderId, currencyCode: "050", amount: value.toFixed(2), challenge: opened.challenge }),
        merchantCallbackURL: callback,
        additionalMerchantInfo: { orderNo: order.orderNo },
      }),
      signal: AbortSignal.timeout(30000),
    }).then((r) => r.json().catch(() => ({})));
    if (!complete.callBackUrl) throw new HttpError(502, `Nagad: ${complete.message || "payment could not be created"}`);
    url = complete.callBackUrl;
    reference = opened.paymentReferenceId;
  }
  await database.collection("paymentIntents").insertOne({ gateway, reference, orderId: order._id, orderNo: order.orderNo, amount: value, status: "started", createdAt: new Date() });
  return url;
}

/**
 * Handles the customer returning from a gateway. The payment is confirmed with the
 * gateway's own verification API before anything is recorded on the order.
 */
export async function completePayment(gateway: Gateway, params: URLSearchParams) {
  const { payments } = await getIntegrations();
  const database = await db();
  const reference = gateway === "bkash" ? params.get("paymentID") : gateway === "surjopay" ? params.get("order_id") : params.get("payment_ref_id");
  const intent = reference ? await database.collection("paymentIntents").findOne({ gateway, reference }) : null;
  if (!intent) return { ok: false, orderNo: null, message: "Payment session not found." };
  if (intent.status === "paid") return { ok: true, orderNo: intent.orderNo as string, message: "Payment already recorded." };
  let ok = false;
  let trx = "";
  let paid = 0;
  try {
    if (gateway === "bkash") {
      if (params.get("status") === "success") {
        const body = await bkashCall(payments.bkash, "/tokenized/checkout/execute", { paymentID: reference });
        ok = body.transactionStatus === "Completed";
        trx = body.trxID ?? "";
        paid = Number(body.amount);
      }
    } else if (gateway === "surjopay") {
      const c = payments.surjopay;
      const auth = await surjoToken(c);
      const res = await fetch(`${surjoBase(c.sandbox)}/api/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `${auth.token_type || "Bearer"} ${auth.token}` },
        body: JSON.stringify({ order_id: reference }),
        signal: AbortSignal.timeout(30000),
      });
      const [row] = (await res.json().catch(() => [])) as { sp_code?: string | number; amount?: string | number; bank_trx_id?: string }[];
      ok = String(row?.sp_code) === "1000";
      trx = row?.bank_trx_id ?? "";
      paid = Number(row?.amount);
    } else {
      const res = await fetch(`${nagadBase(payments.nagad.sandbox)}/verify/payment/${encodeURIComponent(reference!)}`, {
        headers: { "Content-Type": "application/json", "X-KM-Api-Version": "v-0.2.0", "X-KM-IP-V4": "127.0.0.1", "X-KM-Client-Type": "PC_WEB" },
        signal: AbortSignal.timeout(30000),
      });
      const body = await res.json().catch(() => ({}));
      ok = body.status === "Success";
      trx = body.issuerPaymentRefNo ?? body.paymentRefId ?? "";
      paid = Number(body.amount);
    }
  } catch (error) {
    await database.collection("paymentIntents").updateOne({ _id: intent._id }, { $set: { status: "error", error: (error as Error).message.slice(0, 300) } });
    return { ok: false, orderNo: intent.orderNo as string, message: "We couldn't confirm the payment with the gateway." };
  }
  // Never trust a verified amount that differs from what we asked for.
  if (ok && Math.abs(paid - intent.amount) > 0.5) ok = false;
  await database.collection("paymentIntents").updateOne({ _id: intent._id }, { $set: { status: ok ? "paid" : "failed", trx, verifiedAt: new Date() } });
  if (!ok) return { ok: false, orderNo: intent.orderNo as string, message: "The payment was not completed." };
  await recordPayment(intent.orderId as ObjectId, { amount: intent.amount, method: GATEWAY_LABEL[gateway], reference: trx || String(reference), at: new Date(), gateway });
  return { ok: true, orderNo: intent.orderNo as string, message: "Payment received." };
}
