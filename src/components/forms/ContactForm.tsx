"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { submitForm, type FormKind } from "@/services/forms";

export interface FieldConfig {
  name: string;
  label?: string;
  placeholder: string;
  type?: "text" | "email" | "tel" | "date" | "textarea" | "image";
  required?: boolean;
}

const inputCls =
  "w-full rounded-full bg-[#F9F9F9] dark:bg-[#3a342e] border border-gray-200 dark:border-gray-700 px-4 h-14 text-base text-gray-800 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#D4A97A]";

/** Stacked form used by /support, /feedback and /corporate. */
export function ContactForm({ kind, fields, submitLabel = "SUBMIT" }: { kind: FormKind; fields: FieldConfig[]; submitLabel?: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setResult(await submitForm(kind, values));
        setBusy(false);
      }}
    >
      {fields.map((f) => {
        const id = `${kind}-${f.name}`;
        const common = {
          id,
          name: f.name,
          required: f.required ?? true,
          placeholder: f.placeholder,
          value: values[f.name] ?? "",
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [f.name]: e.target.value })),
        };
        return (
          <div key={f.name}>
            <label htmlFor={id} className="block text-base text-[#101518] dark:text-white mb-2">
              {f.label}
            </label>
            {f.type === "textarea" ? (
              <textarea {...common} rows={5} className={inputCls.replace("rounded-full", "rounded-3xl").replace("h-14", "py-4 min-h-36")} />
            ) : (
              <input {...common} type={f.type ?? "text"} className={inputCls} />
            )}
          </div>
        );
      })}
      <button type="submit" disabled={busy} className="w-full h-14 rounded-full bg-[#101828] text-white font-semibold tracking-[0.12em] hover:bg-black disabled:opacity-60">
        {busy ? "SENDING…" : submitLabel}
      </button>
      {result && (
        <p role="status" className={"text-sm text-center " + (result.ok ? "text-green-600" : "text-red-500")}>
          {result.message}
        </p>
      )}
    </form>
  );
}

/** Boxed request form used by /pre-order ("Looking For Something Different?"). */
export function PreOrderForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [file, setFile] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const field = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#3a342e] px-4 h-12 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#D4A97A]";
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <form
      className="bg-white dark:bg-[#2a2420] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!accepted) return setResult({ ok: false, message: "Please accept the Terms & Conditions." });
        setResult(await submitForm("pre-order", { ...values, image: file ?? "" }));
      }}
    >
      <input aria-label="Product name or URL" required placeholder="Enter product name/URL..." className={field} value={values.product ?? ""} onChange={set("product")} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) setFile(f.name);
        }}
        className="w-full rounded-xl border-2 border-dashed border-[#E2C9A5] bg-[#FFFDF9] dark:bg-transparent py-5 flex flex-col items-center gap-1"
      >
        <span className="w-9 h-9 rounded-lg bg-[#101828] text-white flex items-center justify-center" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
          </svg>
        </span>
        <span className="text-sm font-medium text-[#101518] dark:text-white">{file ?? "Add Image"}</span>
        <span className="text-xs text-gray-400">Click or drag &amp; drop</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
      <input aria-label="Name" required placeholder="Name" className={field} value={values.name ?? ""} onChange={set("name")} />
      <input aria-label="Phone number" required type="tel" placeholder="Phone number" className={field} value={values.phone ?? ""} onChange={set("phone")} />
      <input aria-label="Email" type="email" placeholder="Email" className={field} value={values.email ?? ""} onChange={set("email")} />
      <input aria-label="Subject" placeholder="Subject" className={field} value={values.subject ?? ""} onChange={set("subject")} />
      <textarea aria-label="Address" placeholder="Address..." rows={3} className={field + " h-auto py-3"} value={values.address ?? ""} onChange={set("address")} />
      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="w-4 h-4 accent-[#6D3F0E]" />I accept{" "}
        <Link href="/terms-conditions" className="text-[#B57908] underline">
          Terms &amp; Conditions
        </Link>
      </label>
      <button type="submit" className="w-full h-12 rounded-xl bg-[#F3E7D9] text-[#6D3F0E] font-bold tracking-[0.25em] text-sm border border-[#E2C9A5] hover:bg-[#ecdcc8]">
        SUBMIT
      </button>
      {result && (
        <p role="status" className={"text-sm text-center " + (result.ok ? "text-green-600" : "text-red-500")}>
          {result.message}
        </p>
      )}
      <Link href="/" className="block text-center text-sm text-gray-500 hover:text-gray-700 tracking-wide">
        ‹ BACK TO HOME
      </Link>
    </form>
  );
}
