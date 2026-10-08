"use client";
import * as React from "react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, MessageSquareText, Send, XCircle } from "lucide-react";
import { dateTime, send, useApi } from "../lib/api";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { NativeSelect, Textarea } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { EmptyState, ErrorNote, Field, LoadingRows, PageHeader, Pagination, Spinner, useConfirm } from "../shared/kit";

interface SmsLog {
  _id: string;
  to: string;
  message: string;
  ok: boolean;
  response: string;
  kind: string;
  orderNo?: string;
  createdAt: string;
}
interface SmsData {
  items: SmsLog[];
  total: number;
  page: number;
  pages: number;
  sent: number;
  failed: number;
  provider: string;
}
const PROVIDER: Record<string, string> = { bulksmsbd: "BulkSMSBD", smsnetbd: "sms.net.bd", custom: "Custom gateway" };

export function SmsPage({ description }: { description: string }) {
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi<SmsData>(`admin/sms?page=${page}`);
  const [audience, setAudience] = useState("");
  const [phones, setPhones] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const list = phones
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const segments = Math.max(1, Math.ceil(message.length / (/[^\x00-\x7F]/.test(message) ? 70 : 160)));
  return (
    <>
      <PageHeader eyebrow="Marketing" title="SMS panel" description={description} />
      {data && !data.provider && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <span>No SMS gateway is connected yet. Messages will be logged as not sent.</span>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/settings">Connect a gateway</Link>
          </Button>
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Compose</CardTitle>
            <CardDescription>{data?.provider ? `Sending through ${PROVIDER[data.provider] ?? data.provider}` : "Connect a gateway in Settings → SMS"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Send to">
              <NativeSelect value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="">Phone numbers I enter</option>
                <option value="customers">All registered customers</option>
                <option value="buyers">Customers with delivered orders</option>
              </NativeSelect>
            </Field>
            {!audience && (
              <Field label="Phone numbers" hint={`${list.length} number${list.length === 1 ? "" : "s"} — separate with commas, spaces, or new lines.`}>
                <Textarea rows={3} value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="017XXXXXXXX, 018XXXXXXXX" />
              </Field>
            )}
            <Field label="Message" hint={`${message.length}/480 characters · ${segments} SMS per recipient${/[^\x00-\x7F]/.test(message) ? " (Bangla uses 70 characters per SMS)" : ""}`}>
              <Textarea rows={5} maxLength={480} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Eid offer! Get 10% off with code EID10 — dazzle.com.bd" />
            </Field>
            <Button
              variant="brand"
              disabled={busy || !message.trim() || (!audience && !list.length)}
              onClick={async () => {
                if (audience && !(await confirm({ title: "Send to everyone in this audience?", description: "Gateway charges apply per message.", confirmLabel: "Send campaign" }))) return;
                setBusy(true);
                try {
                  const r = await send<{ sent: number; total: number; error: string }>("admin/sms/send", { message, phones: list, audience });
                  if (r.sent) toast.success(`Sent ${r.sent} of ${r.total}`);
                  else toast.error("Nothing was sent", { description: r.error });
                  setPhones("");
                  setPage(1);
                  reload();
                } catch (err) {
                  toast.error((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <Spinner /> : <Send />} Send SMS
            </Button>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
            <p className="font-bold">Delivery log</p>
            {data && (
              <>
                <Badge variant="success">
                  <CheckCircle2 /> {data.sent} sent
                </Badge>
                <Badge variant="destructive">
                  <XCircle /> {data.failed} failed
                </Badge>
              </>
            )}
          </div>
          {error && (
            <div className="p-3">
              <ErrorNote message={error} onRetry={reload} />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">To</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data ? (
                <LoadingRows cols={4} />
              ) : (
                data?.items.map((l) => (
                  <TableRow key={l._id}>
                    <TableCell className="pl-5 font-mono text-xs">
                      {l.to}
                      <span className="block font-sans text-[11px] text-muted-foreground">{dateTime(l.createdAt)}</span>
                    </TableCell>
                    <TableCell className="max-w-sm text-sm">
                      <span className="line-clamp-2">{l.message}</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.kind}
                      {l.orderNo && <span className="block text-muted-foreground">{l.orderNo}</span>}
                    </TableCell>
                    <TableCell className="pr-5">
                      <Badge variant={l.ok ? "success" : "destructive"} title={l.response}>
                        {l.ok ? "Sent" : "Failed"}
                      </Badge>
                      {!l.ok && <span className="mt-0.5 block max-w-40 truncate text-[11px] text-muted-foreground">{l.response}</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {data && !data.items.length && <EmptyState icon={MessageSquareText} title="No messages yet" description="Order notifications and campaigns appear here." />}
          {data && <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} label="messages" />}
        </Card>
      </div>
    </>
  );
}
