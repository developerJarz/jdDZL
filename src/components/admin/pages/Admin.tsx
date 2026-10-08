"use client";
import * as React from "react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, History, Images, KeyRound, Trash2, UploadCloud } from "lucide-react";
import { api, date, dateTime, send, useApi } from "../lib/api";
import type { Audit, MediaItem, PageResult } from "../lib/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { EmptyState, ErrorNote, Field, LoadingRows, PageHeader, Pagination, SearchInput, Spinner, useConfirm } from "../shared/kit";
import { uploadFiles } from "../shared/media";

/* ---------------- Activity ---------------- */
export function ActivityPage({ description }: { description: string }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi<PageResult<Audit>>(`admin/audit?limit=30&page=${page}&q=${encodeURIComponent(query)}`, 200);
  return (
    <>
      <PageHeader eyebrow="Administration" title="Activity log" description={description} />
      <Card className="gap-0 py-0">
        <div className="border-b p-3">
          <SearchInput
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Search actions or details…"
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
              <TableHead className="pl-5">Action</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Record</TableHead>
              <TableHead className="pr-5">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <LoadingRows cols={4} />
            ) : (
              data?.items.map((a) => {
                const [area, verb] = a.action.split(".");
                return (
                  <TableRow key={a._id}>
                    <TableCell className="pl-5">
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {area}
                        </Badge>
                        <span className="text-sm font-semibold capitalize">{(verb ?? "").replaceAll("-", " ")}</span>
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md text-sm text-muted-foreground">{a.detail}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{a.entityId}</TableCell>
                    <TableCell className="pr-5 text-sm whitespace-nowrap">{dateTime(a.createdAt)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {data && !data.items.length && <EmptyState icon={History} title="No activity yet" />}
        {data && <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} label="events" />}
      </Card>
    </>
  );
}

/* ---------------- Media library ---------------- */
const size = (bytes?: number) => (!bytes ? "" : bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`);

export function MediaPage({ description }: { description: string }) {
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [progress, setProgress] = useState<string>("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { data, error, loading, reload } = useApi<PageResult<MediaItem>>(`admin/media?page=${page}`);
  const upload = async (files: File[]) => {
    if (!files.length) return;
    setProgress(`Uploading 0 of ${files.length}…`);
    const done = await uploadFiles(files, (n) => setProgress(`Uploading ${n} of ${files.length}…`));
    setProgress("");
    if (done.length) toast.success(`${done.length} image${done.length > 1 ? "s" : ""} uploaded`);
    setPage(1);
    reload();
  };
  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Media library"
        description={description}
        actions={
          <Button variant="brand" disabled={Boolean(progress)} onClick={() => input.current?.click()}>
            {progress ? <Spinner /> : <UploadCloud />} Upload images
          </Button>
        }
      />
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          upload([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload([...e.dataTransfer.files]);
        }}
        className={`mb-5 flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${over ? "border-brand bg-brand-soft/60" : "border-input bg-card"}`}
      >
        <UploadCloud className="size-7 text-brand" />
        <p className="text-sm font-semibold">{progress || "Drop images anywhere here to upload"}</p>
        <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP up to 5 MB. Stored in your database, served with long-term caching.</p>
      </div>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : data && !data.items.length ? (
        <Card>
          <EmptyState icon={Images} title="No uploads yet" description="Images uploaded for products, categories, brands, and banners appear here." />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {data?.items.map((m) => (
            <div key={m._id} className="group overflow-hidden rounded-2xl border bg-card">
              <div className="relative aspect-square bg-white">
                <Image src={m.src} alt={m.name ?? ""} fill sizes="200px" className="object-contain p-2" />
                <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label="Copy image URL"
                    className="bg-white/95"
                    onClick={() => navigator.clipboard.writeText(m.src).then(() => toast.success("Image URL copied"))}
                  >
                    <Copy />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label="Delete image"
                    className="bg-white/95 text-destructive"
                    onClick={async () => {
                      if (!(await confirm({ title: "Delete this image?", description: "Images still used by products, categories, brands, or the homepage can't be deleted.", confirmLabel: "Delete", destructive: true })))
                        return;
                      try {
                        await api(`admin/media/${m._id}`, { method: "DELETE" });
                        toast.success("Image deleted");
                        reload();
                      } catch (err) {
                        toast.error((err as Error).message);
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="border-t px-3 py-2">
                <p className="truncate text-xs font-semibold">{m.name || "Image"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[m.width && m.height ? `${m.width}×${m.height}` : "", size(m.size), date(m.createdAt)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {data && data.pages > 1 && (
        <Card className="mt-4 py-0">
          <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} label="images" />
        </Card>
      )}
    </>
  );
}

/* ---------------- Account security ---------------- */
export function PasswordCard() {
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-brand" /> Account security
        </CardTitle>
        <CardDescription>Changing your password signs out every other session.</CardDescription>
      </CardHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          if (f.get("password") !== f.get("confirm")) {
            toast.error("The new passwords do not match.");
            return;
          }
          setBusy(true);
          try {
            await send("auth/password", { currentPassword: f.get("current"), password: f.get("password") });
            form.reset();
            toast.success("Password changed", { description: "Other sessions have been signed out." });
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <CardContent className="grid gap-4">
          <Field label="Current password">
            <Input name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            <Input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
          </Field>
          <Field label="Confirm new password">
            <Input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
          </Field>
        </CardContent>
        <CardFooter className="mt-5">
          <Button disabled={busy}>{busy && <Spinner />} Update password</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
