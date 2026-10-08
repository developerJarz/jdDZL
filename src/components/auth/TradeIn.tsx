"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/admin/types";
import "./account.css";
export function TradeIn() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  return (
    <div className="account-workspace" style={{ maxWidth: 720 }}>
      <span className="account-eyebrow">GIVE YOUR TECH A NEW CHAPTER</span>
      <h1 className="text-3xl font-bold my-4">Trade in your device</h1>
      <p>
        Tell us about your device. Our store team will review it and discuss a
        valuation with you in your account. Final pricing follows inspection.
      </p>
      {done ? (
        <div className="account-notice my-6">
          <p>Your trade-in request has been received.</p>
          <Link href="/account" className="underline">
            Follow the conversation in Support & returns
          </Link>
        </div>
      ) : (
        <form
          className="account-form account-card"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            try {
              await api("account/tickets", {
                method: "POST",
                body: JSON.stringify({
                  kind: "trade-in",
                  subject: `Trade-in: ${f.get("device")}`,
                  message: `Device: ${f.get("device")}\nCondition: ${f.get("condition")}\nDetails: ${f.get("details")}`,
                  orderNo: "",
                }),
              });
              setDone(true);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Brand and model
            <input
              name="device"
              required
              minLength={3}
              maxLength={160}
              placeholder="e.g. Samsung Galaxy S24, 256 GB"
            />
          </label>
          <label>
            Device condition
            <select name="condition">
              <option>Excellent — fully working</option>
              <option>Good — minor cosmetic wear</option>
              <option>Fair — visible wear</option>
              <option>Needs repair</option>
            </select>
          </label>
          <label>
            Age, accessories, repairs, and any faults
            <textarea name="details" required minLength={10} maxLength={3000} />
          </label>
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy}>Request a valuation</button>
        </form>
      )}
    </div>
  );
}
