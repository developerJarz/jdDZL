"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/components/admin/types";
export function NewsletterPreferences() {
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api<{ user: { email: string } | null }>("auth/me")
      .then((result) => {
        if (!cancelled) setEmail(result.user?.email || "");
      })
      .catch((err) => {
        if (!cancelled) setMessage(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="max-w-lg mx-auto px-5 py-20 text-center">
      <h1 className="text-2xl font-bold">Newsletter preferences</h1>
      {email ? (
        <>
          <p className="mt-5 text-gray-500">
            Unsubscribe <strong>{email}</strong> from the store newsletter.
          </p>
          <button
            className="mt-6 bg-[#41634e] text-white px-6 py-3 rounded-xl disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await api<{ message: string }>(
                  "newsletter-unsubscribe",
                  { method: "POST", body: "{}" },
                );
                setMessage(result.message);
              } catch (err) {
                setMessage((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Updating…" : "Unsubscribe"}
          </button>
        </>
      ) : email === "" ? (
        <>
          <p className="mt-5 text-gray-500">
            Sign in to manage your email subscription.
          </p>
          <Link
            className="inline-block mt-6 underline"
            href="/auth/login?redirect=%2Fnewsletter-unsubscribe"
          >
            Sign in
          </Link>
        </>
      ) : (
        <p role="status" className="mt-5">
          Loading your preferences…
        </p>
      )}
      {message && (
        <p className="mt-5" role="status">
          {message}
        </p>
      )}
      <Link className="block mt-8 text-sm text-gray-500 underline" href="/">
        Back to store
      </Link>
    </div>
  );
}
