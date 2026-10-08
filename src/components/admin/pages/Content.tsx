"use client";
import * as React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Bold, ExternalLink, FileText, Heading2, Italic, Link2, List, ListOrdered, MoreHorizontal, Newspaper, Pencil, Plus, Quote, Save, Trash2 } from "lucide-react";
import type { ImageAsset } from "@/types";
import { markdownToHtml } from "@/lib/markdown";
import { cn } from "../lib/utils";
import { api, date, send, slugify } from "../lib/api";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Input, Textarea } from "../ui/input";
import { Switch, Tabs, TabsList, TabsTrigger } from "../ui/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/menu";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/dialog";
import { EmptyState, ErrorNote, Field, LoadingRows, PageHeader, Pagination, SearchInput, Spinner, Thumb, useConfirm } from "../shared/kit";
import { ImageField } from "../shared/media";
import { useListPage } from "../shared/list";

const TOOLS = [
  { label: "Heading", icon: Heading2, kind: "line", prefix: "## " },
  { label: "Bold", icon: Bold, kind: "wrap", before: "**", after: "**", placeholder: "text" },
  { label: "Italic", icon: Italic, kind: "wrap", before: "*", after: "*", placeholder: "text" },
  { label: "Bulleted list", icon: List, kind: "line", prefix: "- " },
  { label: "Numbered list", icon: ListOrdered, kind: "line", prefix: "1. " },
  { label: "Quote", icon: Quote, kind: "line", prefix: "> " },
  { label: "Link", icon: Link2, kind: "wrap", before: "[", after: "](https://)", placeholder: "link text" },
] as const;

/** Markdown textarea with a formatting toolbar and live preview. */
export function MarkdownEditor({ value, onChange, rows = 14 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState("write");
  const wrap = (before: string, after = before, placeholder = "text") => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const picked = value.slice(s, e) || placeholder;
    onChange(value.slice(0, s) + before + picked + after + value.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + picked.length);
    });
  };
  const line = (prefix: string) => {
    const el = ref.current;
    if (!el) return;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    onChange(value.slice(0, start) + prefix + value.slice(start));
    requestAnimationFrame(() => el.focus());
  };
  const apply = (tool: (typeof TOOLS)[number]) => {
    if (tool.kind === "line") line(tool.prefix);
    else wrap(tool.before, tool.after, tool.placeholder);
  };
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between border-b bg-muted/40 px-2 py-1.5">
        <div className={cn("flex gap-0.5", mode !== "write" && "invisible")}>
          {TOOLS.map((t) => (
            <Button key={t.label} type="button" size="icon-sm" variant="ghost" aria-label={t.label} title={t.label} onClick={() => apply(t)}>
              <t.icon />
            </Button>
          ))}
        </div>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="h-8">
            <TabsTrigger value="write" className="text-xs">
              Write
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {mode === "write" ? (
        <Textarea ref={ref} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-none border-0 font-mono text-[13px] shadow-none focus-visible:ring-0" />
      ) : (
        <div
          className="cms-content min-h-64 px-4 py-3 text-sm leading-relaxed [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_p]:my-2"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(value) || "<p><em>Nothing to preview yet.</em></p>" }}
        />
      )}
    </div>
  );
}

/* ---------------- Pages ---------------- */
interface Page {
  _id?: string;
  title: string;
  slug: string;
  content: string;
  active: boolean;
  showInFooter: boolean;
  seo: { title: string; description: string };
  updatedAt?: string;
}
const POLICY_SLUGS = ["privacy-policy", "refund-policy", "terms-conditions", "warranty-policy", "exchange-policy", "delivery-policy", "emi-policy", "cancellation-policy", "faq"];

