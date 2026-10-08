"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageAsset } from "@/types";

export async function api<T = { ok: boolean }>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/commerce/${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && location.pathname.startsWith("/admin") && location.pathname !== "/admin/login")
      window.dispatchEvent(new Event("dazzle:session-expired"));
    throw new Error(result.message || "Request failed.");
  }
  return result as T;
}

export const send = <T = { ok: boolean }>(path: string, data: unknown, method = "POST") =>
  api<T>(path, { method, body: JSON.stringify(data) });

/**
 * Fetches `path` (null skips) and re-fetches when it changes or `reload()` is called.
 * Previous data stays visible while a refresh is in flight.
 */
export function useApi<T>(path: string | null, debounce = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  useEffect(() => {
    if (!path) return;
    const call = ++latest.current;
    const timer = setTimeout(() => {
      setLoading(true);
      api<T>(path)
        .then((result) => {
          if (call === latest.current) {
            setData(result);
            setError("");
          }
        })
        .catch((err: Error) => {
          if (call === latest.current) setError(err.message);
        })
        .finally(() => {
          if (call === latest.current) setLoading(false);
        });
    }, debounce);
    return () => clearTimeout(timer);
  }, [path, tick, debounce]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}

export const money = (value: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(value || 0);

export const compactMoney = (value: number) =>
  "৳" + new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);

export const number = (value: number) => new Intl.NumberFormat("en").format(value || 0);

export const date = (value: string | Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(
    new Date(value),
  );

export const dateTime = (value: string | Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));

export function timeAgo(value: string | Date) {
  const seconds = (Date.now() - new Date(value).getTime()) / 1000;
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let amount = seconds;
  for (const [size, unit] of units) {
    if (Math.abs(amount) < size) return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-Math.round(amount), unit);
    amount /= size;
  }
  return "";
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);

/** Reads an image's intrinsic size in the browser so uploads keep correct aspect ratios. */
async function measure(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: 0, height: 0 };
  }
}

export async function uploadImage(file: File): Promise<ImageAsset> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error(`${file.name}: use PNG, JPEG, or WebP.`);
  if (file.size > 5_000_000) throw new Error(`${file.name} is larger than 5 MB.`);
  const { width, height } = await measure(file);
  const form = new FormData();
  form.set("image", file);
  if (width) form.set("width", String(width));
  if (height) form.set("height", String(height));
  const result = await api<{ src: string; width: number | null; height: number | null }>("admin/media", {
    method: "POST",
    body: form,
  });
  return { src: result.src, width: result.width, height: result.height };
}

export async function exportCsv(resource: string, query: string, filename = resource) {
  const records: Record<string, unknown>[] = [];
  let page = 1;
  let pages = 1;
  do {
    const result = await api<{ items: Record<string, unknown>[]; pages: number }>(
      `admin/${resource}?limit=100&page=${page}${query ? `&${query}` : ""}`,
    );
    records.push(...result.items);
    pages = result.pages;
    page++;
  } while (page <= pages);
  const fields = [...new Set(records.flatMap((row) => Object.keys(row)))].filter(
    (field) => !["passwordHash", "tokenHash", "idempotencyKey"].includes(field),
  );
  const cell = (value: unknown) => {
    let text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    // Neutralise spreadsheet formula injection.
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const csv =
    "﻿" + [fields.map(cell).join(","), ...records.map((row) => fields.map((f) => cell(row[f])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `dazzle-${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  return records.length;
}
