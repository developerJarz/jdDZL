"use client";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { MessageSquareText, MoreHorizontal, Phone, ShoppingCart, Trash2, Undo2, UserCheck, XCircle } from "lucide-react";
import { api, money, send, timeAgo } from "../lib/api";
import type { ImageAsset } from "@/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Tabs, TabsList, TabsTrigger } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/menu";
import { EmptyState, ErrorNote, LoadingRows, PageHeader, Pagination, SearchInput, StatusBadge, Thumb } from "../shared/kit";
import { useListPage } from "../shared/list";
import { refreshBadges } from "../AdminShell";
import { OrderForm } from "./OrderForm";
import { SmsDialog } from "./Orders";

interface Draft {
  _id: string;
  customer: { name: string; phone: string; email: string; address: string; city: string };
  items: { slug: string; name: string; qty: number; variant: string; price: number; image: ImageAsset | null }[];
  value: number;
  source: string;
  status: "new" | "contacted" | "converted" | "lost";
  orderNo?: string;
  updatedAt: string;
}

export function IncompletePage({ description }: { description: string }) {
  const list = useListPage<Draft>("incomplete", {}, 25);
  const [converting, setConverting] = useState<Draft | null>(null);
  const [sms, setSms] = useState<Draft | null>(null);
  const mark = async (d: Draft, status: Draft["status"]) => {
    try {
      await send(`admin/incomplete/${d._id}`, { status }, "PATCH");
      toast.success(`Marked ${status}`);
      list.reload();
      refreshBadges();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  return (
    <>
      <PageHeader eyebrow="Sales" title="Incomplete orders" description={description} />
      <Tabs value={list.status} onValueChange={list.setStatus} className="mb-4">
        <TabsList>
          <TabsTrigger value="">Open</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="contacted">Contacted</TabsTrigger>
          <TabsTrigger value="converted">Recovered</TabsTrigger>
          <TabsTrigger value="lost">Lost</TabsTrigger>
        </TabsList>
      </Tabs>
      <Card className="gap-0 py-0">
        <div className="border-b p-3">
          <SearchInput value={list.query} onChange={list.setQuery} placeholder="Name, phone or address…" />
        </div>
        {list.error && (
          <div className="p-3">
            <ErrorNote message={list.error} onRetry={list.reload} />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Customer</TableHead>
              <TableHead>Cart</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Last activity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && !list.data ? (
              <LoadingRows cols={7} />
            ) : (
              list.data?.items.map((d) => (
                <TableRow key={d._id}>
                  <TableCell className="pl-5">
                    <span className="block font-semibold">{d.customer.name || "Unknown"}</span>
                    <a href={`tel:${d.customer.phone}`} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline dark:text-brand">
                      <Phone className="size-3" /> {d.customer.phone}
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {d.items.slice(0, 3).map((i) => (
                        <Thumb key={i.slug} image={i.image} size={32} />
                      ))}
                      <span className="text-xs text-muted-foreground">
                        {d.items.reduce((s, i) => s + i.qty, 0)} item{d.items.length === 1 && d.items[0].qty === 1 ? "" : "s"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{d.source.startsWith("landing:") ? `Landing: ${d.source.slice(8)}` : "Checkout"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{timeAgo(d.updatedAt)}</TableCell>
                  <TableCell>
                    <StatusBadge value={d.status === "converted" ? "resolved" : d.status === "lost" ? "cancelled" : d.status === "contacted" ? "in-progress" : "new"} />
                    {d.orderNo && <span className="mt-0.5 block text-[11px] text-muted-foreground">{d.orderNo}</span>}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(d.value)}</TableCell>
                  <TableCell className="pr-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label="Actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {d.status !== "converted" && (
                          <DropdownMenuItem onSelect={() => setConverting(d)}>
                            <ShoppingCart /> Create order
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => setSms(d)}>
                          <MessageSquareText /> Send SMS
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {d.status !== "contacted" && (
                          <DropdownMenuItem onSelect={() => mark(d, "contacted")}>
                            <UserCheck /> Mark contacted
                          </DropdownMenuItem>
                        )}
                        {d.status !== "lost" ? (
                          <DropdownMenuItem onSelect={() => mark(d, "lost")}>
                            <XCircle /> Mark lost
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => mark(d, "new")}>
                            <Undo2 /> Reopen
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          destructive
                          onSelect={async () => {
                            try {
                              await api(`admin/incomplete/${d._id}`, { method: "DELETE" });
                              toast.success("Removed");
                              list.reload();
                              refreshBadges();
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
        {list.data && !list.data.items.length && <EmptyState icon={ShoppingCart} title="No incomplete orders" description="When a customer enters a phone number at checkout or on a landing page and leaves, it appears here." />}
        {list.data && <Pagination page={list.page} pages={list.data.pages} total={list.data.total} onPage={list.setPage} label="drafts" />}
      </Card>
      {converting && (
        <OrderForm
          prefill={{ customer: converting.customer, items: converting.items, incompleteId: converting._id }}
          onClose={() => setConverting(null)}
          onSaved={() => {
            setConverting(null);
            list.reload();
            refreshBadges();
          }}
        />
      )}
      {sms && <SmsDialog phone={sms.customer.phone} onClose={() => setSms(null)} />}
    </>
  );
}
