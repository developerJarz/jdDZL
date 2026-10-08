"use client";
import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "../lib/utils";

/** Fixed-height responsive wrapper for recharts with the admin's axis/grid styling. */
function ChartContainer({ className, children }: { className?: string; children: React.ReactElement }) {
  return (
    <div
      className={cn(
        "h-64 w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/60 [&_.recharts-sector]:outline-none",
        className,
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipPayload {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

/** Tooltip body for recharts' `content` prop. */
function ChartTooltipContent({
  active,
  payload,
  label,
  format,
  labelFormat,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  format?: (value: number, key: string) => string;
  labelFormat?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs shadow-xl">
      {label !== undefined && (
        <p className="mb-1.5 font-semibold text-foreground">{labelFormat ? labelFormat(String(label)) : label}</p>
      )}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={String(item.dataKey ?? item.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <i className="size-2 rounded-[3px]" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {format ? format(Number(item.value), String(item.dataKey)) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltipContent };
