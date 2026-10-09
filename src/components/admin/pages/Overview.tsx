"use client";
import * as React from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CircleCheck,
  FolderTree,
  ImageOff,
  LayoutTemplate,
  PackagePlus,
  Receipt,
  ShoppingBag,
  Tag,
  UserPlus,
  Wallet,
} from "lucide-react";
import { cn } from "../lib/utils";
import { compactMoney, date, money, number, timeAgo, useApi } from "../lib/api";
import type { Overview } from "../lib/types";
import { Button } from "../ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress, Skeleton, Tabs, TabsList, TabsTrigger } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ChartContainer, ChartTooltipContent } from "../ui/chart";
import { Delta, EmptyState, ErrorNote, STATUS_COLOR, StatusBadge, Thumb } from "../shared/kit";

const PERIODS = [
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
  { days: 365, label: "12M" },
];
const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

/** Fills days without activity so the trend line doesn't skip gaps. */
function fillDays<T extends { _id: string }>(rows: T[], days: number, empty: Omit<T, "_id">) {
  const byDay = new Map(rows.map((r) => [r._id, r]));
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" });
  return Array.from({ length: days }, (_, i) => {
    const key = fmt.format(new Date(Date.now() - (days - 1 - i) * 86400_000));
    return byDay.get(key) ?? ({ _id: key, ...empty } as T);
  });
}

