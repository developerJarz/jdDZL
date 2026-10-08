"use client";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Mail, Phone, UserX, Users, UserCheck } from "lucide-react";
import type { Address, Ticket } from "@/components/auth/account-types";
import { date, exportCsv, money, send, useApi } from "../lib/api";
import type { Customer, Order, PageResult } from "../lib/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input, Textarea } from "../ui/input";
import { Skeleton } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/dialog";
import { EmptyState, ErrorNote, Field, LoadingRows, PageHeader, Pagination, SearchInput, Spinner, StatusBadge, useConfirm } from "../shared/kit";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f3dcc0,#cb843b)] text-xs font-bold text-[#3b2209]"
      style={{ width: size, height: size }}
    >
      {initials(name) || "?"}
    </span>
  );
}

function CustomerSheet({ customer, onClose, onChanged }: { customer: Customer; onClose: () => void; onChanged: () => void }) {
  const confirm = useConfirm();
  const { data, error, setData } = useApi<{ customer: Customer & { addresses?: Address[] }; orders: Order[]; tickets: Ticket[] }>(
    `admin/operations/customers/${customer._id}`,
  );
  const [busy, setBusy] = useState(false);
  const delivered = data?.orders.filter((o) => o.status === "delivered") ?? [];
  const lifetime = delivered.reduce((s, o) => s + o.total - (o.refund?.amount ?? 0), 0);
  const active = data ? data.customer.active !== false : customer.active;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar name={customer.name} size={48} />
            <div>
              <SheetTitle>{customer.name}</SheetTitle>
              <SheetDescription>Customer since {date(customer.createdAt)}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <SheetBody className="grid content-start gap-6">
          {error && <ErrorNote message={error} />}
          <div className="flex flex-wrap gap-2 text-sm">
            <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 hover:bg-muted">
              <Mail className="size-3.5" /> {customer.email}
            </a>
            <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 hover:bg-muted">
              <Phone className="size-3.5" /> {customer.phone}
            </a>
            <StatusBadge value={active ? "active" : "disabled"} className="self-center" />
          </div>
          {!data ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Orders", value: String(data.orders.length) },
                  { label: "Lifetime value", value: money(lifetime) },
                  { label: "Avg. order", value: money(delivered.length ? lifetime / delivered.length : 0) },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-muted/50 px-2 py-3">
                    <p className="text-lg font-extrabold tabular-nums">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-sm font-bold">Order history</p>
                {data.orders.length ? (
                  <div className="divide-y rounded-xl border">
                    {data.orders.slice(0, 20).map((o) => (
                      <a key={o._id} href={`/admin/orders?q=${o.orderNo}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-muted/40">
                        <span>
                          <span className="font-semibold">{o.orderNo}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{date(o.createdAt)}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <StatusBadge value={o.status} />
                          <span className="w-24 text-right font-bold tabular-nums">{money(o.total)}</span>
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                )}
              </div>
              {data.customer.addresses?.length ? (
                <div>
                  <p className="mb-2 text-sm font-bold">Saved addresses</p>
                  <div className="grid gap-2">
                    {data.customer.addresses.map((a) => (
                      <div key={a.id} className="rounded-xl border px-3 py-2.5 text-sm">
                        <p className="font-semibold">
                          {a.label} {a.default && <Badge variant="brand">Default</Badge>}
                        </p>
                        <p className="text-muted-foreground">
                          {a.address}, {a.city} · {a.phone}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {data.tickets.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-bold">Support requests</p>
                  <div className="grid gap-1.5">
                    {data.tickets.map((t) => (
                      <div key={t._id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <span className="truncate">{t.subject}</span>
                        <StatusBadge value={t.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <form
                className="grid gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  setBusy(true);
                  try {
                    await send(`admin/operations/customers/${customer._id}`, {
                      notes: f.get("notes"),
                      tags: String(f.get("tags"))
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    });
                    toast.success("Customer notes saved");
                  } catch (err) {
                    toast.error((err as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Field label="Internal notes" hint="Only visible to your team.">
                  <Textarea name="notes" rows={3} maxLength={5000} defaultValue={data.customer.notes} />
                </Field>
                <Field label="Tags" hint="Comma-separated, e.g. VIP, corporate">
                  <Input name="tags" defaultValue={data.customer.tags?.join(", ")} />
                </Field>
                <Button variant="outline" disabled={busy} className="w-fit">
                  {busy && <Spinner />} Save notes
                </Button>
              </form>
            </>
          )}
        </SheetBody>
        <SheetFooter>
          <Button
            variant={active ? "outline" : "default"}
            className={active ? "text-destructive" : ""}
            onClick={async () => {
              if (
                !(await confirm({
                  title: `${active ? "Disable" : "Enable"} ${customer.name}?`,
                  description: active ? "They will be signed out and unable to log in or check out." : "They will be able to sign in again.",
                  confirmLabel: active ? "Disable account" : "Enable account",
                  destructive: active,
                }))
              )
                return;
              try {
                await send(`admin/customers/${customer._id}`, { active: !active }, "PATCH");
                setData((d) => d && { ...d, customer: { ...d.customer, active: !active } });
                toast.success(`Account ${active ? "disabled" : "enabled"}`);
                onChanged();
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            {active ? <UserX /> : <UserCheck />} {active ? "Disable account" : "Enable account"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function CustomersPage({ description }: { description: string }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Customer | null>(null);
  const { data, error, loading, reload } = useApi<PageResult<Customer>>(`admin/customers?limit=20&page=${page}&q=${encodeURIComponent(query)}`, 200);
  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Customers"
        description={description}
        actions={
          <Button
            variant="outline"
            onClick={async () => {
              try {
                toast.success(`Exported ${await exportCsv("customers", `q=${encodeURIComponent(query)}`)} customers`);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <Download /> Export
          </Button>
        }
      />
      <Card className="gap-0 py-0">
        <div className="border-b p-3">
          <SearchInput
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Search name or email…"
          />
        </div>
        {error && (
          <div className="p-3">
            <ErrorNote message={error} onRetry={reload} />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="pr-5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <LoadingRows cols={5} />
            ) : (
              data?.items.map((c) => (
                <TableRow key={c._id} className="cursor-pointer" onClick={() => setOpen(c)}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <span>
                        <span className="block font-semibold">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.email}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{date(c.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="pr-5">
                    <StatusBadge value={c.active !== false ? "active" : "disabled"} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data && !data.items.length && <EmptyState icon={Users} title={query ? "No customers match" : "No customers yet"} description="Customer accounts appear here after registration." />}
        {data && <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} label="customers" />}
      </Card>
      {open && <CustomerSheet customer={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  );
}
