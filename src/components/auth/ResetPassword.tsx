"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/admin/types";
import "./account.css";
export function ResetPassword() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  return (
    <div className="account-workspace" style={{ maxWidth: 550 }}>
      <h1 className="text-2xl font-bold">Reset your password</h1>
      {done ? (
        <div className="account-notice">
          <p>Password updated successfully.</p>
          <Link href="/auth/login" className="underline">
            Sign in with your new password
          </Link>
        </div>
      ) : (
        <form
          className="account-card account-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const f = new FormData(e.currentTarget);
            if (f.get("password") !== f.get("confirm")) {
              setError("Passwords do not match.");
              return;
            }
            setBusy(true);
            try {
              await api("auth/reset-password", {
                method: "POST",
                body: JSON.stringify({
                  token: new URLSearchParams(location.hash.slice(1)).get(
                    "token",
                  ),
                  password: f.get("password"),
                }),
              });
              history.replaceState(null, "", location.pathname);
              setDone(true);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            Use the secure recovery link provided by the store after identity
            verification.
          </p>
          <label>
            New password
            <input
              name="password"
              type="password"
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Confirm password
            <input
              name="confirm"
              type="password"
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              required
            />
          </label>
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy}>Update password</button>
        </form>
      )}
    </div>
  );
}