const shortDay = (key: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(key + "T00:00:00"));

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Dhaka" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function Sparkline({ data, dataKey }: { data: Record<string, unknown>[]; dataKey: string }) {
  const id = `spark-${dataKey}`;
  return (
    <ChartContainer className="h-11">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke="var(--chart-1)" strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} dot={false} />
      </AreaChart>
    </ChartContainer>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  current,
  previous,
  note,
  spark,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  current: number;
  previous: number;
  note: string;
  spark?: React.ReactNode;
}) {
  return (
    <Card className="gap-3 overflow-hidden pb-3">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-semibold text-muted-foreground">{label}</span>
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-primary dark:text-brand">
            <Icon className="size-[18px]" />
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <strong className="text-[26px] leading-none font-extrabold tracking-tight tabular-nums">{value}</strong>
          <Delta current={current} previous={previous} />
        </div>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
      {spark && <div className="-mb-3">{spark}</div>}
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading overview">
      <Skeleton className="h-40 rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

export function OverviewPage() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const [showTable, setShowTable] = useState(false);
  const { data, error, loading, reload } = useApi<Overview>(`admin/overview?days=${days}`);
  const chart = useMemo(() => {
    if (!data) return [];
    const revenue = fillDays(data.series, data.days, { revenue: 0, orders: 0 });
    const orders = new Map(fillDays(data.orderSeries, data.days, { orders: 0, value: 0 }).map((r) => [r._id, r.orders]));
    return revenue.map((r) => ({ day: r._id, revenue: r.revenue, orders: orders.get(r._id) ?? 0 }));
  }, [data]);

  if (error && !data) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <OverviewSkeleton />;

  const totalStatuses = data.statuses.reduce((s, x) => s + x.count, 0);
  const maxCategory = Math.max(1, ...data.categoryRevenue.map((c) => c.revenue));
  const periodLabel = days === 365 ? "12 months" : `${days} days`;
  const h = data.health;
  const health = h
    ? [
        { label: "Products without images", count: h.noImage, href: "/admin/products?status=noimage", icon: ImageOff },
        { label: "Products without a category", count: h.noCategory, href: "/admin/products?category=_none", icon: FolderTree },
        { label: "Active products out of stock", count: h.outOfStock, href: "/admin/inventory?status=out", icon: Boxes },
        { label: "Products with no price", count: h.noPrice, href: "/admin/products?status=noprice", icon: Tag },
      ]
    : [];

  return (
    <div className={cn("space-y-6 transition-opacity", loading && "opacity-70")} aria-busy={loading}>
      {/* Welcome banner — echoes the storefront's brown flash-sale band */}
      <section className="bg-brand-gradient relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-xl shadow-[#6d3f0e]/20 md:px-9 md:py-8">
        <div className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full bg-[#e9ccae]/15 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#f3dcc0] uppercase">{greeting()}</p>
            <h1 className="mt-2 text-[28px] leading-tight font-extrabold tracking-tight md:text-[34px]">Here&apos;s how dazzle.bd is doing</h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              {data.pendingOrders
                ? `${data.pendingOrders} order${data.pendingOrders === 1 ? " is" : "s are"} waiting for confirmation. `
                : "No orders are waiting for confirmation. "}
              {money(data.revenue)} collected in the last {periodLabel}.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="sm" className="bg-white text-[#4b2c0a] shadow-none hover:bg-[#fff6ea]">
                <Link href="/admin/products/new">
                  <PackagePlus /> Add product
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/admin/orders?status=pending">
                  <ShoppingBag /> Review orders
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/admin/homepage">
                  <LayoutTemplate /> Customize homepage
                </Link>
              </Button>
            </div>
          </div>
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <TabsList className="bg-black/25 text-white/70" aria-label="Reporting period">
              {PERIODS.map((p) => (
                <TabsTrigger key={p.days} value={String(p.days)} className="px-3.5 data-[state=active]:bg-white data-[state=active]:text-[#4b2c0a]">
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Revenue collected"
          value={money(data.revenue)}
          icon={Wallet}
          current={data.revenue}
          previous={data.previous.revenue}
          note={`Delivered orders · vs previous ${periodLabel}`}
          spark={<Sparkline data={chart} dataKey="revenue" />}
        />
        <Kpi
          label="Orders received"
          value={number(data.orders)}
          icon={Receipt}
          current={data.orders}
          previous={data.previous.orders}
          note={`Placed in the last ${periodLabel}`}
          spark={<Sparkline data={chart} dataKey="orders" />}
        />
        <Kpi
          label="Average order value"
          value={money(data.averageOrderValue)}
          icon={ShoppingBag}
          current={data.averageOrderValue}
          previous={data.previous.averageOrderValue}
          note="Collected revenue per delivered order"
        />
        <Kpi
          label="New customers"
          value={number(data.newCustomers)}
          icon={UserPlus}
          current={data.newCustomers}
          previous={data.previous.newCustomers}
          note={`${number(data.customers)} registered customers in total`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{metric === "revenue" ? "Revenue collected" : "Orders placed"}</CardTitle>
            <CardDescription>
              {metric === "revenue" ? "Net of refunds, by delivery date" : "By order date"} · last {periodLabel}
            </CardDescription>
            <CardAction className="flex items-center gap-2">
              <Tabs value={metric} onValueChange={(v) => setMetric(v as "revenue" | "orders")}>
                <TabsList aria-label="Chart metric">
                  <TabsTrigger value="revenue">Revenue</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-72">
              <AreaChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} minTickGap={28} tickFormatter={shortDay} />
                <YAxis
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tickFormatter={(v) => (metric === "revenue" ? compactMoney(v) : String(v))}
                />
                <ChartTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={
                    <ChartTooltipContent
                      labelFormat={(d) => date(d + "T00:00:00")}
                      format={(v) => (metric === "revenue" ? money(v) : `${v} orders`)}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  name={metric === "revenue" ? "Revenue" : "Orders"}
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#trend-fill)"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
                />
              </AreaChart>
            </ChartContainer>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {metric === "revenue"
                  ? `${money(data.revenue)} collected from ${data.series.reduce((s, x) => s + x.orders, 0)} delivered orders`
                  : `${number(data.orders)} orders placed`}
              </span>
              <button type="button" className="font-semibold text-foreground underline-offset-2 hover:underline" onClick={() => setShowTable((s) => !s)}>
                {showTable ? "Hide data table" : "View as table"}
              </button>
            </div>
            {showTable && (
              <div className="admin-scroll mt-3 max-h-56 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Orders placed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chart
                      .filter((r) => r.revenue || r.orders)
                      .map((r) => (
                        <TableRow key={r.day}>
                          <TableCell>{date(r.day + "T00:00:00")}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(r.revenue)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.orders}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order pipeline</CardTitle>
            <CardDescription>All orders by fulfillment stage</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/orders">
                  All <ArrowUpRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="mb-3 flex items-baseline gap-2">
              <strong className="text-3xl font-extrabold tabular-nums">{number(totalStatuses)}</strong>
              <span className="text-sm text-muted-foreground">orders all time</span>
            </p>
            {STATUSES.map((status) => {
              const count = data.statuses.find((s) => s._id === status)?.count ?? 0;
              return (
                <Link
                  key={status}
                  href={`/admin/orders?status=${status}`}
                  className="block rounded-lg px-2 py-2 transition hover:bg-muted/60"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <StatusBadge value={status} />
                    <span className="text-sm font-bold tabular-nums">{count}</span>
                  </div>
                  <Progress
                    value={totalStatuses ? (count / totalStatuses) * 100 : 0}
                    indicatorClassName="opacity-85"
                    aria-label={`${status}: ${count}`}
                    style={{ ["--tw-bg" as string]: STATUS_COLOR[status] }}
                    className="[&>div]:bg-(--tw-bg)"
                  />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>The latest activity at checkout</CardDescription>
            <CardAction>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/orders">View all</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {data.recentOrders.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Placed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-5 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.map((o) => (
                    <TableRow key={o._id}>
                      <TableCell className="pl-5">
                        <Link href={`/admin/orders?q=${o.orderNo}`} className="font-bold text-primary hover:underline dark:text-brand">
                          {o.orderNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="block font-medium">{o.customer.name}</span>
                        <span className="text-xs text-muted-foreground">{o.customer.city}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{timeAgo(o.createdAt)}</TableCell>
                      <TableCell>
                        <StatusBadge value={o.status} />
                      </TableCell>
                      <TableCell className="pr-5 text-right font-bold tabular-nums">{money(o.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={Receipt} title="No orders yet" description="Orders appear here the moment customers check out." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by category</CardTitle>
            <CardDescription>Delivered revenue · last {periodLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.categoryRevenue.length ? (
              <ul className="space-y-3.5">
                {data.categoryRevenue.map((c) => (
                  <li key={c._id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-semibold">{c.name}</span>
                      <span className="shrink-0 tabular-nums">
                        {money(c.revenue)} <span className="text-xs text-muted-foreground">· {c.qty} sold</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-chart-1" style={{ width: `${(c.revenue / maxCategory) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FolderTree} title="No category sales yet" description="Category performance appears after orders are delivered." className="py-8" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Best sellers</CardTitle>
            <CardDescription>Units delivered · last {periodLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topProducts.length ? (
              <ol className="space-y-3">
                {data.topProducts.map((p, i) => (
                  <li key={p._id} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-extrabold text-brand tabular-nums">{i + 1}</span>
                    <Thumb image={p.image} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.qty} units</span>
                    </span>
                    <span className="text-sm font-bold tabular-nums">{money(p.revenue)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={ShoppingBag} title="Room for your best sellers" description="Rankings appear after orders are delivered." className="py-8" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory watch</CardTitle>
            <CardDescription>
              {h ? `${number(h.units)} units on hand · ${compactMoney(h.stockValue)} retail value` : "Stock that needs attention"}
            </CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/inventory?status=low">
                  Manage <ArrowUpRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {data.lowStock.length ? (
              <ul className="space-y-3">
                {data.lowStock.map((p) => (
                  <li key={p._id}>
                    <Link href={`/admin/products/${p._id}`} className="flex items-center gap-3 rounded-lg transition hover:opacity-80">
                      <Thumb image={p.image} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.code}</span>
                      </span>
                      <StatusBadge value={p.stock === 0 ? "out of stock" : "low stock"} />
                      <span className="w-8 text-right text-sm font-bold tabular-nums">{p.stock}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={CircleCheck} title="Stock levels look healthy" className="py-8" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalog health</CardTitle>
            <CardDescription>Fix these to improve your storefront</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {health.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:border-ring/40 hover:bg-muted/40"
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg",
                    item.count ? "bg-warning/12 text-warning" : "bg-success/12 text-success",
                  )}
                >
                  {item.count ? <AlertTriangle className="size-4" /> : <CircleCheck className="size-4" />}
                </span>
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                <span className="text-sm font-bold tabular-nums">{number(item.count)}</span>
              </Link>
            ))}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              {[
                { label: "Inbox", value: data.inbox.messages, href: "/admin/messages" },
                { label: "Support", value: data.inbox.tickets, href: "/admin/tickets" },
                { label: "Reviews", value: data.inbox.reviews, href: "/admin/reviews" },
              ].map((s) => (
                <Link key={s.label} href={s.href} className="rounded-xl bg-muted/60 px-2 py-2.5 transition hover:bg-muted">
                  <strong className="block text-lg font-extrabold tabular-nums">{s.value}</strong>
                  <span className="text-[11px] text-muted-foreground">{s.label} waiting</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Changes made in the dashboard</CardDescription>
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/activity">
                Full log <ArrowUpRight />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length ? (
            <ol className="relative space-y-4 border-l pl-5">
              {data.recentActivity.map((a) => (
                <li key={a._id} className="relative">
                  <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-brand" />
                  <p className="text-sm">
                    <strong className="font-semibold">{a.action.replace(".", " · ")}</strong>
                    {a.detail && <span className="text-muted-foreground"> — {a.detail}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
