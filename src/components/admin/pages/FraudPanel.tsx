"use client";
import * as React from "react";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "../lib/utils";
import { useApi } from "../lib/api";
import { Progress, Skeleton } from "../ui/controls";
import { StatusBadge } from "../shared/kit";

export interface FraudReport {
  phone: string;
  total: number;
  delivered: number;
  cancelled: number;
  returned: number;
  open: number;
  successRate: number | null;
  risk: "new" | "low" | "medium" | "high" | "blocked";
  blocked: boolean;
  recent: { _id: string; orderNo: string; status: string; total: number; createdAt: string }[];
}

const RISK = {
  new: { label: "New customer", tone: "text-info bg-info/10", icon: ShieldQuestion },
  low: { label: "Low risk", tone: "text-success bg-success/10", icon: ShieldCheck },
  medium: { label: "Medium risk", tone: "text-warning bg-warning/12", icon: ShieldAlert },
  high: { label: "High risk", tone: "text-destructive bg-destructive/10", icon: ShieldAlert },
  blocked: { label: "Blocked", tone: "text-destructive bg-destructive/10", icon: ShieldAlert },
} as const;

/** Delivery success history for a phone number, from this store's orders. */
export function FraudPanel({ phone, compact = false }: { phone: string; compact?: boolean }) {
  const { data, loading, error } = useApi<FraudReport>(`admin/fraud?phone=${encodeURIComponent(phone)}`, 400);
  if (error) return null;
  if (loading && !data) return <Skeleton className="h-16 rounded-xl" />;
  if (!data) return null;
  const risk = RISK[data.risk];
  return (
    <div className={cn("rounded-xl border p-3.5", data.risk === "high" || data.blocked ? "border-destructive/40" : "")}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", risk.tone)}>
          <risk.icon className="size-3.5" /> {risk.label}
        </span>
        <span className="text-sm">
          <strong className="tabular-nums">{data.delivered}</strong> delivered · <strong className="tabular-nums">{data.cancelled}</strong> cancelled ·{" "}
          <strong className="tabular-nums">{data.returned}</strong> returned{data.open ? ` · ${data.open} open` : ""}
        </span>
        {data.successRate !== null && <span className="ml-auto text-sm font-extrabold tabular-nums">{data.successRate}% success</span>}
      </div>
      {data.successRate !== null && (
        <Progress
          value={data.successRate}
          className="mt-2.5"
          indicatorClassName={data.successRate >= 80 ? "bg-success" : data.successRate >= 50 ? "bg-warning" : "bg-destructive"}
          aria-label={`${data.successRate}% delivery success`}
        />
      )}
      {!compact && data.recent.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {data.recent.map((o) => (
            <li key={o._id} className="flex items-center justify-between gap-2">
              <span className="font-semibold">{o.orderNo}</span>
              <StatusBadge value={o.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
