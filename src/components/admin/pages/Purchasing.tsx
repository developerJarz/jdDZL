"use client";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, MoreHorizontal, PackageCheck, Pencil, Plus, Receipt, Trash2, Truck, Wallet } from "lucide-react";
import { api, date, money, send, useApi } from "../lib/api";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Input, NativeSelect, Textarea } from "../ui/input";
import { Switch } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/menu";
import { EmptyState, ErrorNote, Field, LoadingRows, PageHeader, Pagination, SearchInput, Spinner, StatusBadge, useConfirm } from "../shared/kit";
import { DateRangePicker, LineEditor, presetRange, useListPage, type Line, type Range } from "../shared/list";

const METHODS = ["Cash", "bKash", "Nagad", "Bank transfer", "Cheque", "Card"];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

/* ---------------- Suppliers ---------------- */
interface Supplier {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  active: boolean;
  purchased: number;
  due: number;
  purchases: number;
  lastPurchase: string | null;
}

function SupplierDialog({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState({
    name: supplier?.name ?? "",
    contactPerson: supplier?.contactPerson ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    address: supplier?.address ?? "",
    note: supplier?.note ?? "",
    active: supplier?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof draft, v: string | boolean) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await send(`admin/suppliers${supplier ? `/${supplier._id}` : ""}`, draft, supplier ? "PATCH" : "POST");
              toast.success(supplier ? "Supplier saved" : "Supplier added");
              onSaved();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{supplier ? `Edit ${supplier.name}` : "New supplier"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" className="sm:col-span-2">
              <Input required value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Contact person">
              <Input value={draft.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <label className="flex items-center justify-between self-end rounded-xl border px-3.5 py-2.5 text-sm font-semibold">
              Active <Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} />
            </label>
            <Field label="Address" className="sm:col-span-2">
              <Textarea rows={2} value={draft.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea rows={2} value={draft.note} onChange={(e) => set("note", e.target.value)} placeholder="Payment terms, bank details…" />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy}>{busy && <Spinner />} Save supplier</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SuppliersPage({ description }: { description: string }) {
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useApi<{ items: Supplier[] }>(`admin/suppliers?q=${encodeURIComponent(query)}`, 200);
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const totalDue = (data?.items ?? []).reduce((s, x) => s + x.due, 0);
  return (
    <>
      <PageHeader
        eyebrow="Purchasing"
        title="Suppliers"
        description={description}
        actions={
          <Button variant="brand" onClick={() => setEditing("new")}>
            <Plus /> New supplier
          </Button>
        }
      />
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={query} onChange={setQuery} placeholder="Search suppliers…" />
          <p className="text-sm text-muted-foreground">
            Total owed to suppliers: <strong className="text-foreground tabular-nums">{money(totalDue)}</strong>
          </p>
        </div>
        {error && (
          <div className="p-3">
            <ErrorNote message={error} onRetry={reload} />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Purchases</TableHead>
              <TableHead className="text-right">Total bought</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <LoadingRows cols={6} />
            ) : (
              data?.items.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="pl-5">
                    <span className="block font-semibold">{s.name}</span>
                    {!s.active && <Badge variant="muted">Inactive</Badge>}
                    {s.lastPurchase && <span className="text-xs text-muted-foreground">Last purchase {date(s.lastPurchase)}</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.contactPerson && <span className="block">{s.contactPerson}</span>}
                    <span className="text-muted-foreground">{s.phone}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.purchases}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(s.purchased)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{s.due > 0 ? <span className="text-warning">{money(s.due)}</span> : "—"}</TableCell>
                  <TableCell className="pr-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${s.name}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(s)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          onSelect={async () => {
                            if (!(await confirm({ title: `Delete ${s.name}?`, confirmLabel: "Delete", destructive: true }))) return;
                            try {
                              await api(`admin/suppliers/${s._id}`, { method: "DELETE" });
                              toast.success("Supplier deleted");
                              reload();
                            } catch (err) {
                              toast.error((err as Error).message);
                            }
                          }}
                        >
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data && !data.items.length && <EmptyState icon={Truck} title="No suppliers yet" description="Add the companies you buy stock from to track purchases and balances." />}
      </Card>
      {editing && (
        <SupplierDialog
          supplier={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

/* ---------------- Purchases ---------------- */
interface Purchase {
  _id: string;
  supplierId: string | null;
  reference: string;
  date: string;
  status: "ordered" | "received";
  items: { slug: string; name: string; variant: string; qty: number; unitCost: number }[];
  otherCost: number;
  subtotal: number;
  total: number;
  paid: number;
  due: number;
  note: string;
  payments?: { amount: number; method: string; reference: string; at: string }[];
}

function PurchaseForm({ suppliers, onClose, onSaved }: { suppliers: Supplier[]; onClose: () => void; onSaved: () => void }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?._id ?? "");
  const [reference, setReference] = useState("");
  const [day, setDay] = useState(today());
  const [lines, setLines] = useState<Line[]>([]);
  const [otherCost, setOtherCost] = useState(0);
  const [paid, setPaid] = useState(0);
  const [method, setMethod] = useState("Cash");
  const [received, setReceived] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = subtotal + otherCost;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-3xl">
        <form
          className="flex h-full flex-col"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!lines.length) return toast.error("Add at least one product.");
            setBusy(true);
            try {
              await send("admin/purchases", {
                supplierId: supplierId || null,
                reference,
                date: new Date(`${day}T12:00:00+06:00`).toISOString(),
                status: received ? "received" : "ordered",
                items: lines.map((l) => ({ slug: l.slug, variant: l.variant, qty: l.qty, unitCost: l.price })),
                otherCost,
                paid,
                paymentMethod: method,
                note,
              });
              toast.success(received ? "Purchase received — stock and cost prices updated" : "Purchase order saved");
              onSaved();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <SheetHeader>
            <SheetTitle>New purchase</SheetTitle>
            <SheetDescription>Receiving adds the quantities to stock and updates each product&apos;s average cost price.</SheetDescription>
          </SheetHeader>
          <SheetBody className="grid content-start gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Supplier">
                <NativeSelect value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">No supplier</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Invoice / PO number">
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />
              </Field>
              <Field label="Date">
                <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} max={today()} />
              </Field>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Items</p>
              <LineEditor lines={lines} onChange={setLines} priceLabel="Unit cost" showStock pickerTitle="Add products" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Other costs (transport, duty)">
                <Input type="number" min={0} value={otherCost} onChange={(e) => setOtherCost(Math.max(0, Number(e.target.value) || 0))} />
              </Field>
              <Field label="Paid now">
                <Input type="number" min={0} max={total} value={paid} onChange={(e) => setPaid(Math.max(0, Number(e.target.value) || 0))} />
              </Field>
              <Field label="Paid with">
                <NativeSelect value={method} onChange={(e) => setMethod(e.target.value)}>
                  {METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Note">
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <label className="flex items-center justify-between rounded-xl border px-3.5 py-3">
              <span>
                <span className="block text-sm font-semibold">Goods received</span>
                <span className="text-xs text-muted-foreground">Off saves a purchase order to receive later.</span>
              </span>
              <Switch checked={received} onCheckedChange={setReceived} />
            </label>
          </SheetBody>
          <SheetFooter className="items-center justify-between">
            <p className="text-sm">
              Total <strong className="text-lg tabular-nums">{money(total)}</strong> · due {money(Math.max(0, total - paid))}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="brand" disabled={busy}>
                {busy ? <Spinner /> : <PackageCheck />} {received ? "Save & receive" : "Save order"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function PayDialog({ purchase, onClose, onSaved }: { purchase: Purchase; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(purchase.due);
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay supplier</DialogTitle>
          <DialogDescription>
            {purchase.reference || "Purchase"} · {money(purchase.due)} due
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Amount">
            <Input type="number" min={1} max={purchase.due} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} />
          </Field>
          <Field label="Method">
            <NativeSelect value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Reference">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || amount <= 0}
            onClick={async () => {
              setBusy(true);
              try {
                await send(`admin/purchases/${purchase._id}/pay`, { amount, method, reference });
                toast.success(`${money(amount)} paid`);
                onSaved();
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner /> : <Wallet />} Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PurchasesPage({ description }: { description: string }) {
  const confirm = useConfirm();
  const list = useListPage<Purchase>("purchases");
  const suppliers = useApi<{ items: Supplier[] }>("admin/suppliers");
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<Purchase | null>(null);
  const [viewing, setViewing] = useState<Purchase | null>(null);
  const name = new Map((suppliers.data?.items ?? []).map((s) => [s._id, s.name]));
  const done = () => {
    list.reload();
    suppliers.reload();
  };
  return (
    <>
      <PageHeader
        eyebrow="Purchasing"
        title="Purchases"
        description={description}
        actions={
          <Button variant="brand" onClick={() => setCreating(true)}>
            <Plus /> New purchase
          </Button>
        }
      />
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={list.query} onChange={list.setQuery} placeholder="Reference or product…" />
          <NativeSelect aria-label="Filter status" value={list.status} onChange={(e) => list.setStatus(e.target.value)} className="w-auto">
            <option value="">All purchases</option>
            <option value="ordered">Awaiting delivery</option>
            <option value="received">Received</option>
          </NativeSelect>
        </div>
        {list.error && (
          <div className="p-3">
            <ErrorNote message={list.error} onRetry={list.reload} />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Purchase</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && !list.data ? (
              <LoadingRows cols={7} />
            ) : (
              list.data?.items.map((p) => (
                <TableRow key={p._id} className="cursor-pointer" onClick={() => setViewing(p)}>
                  <TableCell className="pl-5">
                    <span className="block font-semibold">{p.reference || "Purchase"}</span>
                    <span className="text-xs text-muted-foreground">{date(p.date)}</span>
                  </TableCell>
                  <TableCell className="text-sm">{(p.supplierId && name.get(p.supplierId)) || "—"}</TableCell>
                  <TableCell className="text-sm tabular-nums">{p.items.reduce((s, i) => s + i.qty, 0)} units</TableCell>
                  <TableCell>
                    <StatusBadge value={p.status === "received" ? "received" : "pending"} />
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(p.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.due > 0 ? <span className="font-semibold text-warning">{money(p.due)}</span> : "Paid"}</TableCell>
                  <TableCell className="pr-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label="Purchase actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {p.status === "ordered" && (
                          <DropdownMenuItem
                            onSelect={async () => {
                              try {
                                await send(`admin/purchases/${p._id}/receive`, {});
                                toast.success("Received — stock updated");
                                done();
                              } catch (err) {
                                toast.error((err as Error).message);
                              }
                            }}
                          >
                            <PackageCheck /> Mark received
                          </DropdownMenuItem>
                        )}
                        {p.due > 0 && (
                          <DropdownMenuItem onSelect={() => setPaying(p)}>
                            <Wallet /> Record payment
                          </DropdownMenuItem>
                        )}
                        {p.status === "ordered" && (
                          <DropdownMenuItem
                            destructive
                            onSelect={async () => {
                              if (!(await confirm({ title: "Delete this purchase order?", confirmLabel: "Delete", destructive: true }))) return;
                              try {
                                await api(`admin/purchases/${p._id}`, { method: "DELETE" });
                                toast.success("Purchase deleted");
                                done();
                              } catch (err) {
                                toast.error((err as Error).message);
                              }
                            }}
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {list.data && !list.data.items.length && <EmptyState icon={ClipboardList} title="No purchases yet" description="Record stock you buy to keep inventory and cost prices accurate." />}
        {list.data && <Pagination page={list.page} pages={list.data.pages} total={list.data.total} onPage={list.setPage} label="purchases" />}
      </Card>
      {creating && suppliers.data && (
        <PurchaseForm
          suppliers={suppliers.data.items.filter((s) => s.active !== false)}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            done();
          }}
        />
      )}
      {paying && (
        <PayDialog
          purchase={paying}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            done();
          }}
        />
      )}
      {viewing && (
        <Sheet open onOpenChange={(o) => !o && setViewing(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{viewing.reference || "Purchase"}</SheetTitle>
              <SheetDescription>
                {date(viewing.date)} · {(viewing.supplierId && name.get(viewing.supplierId)) || "No supplier"}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="grid content-start gap-4">
              <div className="divide-y rounded-xl border">
                {viewing.items.map((i, n) => (
                  <div key={n} className="flex justify-between gap-3 p-3 text-sm">
                    <span>
                      <span className="block font-semibold">{i.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {i.variant ? `${i.variant} · ` : ""}
                        {i.qty} × {money(i.unitCost)}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums">{money(i.qty * i.unitCost)}</span>
                  </div>
                ))}
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Other costs</dt>
                  <dd>{money(viewing.otherCost)}</dd>
                </div>
                <div className="flex justify-between font-bold">
                  <dt>Total</dt>
                  <dd>{money(viewing.total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd>{money(viewing.paid)}</dd>
                </div>
                <div className="flex justify-between font-semibold text-warning">
                  <dt>Due</dt>
                  <dd>{money(viewing.due)}</dd>
                </div>
              </dl>
              {viewing.payments?.length ? (
                <div>
                  <p className="mb-1 text-sm font-bold">Payments</p>
                  {viewing.payments.map((p, n) => (
                    <p key={n} className="text-sm text-muted-foreground">
                      {date(p.at)} · {p.method} · {money(p.amount)} {p.reference && `· ${p.reference}`}
                    </p>
                  ))}
                </div>
              ) : null}
              {viewing.note && <p className="rounded-lg bg-muted/50 p-3 text-sm">{viewing.note}</p>}
            </SheetBody>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

/* ---------------- Expenses ---------------- */
interface Expense {
  _id: string;
  date: string;
  category: string;
  amount: number;
  method: string;
  reference: string;
  note: string;
}
const CATEGORIES = ["Rent", "Salaries", "Utilities", "Marketing", "Delivery", "Packaging", "Software", "Maintenance", "Other"];

function ExpenseDialog({ expense, onClose, onSaved }: { expense: Expense | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState({
    day: expense ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date(expense.date)) : today(),
    category: expense?.category ?? "Rent",
    amount: expense?.amount ?? 0,
    method: expense?.method ?? "Cash",
    reference: expense?.reference ?? "",
    note: expense?.note ?? "",
  });
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const { day, ...rest } = draft;
              await send(`admin/expenses${expense ? `/${expense._id}` : ""}`, { ...rest, date: new Date(`${day}T12:00:00+06:00`).toISOString() }, expense ? "PATCH" : "POST");
              toast.success(expense ? "Expense saved" : "Expense recorded");
              onSaved();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{expense ? "Edit expense" : "Record an expense"}</DialogTitle>
            <DialogDescription>Expenses are subtracted in the profit & loss report.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={draft.day} max={today()} onChange={(e) => setDraft({ ...draft, day: e.target.value })} />
            </Field>
            <Field label="Category">
              <Input list="expense-categories" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} required />
              <datalist id="expense-categories">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Amount (BDT)">
              <Input type="number" min={1} required value={draft.amount || ""} onChange={(e) => setDraft({ ...draft, amount: Math.max(0, Number(e.target.value) || 0) })} />
            </Field>
            <Field label="Paid with">
              <NativeSelect value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value })}>
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Reference" className="sm:col-span-2">
              <Input value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} placeholder="Bill or voucher number" />
            </Field>
            <Field label="Note" className="sm:col-span-2">
              <Textarea rows={2} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy || draft.amount <= 0}>{busy && <Spinner />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpensesPage({ description }: { description: string }) {
  const confirm = useConfirm();
  const [range, setRange] = useState<Range>(presetRange("month"));
  const [category, setCategory] = useState("");
  const list = useListPage<Expense>("expenses", { from: `${range.from}T00:00:00+06:00`, to: `${range.to}T23:59:59+06:00`, category }, 50);
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const total = (list.data?.items ?? []).reduce((s, e) => s + e.amount, 0);
  return (
    <>
      <PageHeader
        eyebrow="Purchasing"
        title="Expenses"
        description={description}
        actions={
          <Button variant="brand" onClick={() => setEditing("new")}>
            <Plus /> Record expense
          </Button>
        }
      />
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <DateRangePicker value={range} onChange={setRange} />
            <NativeSelect aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing <strong className="text-foreground tabular-nums">{money(total)}</strong>
            {list.data && list.data.pages > 1 ? " on this page" : ""}
          </p>
        </div>
        {list.error && (
          <div className="p-3">
            <ErrorNote message={list.error} onRetry={list.reload} />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && !list.data ? (
              <LoadingRows cols={6} />
            ) : (
              list.data?.items.map((e) => (
                <TableRow key={e._id}>
                  <TableCell className="pl-5 text-sm">{date(e.date)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{e.category}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">{[e.reference, e.note].filter(Boolean).join(" · ") || "—"}</TableCell>
                  <TableCell className="text-sm">{e.method}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(e.amount)}</TableCell>
                  <TableCell className="pr-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label="Expense actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(e)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          onSelect={async () => {
                            if (!(await confirm({ title: "Delete this expense?", confirmLabel: "Delete", destructive: true }))) return;
                            try {
                              await api(`admin/expenses/${e._id}`, { method: "DELETE" });
                              toast.success("Expense deleted");
                              list.reload();
                            } catch (err) {
                              toast.error((err as Error).message);
                            }
                          }}
                        >
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {list.data && !list.data.items.length && <EmptyState icon={Receipt} title="No expenses in this period" />}
        {list.data && <Pagination page={list.page} pages={list.data.pages} total={list.data.total} onPage={list.setPage} label="expenses" />}
      </Card>
      {editing && (
        <ExpenseDialog
          expense={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}

