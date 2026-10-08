"use client";
import * as React from "react";
import Image from "next/image";
import { createContext, useCallback, useContext, useId, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Loader2, Search, X } from "lucide-react";
import type { ImageAsset } from "@/types";
import { cn } from "../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label, Skeleton } from "../ui/controls";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../ui/dialog";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-bold tracking-[0.18em] text-brand uppercase">{eyebrow}</p>
        )}
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight md:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_VARIANT: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  pending: "warning",
  confirmed: "info",
  processing: "brand",
  shipped: "info",
  delivered: "success",
  cancelled: "destructive",
  paid: "success",
  unpaid: "warning",
  refunded: "muted",
  active: "success",
  published: "success",
  archived: "muted",
  hidden: "muted",
  disabled: "destructive",
  expired: "muted",
  unsubscribed: "muted",
  new: "brand",
  open: "brand",
  "in-progress": "info",
  "awaiting-customer": "warning",
  approved: "success",
  received: "info",
  resolved: "success",
  rejected: "destructive",
  "out of stock": "destructive",
  "low stock": "warning",
  "in stock": "success",
};

export const STATUS_COLOR: Record<string, string> = {
  pending: "#c27a10",
  confirmed: "#2f6db5",
  processing: "#cb843b",
  shipped: "#6b5bd2",
  delivered: "#2c8a56",
  cancelled: "#c0392b",
};

/** "out-of-stock" / "Out Of Stock" → "Out of stock" */
export const sentence = (value: string) => {
  const text = value.replaceAll("-", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const key = value.toLowerCase();
  return (
    <Badge variant={STATUS_VARIANT[key] ?? "muted"} className={className}>
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {sentence(value)}
    </Badge>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-primary ring-8 ring-brand-soft/40 dark:text-brand">
        <Icon className="size-6" />
      </div>
      <p className="font-bold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Thumb({ image, size = 40, className }: { image?: ImageAsset | null; size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {image?.src ? (
        <Image src={image.src} alt="" fill sizes={`${size * 2}px`} className="object-contain p-0.5" />
      ) : (
        <ImageOff className="size-4 text-muted-foreground/60" />
      )}
    </span>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pr-8 pl-9"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onPage,
  label = "records",
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-[13px] text-muted-foreground sm:flex-row">
      <span>
        <strong className="text-foreground">{total.toLocaleString()}</strong> {label} · Page {page} of {pages}
      </span>
      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft /> Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export function LoadingRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-b">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-4 py-3.5">
              <Skeleton className={cn("h-4", c === 0 ? "w-48" : "w-20")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
  aside,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  aside?: React.ReactNode;
}) {
  // Link the label to a lone child control automatically when no id is given.
  const generated = useId();
  const only = React.Children.count(children) === 1 && React.isValidElement<{ id?: string }>(children) ? children : null;
  const id = htmlFor ?? only?.props.id ?? (only ? generated : undefined);
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      {only && !only.props.id && !htmlFor ? React.cloneElement(only, { id }) : children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} />;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
    >
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/* ---------- Confirm dialog (promise-based) ---------- */
interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
}
const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...options, resolve })),
    [],
  );
  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={Boolean(state)} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          {state?.description && <AlertDialogDescription asChild><div>{state.description}</div></AlertDialogDescription>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel onClick={() => close(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction destructive={state?.destructive} onClick={() => close(true)}>
              {state?.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

/* ---------- Delta pill ---------- */
export function Delta({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (!previous && !current) return <span className="text-xs text-muted-foreground">No change</span>;
  if (!previous) return <Badge variant="success">New</Badge>;
  const change = ((current - previous) / previous) * 100;
  const good = invert ? change <= 0 : change >= 0;
  return (
    <Badge variant={Math.abs(change) < 0.5 ? "muted" : good ? "success" : "destructive"} className="tabular-nums">
      {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(change > -10 && change < 10 ? 1 : 0)}%
    </Badge>
  );
}
