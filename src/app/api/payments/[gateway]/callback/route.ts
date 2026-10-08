import { NextResponse } from "next/server";
import { completePayment, type Gateway } from "@/server/integrations/payments";

export const runtime = "nodejs";

// Customers return here from bKash, Nagad, or SurjoPay. The payment is verified with the
// gateway before the order is updated, then the customer lands on the payment result page.
export async function GET(request: Request, { params }: { params: Promise<{ gateway: string }> }) {
  const { gateway } = await params;
  const url = new URL(request.url);
  const base = process.env.APP_ORIGIN || url.origin;
  if (!["bkash", "nagad", "surjopay"].includes(gateway)) return NextResponse.redirect(`${base}/checkout/result?status=failed`);
  let result: { ok: boolean; orderNo: string | null; message: string };
  try {
    result = await completePayment(gateway as Gateway, url.searchParams);
  } catch {
    result = { ok: false, orderNo: null, message: "Payment could not be verified." };
  }
  const target = new URL("/checkout/result", base);
  target.searchParams.set("status", result.ok ? "paid" : "failed");
  if (result.orderNo) target.searchParams.set("order", result.orderNo);
  target.searchParams.set("message", result.message);
  return NextResponse.redirect(target);
}
