"use client";
import * as React from "react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Check, Download, Inbox, KeyRound, LifeBuoy, Mail, Plus, Send, Star, X } from "lucide-react";
import type { ImageAsset } from "@/types";
import type { Ticket } from "@/components/auth/account-types";
import { ticketTransitions } from "@/server/customer-schemas";
import { cn } from "../lib/utils";
import { date, dateTime, exportCsv, money, send, timeAgo, useApi } from "../lib/api";
import type { Message, PageResult, Subscriber } from "../lib/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input, NativeSelect, Textarea } from "../ui/input";
import { Checkbox, Tabs, TabsList, TabsTrigger } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/dialog";
import { EmptyState, ErrorNote, Field, LoadingRows, PageHeader, Pagination, SearchInput, Spinner, StatusBadge, Thumb } from "../shared/kit";
import { ProductSearchDialog } from "../shared/pickers";
import { refreshBadges } from "../AdminShell";

function useListPage<T>(resource: string, extra = "", limit = 20) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const result = useApi<PageResult<T>>(
    `admin/${resource}?limit=${limit}&page=${page}&q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}${extra}`,
    200,
  );
  return {
    ...result,
    query,
    status,
    page,
    setPage,
    setQuery: (v: string) => {
      setQuery(v);
      setPage(1);
    },
    setStatus: (v: string) => {
      setStatus(v);
      setPage(1);
    },
  };
}

/* ---------------- Inbox ---------------- */
function RecoveryLink({ id }: { id: string }) {
  const [verified, setVerified] = useState(false);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-3 rounded-xl border border-warning/30 bg-warning/8 p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <KeyRound className="size-4 text-warning" /> Account recovery
      </p>
      <p className="text-xs text-muted-foreground">Verify the requester through the email or phone shown above. Share the link only with the verified owner.</p>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={verified} onCheckedChange={(v) => setVerified(v === true)} /> I have verified the account owner
      </label>
      <Button
        variant="outline"
        className="w-fit"
        disabled={!verified || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await send<{ path: string }>(`admin/operations/recovery/${id}`, { identityVerified: true });
            setLink(location.origin + r.path);
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Generate secure reset link
      </Button>
      {link && (
        <Field label="Reset link — expires in 30 minutes">
          <Input value={link} readOnly onFocus={(e) => e.target.select()} />
        </Field>
      )}
    </div>
  );
}

