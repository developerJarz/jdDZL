"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AdminShortcut } from "./AdminShortcut";
import {
  isValidBdPhone,
  isValidEmail,
  login,
  register,
  requestPasswordReset,
  type AuthResult,
} from "@/services/auth";

const inputCls =
  "w-full h-15 rounded-2xl bg-gray-100 dark:bg-[#3a342e] px-4.5 text-[18px] text-gray-800 dark:text-white placeholder:text-gray-400 outline-none border border-transparent focus:border-[#D4A97A] transition";
const labelCls =
  "block text-[16px] font-medium text-[#101518] dark:text-white mb-2";
const submitCls =
  "w-full h-13 rounded-xl bg-[#101828] text-white font-bold tracking-[0.1em] text-sm hover:bg-black transition disabled:opacity-60";

function PasswordInput({
  id,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls + " pr-12"}
        autoComplete="current-password"
        required
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          {show ? (
            <>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </>
          ) : (
            <>
              <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6C3.6 8.5 2 12 2 12s3.5 8 10 8a9.9 9.9 0 0 0 5.4-1.6" />
              <path d="M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

function Status({ result }: { result: AuthResult | null }) {
  if (!result) return null;
  return (
    <p
      role="alert"
      className={
        "text-sm text-center " + (result.ok ? "text-green-600" : "text-red-500")
      }
    >
      {result.message}
    </p>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);

  return (
    <>
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const response = await login(username, password);
          setResult(response);
          if (response.ok && (response.role === "admin" || response.role === "staff") && !params.get("redirect")) {
            // Staff stay here and choose: dashboard or storefront account.
            window.dispatchEvent(new Event("dazzle:auth-changed"));
            router.refresh();
          } else if (response.ok) {
            window.dispatchEvent(new Event("dazzle:auth-changed"));
            const target = params.get("redirect") || "/account";
            router.push(
              target.startsWith("/") &&
                !target.startsWith("//") &&
                !target.includes("\\")
                ? target
                : "/account",
            );
            router.refresh();
          }
          setBusy(false);
        }}
      >
        <div>
          <label htmlFor="login-username" className={labelCls}>
            Username (Email / Mobile)
          </label>
          <input
            id="login-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your email or phone number"
            className={inputCls}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label htmlFor="login-password" className={labelCls}>
            Password
          </label>
          <PasswordInput
            id="login-password"
            placeholder="Enter correct password"
            value={password}
            onChange={setPassword}
          />
          <div className="text-right mt-2">
            <Link
              href="/auth/forget-password"
              className="text-xs text-gray-500 hover:underline"
            >
              Forget Password?
            </Link>
          </div>
        </div>
        <button type="submit" disabled={busy} className={submitCls}>
          {busy ? "PLEASE WAIT…" : "LOG IN"}
        </button>
        <Status result={result} />
        {result?.ok && (result.role === "admin" || result.role === "staff") && (
          <div className="space-y-2">
            <AdminShortcut role={result.role} />
            <Link href="/account" className="block text-center text-sm font-semibold text-gray-600 hover:underline dark:text-gray-300">
              Continue to my account
            </Link>
          </div>
        )}
        <p className="text-center text-sm text-gray-600 dark:text-gray-300">
          Haven&apos;t any account?{" "}
          <Link
            href={`/auth/registration?redirect=${encodeURIComponent(params.get("redirect") || "/account")}`}
            className="text-[#E6A817] font-semibold"
          >
            Sign Up
          </Link>
        </p>
      </form>
    </>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);
  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!isValidEmail(form.email))
          return setResult({
            ok: false,
            message: "Please enter a valid email address.",
          });
        if (!isValidBdPhone(form.phone))
          return setResult({
            ok: false,
            message: "Please enter a valid 11-digit mobile number.",
          });
        if (form.password.length < 8)
          return setResult({
            ok: false,
            message: "Password must be at least 8 characters.",
          });
        if (form.password !== form.confirm)
          return setResult({ ok: false, message: "Passwords do not match." });
        setBusy(true);
        const response = await register({
          name: form.name,
          email: form.email,
          phone: form.phone.replace(/\s|-/g, ""),
          password: form.password,
        });
        setResult(response);
        if (response.ok) {
          window.dispatchEvent(new Event("dazzle:auth-changed"));
          const target = params.get("redirect") || "/account";
          router.push(
            target.startsWith("/") &&
              !target.startsWith("//") &&
              !target.includes("\\")
              ? target
              : "/account",
          );
          router.refresh();
        }
        setBusy(false);
      }}
    >
      <div>
        <label htmlFor="reg-name" className={labelCls}>
          Full Name
        </label>
        <input
          id="reg-name"
          value={form.name}
          onChange={set("name")}
          placeholder="Enter your full name"
          className={inputCls}
          autoComplete="name"
          required
        />
      </div>
      <div>
        <label htmlFor="reg-email" className={labelCls}>
          Email Address
        </label>
        <input
          id="reg-email"
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder="Enter your email address"
          className={inputCls}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label htmlFor="reg-phone" className={labelCls}>
          Phone Number
        </label>
        <input
          id="reg-phone"
          inputMode="tel"
          value={form.phone}
          onChange={set("phone")}
          placeholder="e.g. 01700000000"
          className={inputCls}
          autoComplete="tel"
          required
        />
      </div>
      <div>
        <label htmlFor="reg-password" className={labelCls}>
          Password
        </label>
        <PasswordInput
          id="reg-password"
          placeholder="Enter your password"
          value={form.password}
          onChange={(v) => setForm((f) => ({ ...f, password: v }))}
        />
      </div>
      <div>
        <label htmlFor="reg-confirm" className={labelCls}>
          Confirm Password
        </label>
        <PasswordInput
          id="reg-confirm"
          placeholder="Re-enter your password"
          value={form.confirm}
          onChange={(v) => setForm((f) => ({ ...f, confirm: v }))}
        />
      </div>
      <button type="submit" disabled={busy} className={submitCls}>
        {busy ? "PLEASE WAIT…" : "SIGN UP"}
      </button>
      <Status result={result} />
      <p className="text-center text-sm text-gray-600 dark:text-gray-300">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#E6A817] font-semibold">
          Log In
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<AuthResult | null>(null);
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setResult(await requestPasswordReset(username));
      }}
    >
      <div>
        <label htmlFor="forgot-username" className={labelCls}>
          Email / Mobile
        </label>
        <input
          id="forgot-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your email or phone number"
          className={inputCls}
          required
        />
      </div>
      <button type="submit" className={submitCls}>
        REQUEST ACCOUNT RECOVERY
      </button>
      <Status result={result} />
      <p className="text-center text-sm">
        <Link href="/auth/login" className="text-[#E6A817] font-semibold">
          Back to login
        </Link>
      </p>
    </form>
  );
}
