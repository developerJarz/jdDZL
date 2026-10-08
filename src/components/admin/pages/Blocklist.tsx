"use client";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Ban, Search, ShieldAlert, Trash2 } from "lucide-react";
import { api, date, send } from "../lib/api";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input, NativeSelect } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { EmptyState, ErrorNote, Field, LoadingRows, PageHeader, Pagination, SearchInput, Spinner } from "../shared/kit";
import { useListPage } from "../shared/list";
import { FraudPanel } from "./FraudPanel";

interface Block {
  _id: string;
  type: "phone" | "ip";
  value: string;
  reason: string;
  createdAt: string;
}

export function BlocklistPage({ description }: { description: string }) {
  const list = useListPage<Block>("blocklist", {}, 30);
  const [check, setCheck] = useState("");
  const [checking, setChecking] = useState("");
  const [type, setType] = useState<"phone" | "ip">("phone");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeader eyebrow="Administration" title="Fraud & blocking" description={description} />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fraud check</CardTitle>
            <CardDescription>See how often a number&apos;s past orders were delivered, cancelled, or returned before you confirm a cash-on-delivery order.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setChecking(check.trim());
              }}
            >
              <Input value={check} onChange={(e) => setCheck(e.target.value)} placeholder="01XXXXXXXXX" type="tel" aria-label="Phone number to check" />
              <Button variant="outline" disabled={check.replace(/\D/g, "").length < 11}>
                <Search /> Check
              </Button>
            </form>
            {checking && <FraudPanel key={checking} phone={checking} />}
            <p className="text-xs text-muted-foreground">Based on this store&apos;s own order history. Courier-network fraud lookups need a separate provider account.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Block a number or IP</CardTitle>
            <CardDescription>Blocked customers can&apos;t place orders at checkout or on landing pages.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await send("admin/blocklist", { type, value, reason });
                  toast.success(`${value} blocked`);
                  setValue("");
                  setReason("");
                  list.reload();
                } catch (err) {
                  toast.error((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <NativeSelect aria-label="Type" value={type} onChange={(e) => setType(e.target.value as "phone" | "ip")}>
                  <option value="phone">Phone</option>
                  <option value="ip">IP address</option>
                </NativeSelect>
                <Input required value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "phone" ? "01XXXXXXXXX" : "203.0.113.7"} aria-label="Value" />
              </div>
              <Field label="Reason">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Fake orders, refused delivery…" />
              </Field>
              {type === "ip" && <p className="text-xs text-muted-foreground">IP blocking works when the site runs behind a proxy with TRUST_PROXY=true; otherwise all visitors share one address.</p>}
              <Button variant="destructive" className="w-fit" disabled={busy || !value}>
                {busy ? <Spinner /> : <Ban />} Block
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card className="gap-0 py-0">
        <div className="border-b p-3">
          <SearchInput value={list.query} onChange={list.setQuery} placeholder="Search blocked numbers…" />
        </div>
        {list.error && (
          <div className="p-3">
            <ErrorNote message={list.error} onRetry={list.reload} />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Blocked</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Since</TableHead>
              <TableHead className="pr-5 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && !list.data ? (
              <LoadingRows cols={4} />
            ) : (
              list.data?.items.map((b) => (
                <TableRow key={b._id}>
                  <TableCell className="pl-5">
                    <span className="font-mono text-sm font-semibold">{b.value}</span> <Badge variant="muted">{b.type === "ip" ? "IP" : "Phone"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.reason || "—"}</TableCell>
                  <TableCell className="text-sm">{date(b.createdAt)}</TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await api(`admin/blocklist/${b._id}`, { method: "DELETE" });
                          toast.success(`${b.value} unblocked`);
                          list.reload();
                        } catch (err) {
                          toast.error((err as Error).message);
                        }
                      }}
                    >
                      <Trash2 /> Unblock
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {list.data && !list.data.items.length && <EmptyState icon={ShieldAlert} title="Nothing blocked" description="Block a number from an order or using the form above." />}
        {list.data && <Pagination page={list.page} pages={list.data.pages} total={list.data.total} onPage={list.setPage} label="entries" />}
      </Card>
    </>
  );
}
