"use client";
import * as React from "react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Download, Printer } from "lucide-react";
import { cn } from "../lib/utils";
import { compactMoney, money, number, useApi } from "../lib/api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Skeleton, Tabs, TabsList, TabsTrigger } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ChartContainer, ChartTooltipContent } from "../ui/chart";
import { EmptyState, ErrorNote, PageHeader, Thumb } from "../shared/kit";
import { DateRangePicker, presetRange, type Range } from "../shared/list";

type Row = Record<string, unknown> & { _id: string };
interface Report {
  type: string;
  group: "day" | "month";
  summary: Record<string, number>;
  series: Row[];
  tables: Record<string, Row[]>;
}

const TYPES = [
  { value: "sales", label: "Sales" },
  { value: "profit", label: "Profit & loss" },
  { value: "stock", label: "Stock" },
  { value: "stock-alert", label: "Stock alerts" },
  { value: "purchase", label: "Purchases" },
  { value: "expense", label: "Expenses" },
];

type Col = { key: string; label: string; money?: boolean; right?: boolean; render?: (r: Row) => React.ReactNode };
function DataTable({ title, rows, cols, file }: { title: string; rows: Row[]; cols: Col[]; file: string }) {
  const csv = () => {
    const cell = (v: unknown) => {
      let t = v == null ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
      return `"${t.replaceAll('"', '""')}"`;
    };
    const text = "﻿" + [cols.map((c) => cell(c.label)).join(","), ...rows.map((r) => cols.map((c) => cell(r[c.key])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `dazzle-${file}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card className="gap-0 py-0 break-inside-avoid">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <p className="font-bold">{title}</p>
        <Button size="sm" variant="ghost" onClick={csv} disabled={!rows.length} className="print:hidden">
          <Download /> CSV
        </Button>
      </div>
      {rows.length ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {cols.map((c) => (
                <TableHead key={c.key} className={cn(c.right || c.money ? "text-right" : "", "first:pl-5 last:pr-5")}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={String(r._id) + i}>
                {cols.map((c) => (
                  <TableCell key={c.key} className={cn(c.right || c.money ? "text-right tabular-nums" : "", "first:pl-5 last:pr-5")}>
                    {c.render ? c.render(r) : c.money ? money(Number(r[c.key] ?? 0)) : c.right ? number(Number(r[c.key] ?? 0)) : String(r[c.key] ?? "—")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">No data for this period.</p>
      )}
    </Card>
  );
}

function Tiles({ items }: { items: { label: string; value: string; tone?: string; note?: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((t) => (
        <Card key={t.label} className="gap-1 py-4">
          <CardContent>
            <p className="text-xs font-semibold text-muted-foreground">{t.label}</p>
            <p className={cn("mt-1 text-2xl font-extrabold tracking-tight tabular-nums", t.tone)}>{t.value}</p>
            {t.note && <p className="mt-0.5 text-xs text-muted-foreground">{t.note}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SeriesChart({ rows, dataKey, label, group }: { rows: Row[]; dataKey: string; label: string; group: "day" | "month" }) {
  if (!rows.length) return null;
  const fmt = (p: string) =>
    group === "month"
      ? new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(new Date(p + "-01T00:00:00"))
      : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(p + "T00:00:00"));
  const hasNegative = rows.some((r) => Number(r[dataKey]) < 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>By {group}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-64">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 4" />
            <XAxis dataKey="_id" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} tickFormatter={fmt} />
            <YAxis width={56} tickLine={false} axisLine={false} tickFormatter={(v) => compactMoney(v)} />
            {hasNegative && <ReferenceLine y={0} stroke="var(--border)" />}
            <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent labelFormat={fmt} format={(v) => money(v)} />} />
            <Bar dataKey={dataKey} name={label} radius={[4, 4, 0, 0]} maxBarSize={36}>
              {rows.map((r) => (
                <Cell key={r._id} fill={Number(r[dataKey]) < 0 ? "var(--destructive)" : "var(--chart-1)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const productCell = (r: Row) => (
  <span className="flex items-center gap-2.5">
    <Thumb image={r.image as never} size={32} />
    <span>
      <span className="block font-medium">{String(r.name)}</span>
      <span className="text-xs text-muted-foreground">{String(r.code ?? "")}</span>
    </span>
  </span>
);

export function ReportsPage({ description }: { description: string }) {
  const [type, setType] = useState("sales");
  const [range, setRange] = useState<Range>(presetRange("30d"));
  const [group, setGroup] = useState<"day" | "month">("day");
  const dated = !["stock", "stock-alert"].includes(type);
  const { data, error, loading, reload } = useApi<Report>(`admin/reports?type=${type}&from=${range.from}&to=${range.to}&group=${group}`);
  const s = data?.type === type ? data.summary : null;
  const t = data?.type === type ? data.tables : {};
  const series = data?.type === type ? data.series : [];
  const file = `${type}-${range.from}-to-${range.to}`;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Reports"
        description={description}
        actions={
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer /> Print
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <Tabs value={type} onValueChange={setType}>
          <TabsList className="h-auto flex-wrap justify-start">
            {TYPES.map((x) => (
              <TabsTrigger key={x.value} value={x.value} className="py-1.5">
                {x.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {dated && (
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker value={range} onChange={setRange} />
            <Tabs value={group} onValueChange={(v) => setGroup(v as "day" | "month")}>
              <TabsList>
                <TabsTrigger value="day">Daily</TabsTrigger>
                <TabsTrigger value="month">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {!s ? (
        <div className="grid gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : (
        <div className={cn("grid gap-5 transition-opacity", loading && "opacity-60")}>
          {type === "sales" && (
            <>
              <Tiles
                items={[
                  { label: "Order value", value: money(s.total), note: `${number(s.orders)} orders · ${number(s.units)} units` },
                  { label: "Average order", value: money(s.average) },
                  { label: "Discounts given", value: money(s.discount), note: `Delivery charged ${money(s.shipping)}` },
                  { label: "Collected so far", value: money(s.collected), note: `${number(s.cancelled)} cancelled orders excluded` },
                ]}
              />
              <SeriesChart rows={series} dataKey="total" label="Order value" group={group} />
              <DataTable
                title={`Sales by ${group}`}
                file={file}
                rows={series}
                cols={[
                  { key: "_id", label: group === "day" ? "Date" : "Month" },
                  { key: "orders", label: "Orders", right: true },
                  { key: "units", label: "Units", right: true },
                  { key: "gross", label: "Gross", money: true },
                  { key: "discount", label: "Discount", money: true },
                  { key: "shipping", label: "Delivery", money: true },
                  { key: "total", label: "Total", money: true },
                  { key: "collected", label: "Collected", money: true },
                ]}
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <DataTable title="By channel" file={`${file}-channel`} rows={t.byChannel ?? []} cols={[{ key: "_id", label: "Channel", render: (r) => String(r._id ?? "web") }, { key: "orders", label: "Orders", right: true }, { key: "total", label: "Value", money: true }]} />
                <DataTable title="By payment method" file={`${file}-payment`} rows={t.byPayment ?? []} cols={[{ key: "_id", label: "Method" }, { key: "orders", label: "Orders", right: true }, { key: "total", label: "Value", money: true }]} />
              </div>
              <DataTable title="Top products" file={`${file}-products`} rows={t.products ?? []} cols={[{ key: "name", label: "Product" }, { key: "qty", label: "Units", right: true }, { key: "revenue", label: "Revenue", money: true }]} />
            </>
          )}
          {type === "profit" && (
            <>
              {s.unknownCostUnits > 0 && (
                <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <p>
                    {number(s.unknownCostUnits)} units were sold without a cost price, so profit is overstated. Add cost prices in the product editor or receive stock through Purchases.
                  </p>
                </div>
              )}
              <Tiles
                items={[
                  { label: "Net sales", value: money(s.netSales), note: `${number(s.orders)} delivered orders` },
                  { label: "Cost of goods", value: money(s.cogs) },
                  { label: "Gross profit", value: money(s.grossProfit), note: `${s.margin}% margin`, tone: s.grossProfit < 0 ? "text-destructive" : "" },
                  { label: "Net profit", value: money(s.netProfit), note: `After ${money(s.expenses)} expenses, incl. ${money(s.shipping)} delivery income`, tone: s.netProfit < 0 ? "text-destructive" : "text-success" },
                ]}
              />
              <SeriesChart rows={series} dataKey="netProfit" label="Net profit" group={group} />
              <DataTable
                title="Profit & loss"
                file={file}
                rows={series}
                cols={[
                  { key: "_id", label: group === "day" ? "Date" : "Month" },
                  { key: "orders", label: "Orders", right: true },
                  { key: "netSales", label: "Net sales", money: true },
                  { key: "cogs", label: "Cost of goods", money: true },
                  { key: "grossProfit", label: "Gross profit", money: true },
                  { key: "shipping", label: "Delivery income", money: true },
                  { key: "expenses", label: "Expenses", money: true },
                  { key: "netProfit", label: "Net profit", money: true, render: (r) => <span className={cn("font-bold", Number(r.netProfit) < 0 ? "text-destructive" : "")}>{money(Number(r.netProfit))}</span> },
                ]}
              />
            </>
          )}
          {(type === "stock" || type === "stock-alert") && (
            <>
              <Tiles
                items={[
                  { label: type === "stock" ? "Products" : "Products at or below alert", value: number(s.products) },
                  { label: "Units on hand", value: number(s.units) },
                  { label: "Stock value (cost)", value: money(s.costValue), note: s.noCost ? `${s.noCost} products have no cost price` : undefined },
                  { label: "Stock value (retail)", value: money(s.retailValue), note: `${number(s.outOfStock)} out of stock` },
                ]}
              />
              {type === "stock" && <DataTable title="By category" file={`${file}-category`} rows={t.byCategory ?? []} cols={[{ key: "_id", label: "Category" }, { key: "products", label: "Products", right: true }, { key: "units", label: "Units", right: true }, { key: "costValue", label: "Cost value", money: true }, { key: "retailValue", label: "Retail value", money: true }]} />}
              <DataTable
                title={type === "stock" ? "Products (top 500 by stock)" : "Products needing restock"}
                file={file}
                rows={t.products ?? []}
                cols={[
                  { key: "name", label: "Product", render: productCell },
                  { key: "stock", label: "On hand", right: true, render: (r) => <span className={cn("font-bold", Number(r.stock) <= 0 ? "text-destructive" : Number(r.stock) <= Number(r.alertAt) ? "text-warning" : "")}>{number(Number(r.stock))}</span> },
                  { key: "alertAt", label: "Alert at", right: true },
                  { key: "cost", label: "Unit cost", money: true, render: (r) => (r.cost == null ? "—" : money(Number(r.cost))) },
                  { key: "costValue", label: "Cost value", money: true },
                  { key: "retailValue", label: "Retail value", money: true },
                ]}
              />
            </>
          )}
          {type === "purchase" && (
            <>
              <Tiles items={[{ label: "Purchases", value: number(s.purchases) }, { label: "Total bought", value: money(s.total) }, { label: "Paid to suppliers", value: money(s.paid) }, { label: "Still due", value: money(s.due), tone: s.due > 0 ? "text-warning" : "" }]} />
              <SeriesChart rows={series} dataKey="total" label="Purchases" group={group} />
              <div className="grid gap-5 lg:grid-cols-2">
                <DataTable title="By supplier" file={`${file}-supplier`} rows={t.bySupplier ?? []} cols={[{ key: "name", label: "Supplier" }, { key: "purchases", label: "Purchases", right: true }, { key: "total", label: "Total", money: true }, { key: "due", label: "Due", money: true }]} />
                <DataTable title="Most purchased items" file={`${file}-items`} rows={t.items ?? []} cols={[{ key: "name", label: "Product" }, { key: "qty", label: "Units", right: true }, { key: "cost", label: "Cost", money: true }]} />
              </div>
              <DataTable title={`Purchases by ${group}`} file={file} rows={series} cols={[{ key: "_id", label: group === "day" ? "Date" : "Month" }, { key: "purchases", label: "Purchases", right: true }, { key: "total", label: "Total", money: true }, { key: "paid", label: "Paid", money: true }, { key: "due", label: "Due", money: true }]} />
            </>
          )}
          {type === "expense" && (
            <>
              <Tiles items={[{ label: "Total expenses", value: money(s.amount) }, { label: "Entries", value: number(s.entries) }]} />
              <SeriesChart rows={series} dataKey="amount" label="Expenses" group={group} />
              <div className="grid gap-5 lg:grid-cols-2">
                <DataTable title="By category" file={`${file}-category`} rows={t.byCategory ?? []} cols={[{ key: "_id", label: "Category" }, { key: "entries", label: "Entries", right: true }, { key: "amount", label: "Amount", money: true }]} />
                <DataTable title={`By ${group}`} file={file} rows={series} cols={[{ key: "_id", label: group === "day" ? "Date" : "Month" }, { key: "entries", label: "Entries", right: true }, { key: "amount", label: "Amount", money: true }]} />
              </div>
            </>
          )}
          {!series.length && dated && !Object.values(t).some((r) => r.length) && <EmptyState icon={AlertTriangle} title="Nothing recorded in this period" description="Try a wider date range." />}
        </div>
      )}
    </>
  );
}
