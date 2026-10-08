"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, date } from "@/components/admin/types";
type Review = {
  _id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};
export function ProductReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    api<{ items: Review[] }>(`reviews/${encodeURIComponent(slug)}`)
      .then((result) => {
        if (alive) setReviews(result.items);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);
  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-xl font-bold">Verified customer reviews</h2>
        <Link href="/account" className="text-sm underline">
          Review your purchase
        </Link>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : loading ? (
        <p role="status" className="py-6">
          Loading reviews…
        </p>
      ) : !reviews.length ? (
        <p className="text-gray-500 py-6">
          No reviews yet. Customers can leave a review after their order is
          delivered.
        </p>
      ) : (
        <>
          <p className="my-4 font-semibold">
            {(
              reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            ).toFixed(1)}{" "}
            / 5 · {reviews.length} reviews
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {reviews.map((r) => (
              <article
                className="border border-gray-200 rounded-xl p-5"
                key={r._id}
              >
                <div className="flex justify-between gap-3">
                  <strong>{r.customerName.split(" ")[0]}</strong>
                  <span aria-label={`${r.rating} out of 5 stars`}>
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 my-2">
                  Verified purchase · {date(r.createdAt)}
                </p>
                <p className="text-sm whitespace-pre-wrap">{r.comment}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