export function InboxPage({ description }: { description: string }) {
  const list = useListPage<Message>("messages");
  const [open, setOpen] = useState<Message | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const items = (list.data?.items ?? []).filter((m) => !status || m.status === status);
  const preview = (m: Message) => m.data.message || m.data.subject || Object.values(m.data).join(" · ");
  return (
    <>
      <PageHeader eyebrow="Engagement" title="Inbox" description={description} />
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={list.query} onChange={list.setQuery} placeholder="Search messages…" />
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList>
              <TabsTrigger value="">All</TabsTrigger>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="in-progress">In progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {list.error && (
          <div className="p-3">
            <ErrorNote message={list.error} onRetry={list.reload} />
          </div>
        )}
        <div className="divide-y">
          {list.loading && !list.data ? (
            <table className="w-full">
              <tbody>
                <LoadingRows cols={3} />
              </tbody>
            </table>
          ) : (
            items.map((m) => (
              <button
                key={m._id}
                type="button"
                onClick={() => setOpen(m)}
                className={cn("flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-muted/40", m.status === "new" && "bg-brand-soft/30")}
              >
                <span className={cn("mt-2 size-2 shrink-0 rounded-full", m.status === "new" ? "bg-brand" : "bg-transparent")} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn("truncate", m.status === "new" ? "font-bold" : "font-semibold")}>{m.data.name || m.data.email || "Customer"}</span>
                    <Badge variant="secondary" className="capitalize">
                      {m.kind.replaceAll("-", " ")}
                    </Badge>
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{preview(m)}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs text-muted-foreground">{timeAgo(m.createdAt)}</span>
                  <StatusBadge value={m.status} className="mt-1" />
                </span>
              </button>
            ))
          )}
        </div>
        {list.data && !items.length && <EmptyState icon={Inbox} title="Inbox zero" description="Support, feedback, corporate, and pre-order enquiries arrive here." />}
        {list.data && <Pagination page={list.page} pages={list.data.pages} total={list.data.total} onPage={list.setPage} label="messages" />}
      </Card>
      {open && (
        <Sheet open onOpenChange={(o) => !o && setOpen(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle className="capitalize">{open.kind.replaceAll("-", " ")} enquiry</SheetTitle>
              <SheetDescription>Received {dateTime(open.createdAt)}</SheetDescription>
            </SheetHeader>
            <SheetBody className="grid content-start gap-5">
              <dl className="divide-y rounded-xl border">
                {Object.entries(open.data).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2.5 text-sm">
                    <dt className="font-semibold text-muted-foreground capitalize">{k.replaceAll("_", " ")}</dt>
                    <dd className="break-words whitespace-pre-wrap">{v}</dd>
                  </div>
                ))}
              </dl>
              {open.data.email && (
                <Button asChild variant="outline" className="w-fit">
                  <a href={`mailto:${open.data.email}`}>
                    <Mail /> Reply by email
                  </a>
                </Button>
              )}
              {open.kind === "account-recovery" && <RecoveryLink id={open._id} />}
            </SheetBody>
            <SheetFooter>
              {(["new", "in-progress", "resolved"] as const).map((s) => (
                <Button
                  key={s}
                  variant={open.status === s ? "default" : "outline"}
                  disabled={busy || open.status === s}
                  className="capitalize"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await send(`admin/messages/${open._id}`, { status: s }, "PATCH");
                      setOpen({ ...open, status: s });
                      list.reload();
                      refreshBadges();
                      toast.success(`Marked ${s.replace("-", " ")}`);
                    } catch (err) {
                      toast.error((err as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {s.replace("-", " ")}
                </Button>
              ))}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

/* ---------------- Support tickets ---------------- */
function TicketSheet({ ticket, onClose, onSaved }: { ticket: Ticket; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(ticket.status);
  const [busy, setBusy] = useState(false);
  const closed = ["resolved", "rejected"].includes(ticket.status);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{ticket.subject}</SheetTitle>
          </div>
          <SheetDescription>
            {ticket.customerName} · {ticket.email} · <span className="capitalize">{ticket.kind}</span> · {ticket.orderNo || "General enquiry"}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="grid content-start gap-3">
          {ticket.messages.map((m, i) => (
            <div key={i} className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm", m.author === "store" ? "ml-auto rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted")}>
              <p className="mb-1 text-[11px] font-bold opacity-75">{m.author === "store" ? "Store team" : ticket.customerName}</p>
              <p className="whitespace-pre-wrap">{m.text}</p>
              <p className="mt-1.5 text-[10.5px] opacity-60">{dateTime(m.at)}</p>
            </div>
          ))}
          {ticket.refundAmount !== undefined && (
            <p className="rounded-xl bg-success/10 px-4 py-2.5 text-sm text-success">
              Refund recorded: {money(ticket.refundAmount)} · {ticket.refundReference}
            </p>
          )}
        </SheetBody>
        {!closed && (
          <form
            className="grid gap-3 border-t bg-muted/30 px-6 py-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              try {
                await send(`admin/operations/tickets/${ticket._id}`, {
                  status,
                  message: f.get("message"),
                  ...(f.get("refundAmount") ? { refundAmount: Number(f.get("refundAmount")), refundReference: f.get("refundReference") } : {}),
                });
                toast.success("Reply sent");
                refreshBadges();
                onSaved();
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Textarea name="message" rows={3} maxLength={4000} placeholder="Write a reply to the customer…" className="bg-card" />
            {ticket.kind === "return" && ticket.status === "received" && status === "resolved" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input name="refundAmount" type="number" min={0} step={1} placeholder="Refund amount (BDT)" />
                <Input name="refundReference" maxLength={180} placeholder="Payment reference" />
                <p className="text-xs text-muted-foreground sm:col-span-2">Records a refund you have already sent externally; it does not move money.</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <NativeSelect aria-label="Request status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto capitalize">
                <option value={ticket.status}>{ticket.status.replaceAll("-", " ")}</option>
                {(ticketTransitions[ticket.status] ?? []).map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("-", " ")}
                  </option>
                ))}
              </NativeSelect>
              <Button className="ml-auto" disabled={busy}>
                {busy ? <Spinner /> : <Send />} Send & update
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function TicketsPage({ description }: { description: string }) {
  const list = useListPage<Ticket>("operations/tickets");
  const [open, setOpen] = useState<Ticket | null>(null);
  return (
    <>
      <PageHeader eyebrow="Engagement" title="Support & returns" description={description} />
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={list.query} onChange={list.setQuery} placeholder="Subject, order or customer…" />
          <NativeSelect aria-label="Filter by status" value={list.status} onChange={(e) => list.setStatus(e.target.value)} className="w-auto capitalize">
            <option value="">All statuses</option>
            {Object.keys(ticketTransitions).map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("-", " ")}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Request</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead className="pr-5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && !list.data ? (
              <LoadingRows cols={5} />
            ) : (
              list.data?.items.map((t) => (
                <TableRow key={t._id} className="cursor-pointer" onClick={() => setOpen(t)}>
                  <TableCell className="pl-5">
                    <span className="block font-semibold">{t.subject}</span>
                    <span className="text-xs text-muted-foreground">{t.customerName}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {t.kind}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{t.orderNo || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{timeAgo(t.createdAt)}</TableCell>
                  <TableCell className="pr-5">
                    <StatusBadge value={t.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {list.data && !list.data.items.length && <EmptyState icon={LifeBuoy} title="A clear support queue" description="Support, return, and warranty requests from customer accounts appear here." />}
        {list.data && <Pagination page={list.page} pages={list.data.pages} total={list.data.total} onPage={list.setPage} label="requests" />}
      </Card>
      {open && (
        <TicketSheet
          ticket={open}
          onClose={() => setOpen(null)}
          onSaved={() => {
            setOpen(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}

/* ---------------- Reviews ---------------- */
type Review = { _id: string; slug: string; rating: number; comment: string; customerName: string; status: string; createdAt: string };

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-4", i < rating ? "fill-[#e0a462] text-[#e0a462]" : "text-input")} />
      ))}
    </span>
  );
}

export function ReviewsPage({ description }: { description: string }) {
  const list = useListPage<Review>("operations/reviews");
  const [busy, setBusy] = useState("");
  const moderate = async (r: Review, status: "approved" | "rejected") => {
    setBusy(r._id);
    try {
      await send(`admin/operations/reviews/${r._id}`, { status });
      toast.success(status === "approved" ? "Review published" : "Review rejected");
      list.reload();
      refreshBadges();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <PageHeader eyebrow="Engagement" title="Product reviews" description={description} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={list.query} onChange={list.setQuery} placeholder="Search reviews…" />
        <Tabs value={list.status} onValueChange={list.setStatus}>
          <TabsList>
            <TabsTrigger value="">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Published</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {list.error && <ErrorNote message={list.error} onRetry={list.reload} />}
      {list.data && !list.data.items.length ? (
        <Card>
          <EmptyState icon={Star} title="No reviews to show" description="Customers with delivered orders can review products from their account." />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.data?.items.map((r) => (
            <Card key={r._id} className="gap-3 py-4">
              <div className="flex items-start justify-between gap-3 px-5">
                <div>
                  <Stars rating={r.rating} />
                  <p className="mt-1.5 text-sm font-semibold">{r.customerName}</p>
                  <Link href={`/product/${r.slug}`} target="_blank" className="text-xs text-muted-foreground hover:underline">
                    {r.slug}
                  </Link>
                </div>
                <div className="text-right">
                  <StatusBadge value={r.status} />
                  <p className="mt-1 text-xs text-muted-foreground">{date(r.createdAt)}</p>
                </div>
              </div>
              <p className="px-5 text-sm whitespace-pre-wrap">{r.comment}</p>
              <div className="flex gap-2 px-5">
                {r.status !== "approved" && (
                  <Button size="sm" disabled={busy === r._id} onClick={() => moderate(r, "approved")}>
                    <Check /> Publish
                  </Button>
                )}
                {r.status !== "rejected" && (
                  <Button size="sm" variant="outline" disabled={busy === r._id} onClick={() => moderate(r, "rejected")}>
                    <X /> Reject
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {list.data && list.data.pages > 1 && (
        <Card className="mt-4 py-0">
          <Pagination page={list.page} pages={list.data.pages} total={list.data.total} onPage={list.setPage} label="reviews" />
        </Card>
      )}
    </>
  );
}

/* ---------------- Subscribers ---------------- */
export function SubscribersPage({ description }: { description: string }) {
  const list = useListPage<Subscriber>("subscribers");
  return (
    <>
      <PageHeader
        eyebrow="Engagement"
        title="Subscribers"
        description={description}
        actions={
          <Button
            variant="outline"
            onClick={async () => {
              try {
                toast.success(`Exported ${await exportCsv("subscribers", `q=${encodeURIComponent(list.query)}`)} subscribers`);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <Download /> Export CSV
          </Button>
        }
      />
      <Card className="gap-0 py-0">
        <div className="border-b p-3">
          <SearchInput value={list.query} onChange={list.setQuery} placeholder="Search email…" />
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Email</TableHead>
              <TableHead>Subscribed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && !list.data ? (
              <LoadingRows cols={4} />
            ) : (
              list.data?.items.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="pl-5 font-semibold">{s.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{date(s.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge value={s.active ? "active" : "unsubscribed"} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await send(`admin/subscribers/${s._id}`, { active: !s.active }, "PATCH");
                          toast.success(s.active ? "Unsubscribed" : "Reactivated");
                          list.reload();
                        } catch (err) {
                          toast.error((err as Error).message);
                        }
                      }}
                    >
                      {s.active ? "Unsubscribe" : "Reactivate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {list.data && !list.data.items.length && <EmptyState icon={Mail} title="No subscribers yet" description="Newsletter sign-ups from the storefront footer appear here." />}
        {list.data && <Pagination page={list.page} pages={list.data.pages} total={list.data.total} onPage={list.setPage} label="subscribers" />}
      </Card>
    </>
  );
}

/* ---------------- Stock ledger ---------------- */
type Movement = { _id: string; slug: string; delta: number; balance: number; reason: string; createdAt: string };

function AdjustDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [picking, setPicking] = useState(true);
  const [product, setProduct] = useState<{ slug: string; name: string; stock: number; image: ImageAsset | null } | null>(null);
  const [delta, setDelta] = useState(0);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <ProductSearchDialog
        open={picking}
        onOpenChange={(o) => {
          setPicking(o);
          if (!o && !product) onClose();
        }}
        title="Choose a product to adjust"
        onPick={([p]) => p && setProduct({ slug: p.slug, name: p.name, stock: p.stock, image: p.image })}
      />
      {product && (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
          <DialogContent>
            <form
              className="grid gap-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await send("admin/operations/stock", { slug: product.slug, delta, reason: new FormData(e.currentTarget).get("reason") });
                  toast.success("Adjustment recorded");
                  refreshBadges();
                  onDone();
                } catch (err) {
                  toast.error((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>Adjust inventory</DialogTitle>
                <DialogDescription>Positive for receipts and inspected returns, negative for damage or corrections.</DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <Thumb image={product.image} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.stock} on hand → <strong className="text-foreground">{product.stock + delta}</strong>
                  </p>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPicking(true)}>
                  Change
                </Button>
              </div>
              <Field label="Quantity change">
                <Input type="number" required min={-100000} max={100000} step={1} value={delta || ""} onChange={(e) => setDelta(Math.trunc(Number(e.target.value)) || 0)} placeholder="e.g. 25 or -2" />
              </Field>
              <Field label="Reason / supplier reference">
                <Textarea name="reason" required minLength={5} maxLength={300} rows={2} />
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button disabled={busy || !delta || product.stock + delta < 0}>{busy && <Spinner />} Record adjustment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function StockLedgerPage({ description }: { description: string }) {
  const list = useListPage<Movement>("operations/stock");
  const [adjusting, setAdjusting] = useState(false);
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Stock movements"
        description={description}
        actions={
          <Button variant="brand" onClick={() => setAdjusting(true)}>
            <Plus /> Adjust inventory
          </Button>
        }
      />
      <Card className="gap-0 py-0">
        <div className="border-b p-3">
          <SearchInput value={list.query} onChange={list.setQuery} placeholder="Search product slug or reason…" />
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Product</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="pr-5 text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && !list.data ? (
              <LoadingRows cols={5} />
            ) : (
              list.data?.items.map((m) => (
                <TableRow key={m._id}>
                  <TableCell className="pl-5 font-mono text-xs">{m.slug}</TableCell>
                  <TableCell className="max-w-sm text-sm">{m.reason}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{dateTime(m.createdAt)}</TableCell>
                  <TableCell className={cn("text-right font-bold tabular-nums", m.delta > 0 ? "text-success" : "text-destructive")}>
                    {m.delta > 0 ? "+" : ""}
                    {m.delta}
                  </TableCell>
                  <TableCell className="pr-5 text-right tabular-nums">{m.balance}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {list.data && !list.data.items.length && <EmptyState icon={ArrowLeftRight} title="No inventory movements yet" description="Stock receipts, corrections, and order reservations are recorded here." />}
        {list.data && <Pagination page={list.page} pages={list.data.pages} total={list.data.total} onPage={list.setPage} label="movements" />}
      </Card>
      {adjusting && (
        <AdjustDialog
          onClose={() => setAdjusting(false)}
          onDone={() => {
            setAdjusting(false);
            list.reload();
          }}
        />
      )}
    </>
  );
}
