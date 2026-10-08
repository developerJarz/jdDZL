"use client";

import { useState } from "react";
import { MailIcon } from "@/components/icons";
import { subscribeNewsletter } from "@/services/newsletter";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ status: "idle" | "busy" | "ok" | "error"; message?: string }>({ status: "idle" });

  return (
    <>
      <form
        className="mx-auto mt-4 sm:mt-6 flex max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-background"
        onSubmit={async (e) => {
          e.preventDefault();
          setState({ status: "busy" });
          const res = await subscribeNewsletter(email);
          setState({ status: res.ok ? "ok" : "error", message: res.message });
          if (res.ok) setEmail("");
        }}
      >
        <div className="pl-3 sm:pl-4 pt-4 sm:pt-5">
          <MailIcon />
        </div>
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          disabled={state.status === "busy"}
          className="w-full px-2 sm:px-3 py-3 sm:py-4 text-sm outline-none bg-transparent disabled:opacity-60 text-primary"
        />
        <button
          type="submit"
          disabled={state.status === "busy"}
          className="m-1 rounded-xl dark:bg-[#36291e] px-4 sm:px-8 py-2 sm:py-3 text-xs sm:text-sm font-medium transition hover:bg-black hover:text-white text-primary dark:text-white disabled:opacity-60 flex items-center gap-2 shrink-0"
        >
          Subscribe
        </button>
      </form>
      {state.message && (
        <p role="status" className={"mt-3 text-center text-sm " + (state.status === "ok" ? "text-green-600" : "text-red-500")}>
          {state.message}
        </p>
      )}
    </>
  );
}
