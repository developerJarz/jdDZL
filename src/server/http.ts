import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { db } from "./db";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function body(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Send JSON content.");
  const raw = await request.text();
  if (raw.length > 100_000) throw new HttpError(413, "Request is too large.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const expected =
    process.env.APP_ORIGIN ||
    `${url.protocol}//${request.headers.get("host") || url.host}`;
  if (
    (origin && origin !== expected) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "Request origin is not allowed.");
}
export async function rateLimit(request: Request, scope: string, max = 20) {
  // Behind a trusted proxy, configure TRUST_PROXY=true so the proxy-supplied address is used.
  const ip =
    process.env.TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
      : "direct";
  const minute = Math.floor(Date.now() / 60_000);
  const key = createHash("sha256")
    .update(`${scope}:${ip}:${minute}`)
    .digest("hex");
  const record = await (await db()).collection("rateLimits").findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(Date.now() + 120_000) },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (record && record.count > max)
    throw new HttpError(429, "Too many requests. Try again in a minute.");
}
export async function handle(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof HttpError)
      return json({ ok: false, message: error.message }, error.status);
    if (error instanceof ZodError)
      return json(
        {
          ok: false,
          message: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    if ((error as { code?: number })?.code === 11000)
      return json(
        {
          ok: false,
          message:
            "That email, phone number, coupon code, or product slug already exists.",
        },
        409,
      );
    const requestId = randomUUID();
    console.error(
      JSON.stringify({
        level: "error",
        requestId,
        errorType: error instanceof Error ? error.name : "Unknown",
      }),
    );
    return json(
      {
        ok: false,
        message:
          "The database is unavailable or the request could not be completed. Please try again.",
        requestId,
      },
      503,
    );
  }
}