function PageEditor({ page, onClose, onSaved }: { page: Page | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Page>(page ?? { title: "", slug: "", content: "", active: true, showInFooter: false, seo: { title: "", description: "" } });
  const [touched, setTouched] = useState(Boolean(page));
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{page ? `Edit ${page.title}` : "New page"}</SheetTitle>
          <SheetDescription>Published at /{draft.slug || "…"}. Policy slugs like privacy-policy replace the built-in policy page.</SheetDescription>
        </SheetHeader>
        <SheetBody className="grid content-start gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input required value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value, ...(touched ? {} : { slug: slugify(e.target.value) }) }))} />
            </Field>
            <Field label="URL slug">
              <Input
                list="policy-slugs"
                required
                value={draft.slug}
                onChange={(e) => {
                  setTouched(true);
                  setDraft({ ...draft, slug: e.target.value.toLowerCase() });
                }}
              />
              <datalist id="policy-slugs">
                {POLICY_SLUGS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
          </div>
          <MarkdownEditor value={draft.content} onChange={(content) => setDraft({ ...draft, content })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO title">
              <Input value={draft.seo.title} onChange={(e) => setDraft({ ...draft, seo: { ...draft.seo, title: e.target.value } })} />
            </Field>
            <Field label="SEO description">
              <Input value={draft.seo.description} onChange={(e) => setDraft({ ...draft, seo: { ...draft.seo, description: e.target.value } })} />
            </Field>
          </div>
        </SheetBody>
        <SheetFooter className="items-center justify-between">
          <div className="flex flex-wrap gap-4 text-sm font-semibold">
            <label className="flex items-center gap-2">
              <Switch checked={draft.active} onCheckedChange={(active) => setDraft({ ...draft, active })} /> Published
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={draft.showInFooter} onCheckedChange={(showInFooter) => setDraft({ ...draft, showInFooter })} /> Link in footer
            </label>
          </div>
          <Button
            variant="brand"
            disabled={busy || !draft.title || !draft.slug}
            onClick={async () => {
              setBusy(true);
              try {
                const { _id, updatedAt, ...body } = draft;
                void updatedAt;
                await send(`admin/pages${_id ? `/${_id}` : ""}`, body, _id ? "PATCH" : "POST");
                toast.success("Page saved", { description: `/${draft.slug}` });
                onSaved();
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner /> : <Save />} Save page
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function PagesPage({ description }: { description: string }) {
  const confirm = useConfirm();
  const list = useListPage<Page & { _id: string }>("pages", {}, 100);
  const [editing, setEditing] = useState<Page | "new" | null>(null);
  return (
    <>
      <PageHeader
        eyebrow="Storefront"
        title="Pages"
        description={description}
        actions={
          <Button variant="brand" onClick={() => setEditing("new")}>
            <Plus /> New page
          </Button>
        }
      />
      <Card className="gap-0 py-0">
        <div className="border-b p-3">
          <SearchInput value={list.query} onChange={list.setQuery} placeholder="Search pages…" />
        </div>
        {list.error && (
          <div className="p-3">
            <ErrorNote message={list.error} onRetry={list.reload} />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Page</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && !list.data ? (
              <LoadingRows cols={4} />
            ) : (
              list.data?.items.map((p) => (
                <TableRow key={p._id} className="cursor-pointer" onClick={() => setEditing(p)}>
                  <TableCell className="pl-5">
                    <span className="block font-semibold">{p.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">/{p.slug}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Badge variant={p.active ? "success" : "muted"}>{p.active ? "Published" : "Draft"}</Badge>
                      {p.showInFooter && <Badge variant="secondary">Footer</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.updatedAt ? date(p.updatedAt) : "—"}</TableCell>
                  <TableCell className="pr-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${p.title}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(p)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => window.open(`/${p.slug}`, "_blank")}>
                          <ExternalLink /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          onSelect={async () => {
                            if (!(await confirm({ title: `Delete ${p.title}?`, confirmLabel: "Delete", destructive: true }))) return;
                            try {
                              await api(`admin/pages/${p._id}`, { method: "DELETE" });
                              toast.success("Page deleted");
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
        {list.data && !list.data.items.length && <EmptyState icon={FileText} title="No pages yet" description="Write your About page, policies, FAQ, or anything else." />}
      </Card>
      {editing && (
        <PageEditor
          page={editing === "new" ? null : editing}
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

/* ---------------- Blog ---------------- */
interface Post {
  _id?: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  image: ImageAsset | null;
  content: string;
  contentHtml?: string;
  format?: "html" | "markdown";
  date: string;
  active: boolean;
  seoTitle: string;
}

function PostEditor({ post, onClose, onSaved }: { post: Post | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Post>(
    post ?? { title: "", slug: "", category: "News", excerpt: "", image: null, content: "", date: new Date().toISOString(), active: true, seoTitle: "" },
  );
  const [touched, setTouched] = useState(Boolean(post));
  const [busy, setBusy] = useState(false);
  const imported = post?.format === "html" && !draft.content;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{post ? "Edit post" : "New post"}</SheetTitle>
          <SheetDescription>/blogs/{draft.slug || "…"}</SheetDescription>
        </SheetHeader>
        <SheetBody className="grid content-start gap-5">
          <Field label="Title">
            <Input required className="h-11 text-base font-semibold" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value, ...(touched ? {} : { slug: slugify(e.target.value) }) }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="URL slug">
              <Input
                required
                value={draft.slug}
                onChange={(e) => {
                  setTouched(true);
                  setDraft({ ...draft, slug: e.target.value.toLowerCase() });
                }}
              />
            </Field>
            <Field label="Category">
              <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
            </Field>
            <Field label="Publish date">
              <Input type="date" value={draft.date.slice(0, 10)} onChange={(e) => e.target.value && setDraft({ ...draft, date: new Date(`${e.target.value}T09:00:00+06:00`).toISOString() })} />
            </Field>
          </div>
          <Field label="Cover image">
            <ImageField wide value={draft.image} onChange={(image) => setDraft({ ...draft, image })} />
          </Field>
          <Field label="Excerpt" hint="Shown on the blog list and homepage cards.">
            <Textarea rows={2} maxLength={600} value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
          </Field>
          {imported && (
            <p className="rounded-xl bg-info/10 px-4 py-3 text-sm text-info">
              This imported article keeps its original formatting. Writing a new body below replaces it.
            </p>
          )}
          <MarkdownEditor value={draft.content} onChange={(content) => setDraft({ ...draft, content })} rows={16} />
          <Field label="SEO title">
            <Input value={draft.seoTitle} onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })} placeholder={draft.title} />
          </Field>
        </SheetBody>
        <SheetFooter className="items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <Switch checked={draft.active} onCheckedChange={(active) => setDraft({ ...draft, active })} /> Published
          </label>
          <Button
            variant="brand"
            disabled={busy || !draft.title || !draft.slug}
            onClick={async () => {
              setBusy(true);
              try {
                const { _id, title, slug, category, excerpt, image, content, date: day, active, seoTitle } = draft;
                await send(`admin/posts${_id ? `/${_id}` : ""}`, { title, slug, category, excerpt, image, content, date: new Date(day).toISOString(), active, seoTitle }, _id ? "PATCH" : "POST");
                toast.success("Post saved");
                onSaved();
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner /> : <Save />} Save post
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function BlogPage({ description }: { description: string }) {
  const confirm = useConfirm();
  const list = useListPage<Post & { _id: string }>("posts", {}, 20);
  const [editing, setEditing] = useState<Post | "new" | null>(null);
  return (
    <>
      <PageHeader
        eyebrow="Storefront"
        title="Blog"
        description={description}
        actions={
          <Button variant="brand" onClick={() => setEditing("new")}>
            <Plus /> New post
          </Button>
        }
      />
      <Card className="gap-0 py-0">
        <div className="border-b p-3">
          <SearchInput value={list.query} onChange={list.setQuery} placeholder="Search posts…" />
        </div>
        {list.error && (
          <div className="p-3">
            <ErrorNote message={list.error} onRetry={list.reload} />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Post</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && !list.data ? (
              <LoadingRows cols={5} />
            ) : (
              list.data?.items.map((p) => (
                <TableRow key={p._id} className="cursor-pointer" onClick={() => setEditing(p)}>
                  <TableCell className="max-w-md pl-5">
                    <span className="flex items-center gap-3">
                      <Thumb image={p.image} size={52} className="rounded-md" />
                      <span className="line-clamp-2 font-semibold">{p.title}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{date(p.date)}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? "success" : "muted"}>{p.active ? "Published" : "Draft"}</Badge>
                  </TableCell>
                  <TableCell className="pr-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label="Post actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(p)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => window.open(`/blogs/${p.slug}`, "_blank")}>
                          <ExternalLink /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          onSelect={async () => {
                            if (!(await confirm({ title: "Delete this post?", confirmLabel: "Delete", destructive: true }))) return;
                            try {
                              await api(`admin/posts/${p._id}`, { method: "DELETE" });
                              toast.success("Post deleted");
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
        {list.data && !list.data.items.length && <EmptyState icon={Newspaper} title="No posts yet" />}
        {list.data && <Pagination page={list.page} pages={list.data.pages} total={list.data.total} onPage={list.setPage} label="posts" />}
      </Card>
      {editing && (
        <PostEditor
          post={editing === "new" ? null : editing}
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
