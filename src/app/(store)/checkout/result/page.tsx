import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Payment status", robots: { index: false, follow: false } };

export default async function PaymentResult({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { status, order, message } = await searchParams;
  const paid = status === "paid";
  return (
    <div className="max-w-xl mx-auto px-5 py-20 text-center">
      <span className={`inline-flex size-16 items-center justify-center rounded-full text-3xl ${paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`} aria-hidden="true">
        {paid ? "✓" : "!"}
      </span>
      <h1 className="mt-6 text-3xl font-bold">{paid ? "Payment received" : "Payment not completed"}</h1>
      {order && (
        <p className="mt-3">
          Order <strong>{order}</strong>
        </p>
      )}
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        {paid ? "Thank you! Your payment has been confirmed with the gateway." : (message ?? "The payment was cancelled or could not be confirmed.")}{" "}
        {!paid && "Your order is saved — you can try again from your account or pay on delivery if available."}
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link href="/account" className="rounded-xl bg-[#6D3F0E] px-5 py-3 font-semibold text-white">
          View my orders
        </Link>
        <Link href="/" className="rounded-xl border border-gray-300 px-5 py-3">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
