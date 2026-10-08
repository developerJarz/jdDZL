"use client";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  Copy,
  ExternalLink,
  FileText,
  HelpCircle,
  Images,
  LayoutGrid,
  ListChecks,
  MessageSquareQuote,
  MoreHorizontal,
  Pencil,
  Plus,
  Rocket,
  Save,
  ShoppingCart,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";
import type { ImageAsset } from "@/types";
import { cn } from "../lib/utils";
import { api, date, send, slugify, useApi } from "../lib/api";
import type { PageResult } from "../lib/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Input, Textarea } from "../ui/input";
import { Switch } from "../ui/controls";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/menu";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription } from "../ui/dialog";
import { EmptyState, ErrorNote, Field, PageHeader, SearchInput, Spinner, useConfirm } from "../shared/kit";
import { GalleryField, ImageField } from "../shared/media";
import { ProductPicker } from "../shared/pickers";
import { DragHandle, SortableList } from "../shared/sortable";

type Block =
  | { id: string; type: "hero"; heading: string; subheading: string; image: ImageAsset | null; ctaLabel: string }
  | { id: string; type: "text"; heading: string; body: string }
  | { id: string; type: "features"; heading: string; items: { title: string; text: string }[] }
  | { id: string; type: "gallery"; heading: string; images: ImageAsset[] }
  | { id: string; type: "video"; heading: string; url: string }
  | { id: string; type: "testimonials"; heading: string; items: { name: string; text: string }[] }
  | { id: string; type: "faq"; heading: string; items: { q: string; a: string }[] }
  | { id: string; type: "countdown"; heading: string; endsAt: string | null }
  | { id: string; type: "products"; heading: string }
  | { id: string; type: "order"; heading: string; buttonLabel: string; note: string };

interface Landing {
  _id?: string;
  title: string;
  slug: string;
  active: boolean;
  productSlugs: string[];
  accent: string;
  blocks: Block[];
  seo: { title: string; description: string };
  updatedAt?: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const BLOCKS: { type: Block["type"]; label: string; icon: React.ComponentType<{ className?: string }>; make: () => Block }[] = [
  { type: "hero", label: "Hero banner", icon: Sparkles, make: () => ({ id: uid(), type: "hero", heading: "", subheading: "", image: null, ctaLabel: "Order now" }) },
  { type: "features", label: "Feature list", icon: ListChecks, make: () => ({ id: uid(), type: "features", heading: "Why you'll love it", items: [{ title: "", text: "" }] }) },
  { type: "products", label: "Product showcase", icon: LayoutGrid, make: () => ({ id: uid(), type: "products", heading: "Choose your product" }) },
  { type: "gallery", label: "Image gallery", icon: Images, make: () => ({ id: uid(), type: "gallery", heading: "", images: [] }) },
  { type: "video", label: "YouTube video", icon: Video, make: () => ({ id: uid(), type: "video", heading: "", url: "" }) },
  { type: "text", label: "Text", icon: FileText, make: () => ({ id: uid(), type: "text", heading: "", body: "" }) },
  { type: "testimonials", label: "Customer reviews", icon: MessageSquareQuote, make: () => ({ id: uid(), type: "testimonials", heading: "What customers say", items: [{ name: "", text: "" }] }) },
  { type: "faq", label: "FAQ", icon: HelpCircle, make: () => ({ id: uid(), type: "faq", heading: "Frequently asked questions", items: [{ q: "", a: "" }] }) },
  { type: "countdown", label: "Countdown timer", icon: Clock, make: () => ({ id: uid(), type: "countdown", heading: "Offer ends in", endsAt: null }) },
  { type: "order", label: "Order form", icon: ShoppingCart, make: () => ({ id: uid(), type: "order", heading: "Place your order", buttonLabel: "Confirm order", note: "Cash on delivery all over Bangladesh" }) },
];
const blockMeta = (type: Block["type"]) => BLOCKS.find((b) => b.type === type)!;
const template = (): Landing => ({
  title: "",
  slug: "",
  active: true,
  productSlugs: [],
  accent: "#cb843b",
  blocks: ["hero", "features", "products", "testimonials", "faq", "order"].map((t) => blockMeta(t as Block["type"]).make()),
  seo: { title: "", description: "" },
});

function ItemsEditor<T extends Record<string, string>>({ items, fields, onChange, add }: { items: T[]; fields: { key: keyof T; label: string; long?: boolean }[]; onChange: (items: T[]) => void; add: T }) {
  return (
    <div className="grid gap-2">
      {items.map((item, i) => (
        <div key={i} className="grid gap-2 rounded-xl border bg-muted/20 p-2.5">
          <div className="flex items-start gap-2">
            <div className="grid flex-1 gap-2">
              {fields.map((f) =>
                f.long ? (
                  <Textarea key={String(f.key)} rows={2} placeholder={f.label} aria-label={f.label} value={item[f.key]} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
                ) : (
                  <Input key={String(f.key)} placeholder={f.label} aria-label={f.label} value={item[f.key]} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
                ),
              )}
            </div>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" className="w-fit" onClick={() => onChange([...items, { ...add }])}>
        <Plus /> Add
      </Button>
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const head = (
    <Field label="Heading">
      <Input value={block.heading} maxLength={160} onChange={(e) => onChange({ ...block, heading: e.target.value } as Block)} />
    </Field>
  );
  switch (block.type) {
    case "hero":
      return (
        <div className="grid gap-3">
          {head}
          <Field label="Sub-heading">
            <Textarea rows={2} value={block.subheading} maxLength={600} onChange={(e) => onChange({ ...block, subheading: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <Field label="Image (defaults to the first product)">
              <ImageField value={block.image} onChange={(image) => onChange({ ...block, image })} />
            </Field>
            <Field label="Button text">
              <Input value={block.ctaLabel} maxLength={60} onChange={(e) => onChange({ ...block, ctaLabel: e.target.value })} />
            </Field>
          </div>
        </div>
      );
    case "text":
      return (
        <div className="grid gap-3">
          {head}
          <Field label="Text" hint="Markdown: **bold**, *italic*, - lists, [links](/offer), ## headings.">
            <Textarea rows={6} value={block.body} onChange={(e) => onChange({ ...block, body: e.target.value })} />
          </Field>
        </div>
      );
    case "features":
      return (
        <div className="grid gap-3">
          {head}
          <ItemsEditor items={block.items} add={{ title: "", text: "" }} fields={[{ key: "title", label: "Feature" }, { key: "text", label: "Description", long: true }]} onChange={(items) => onChange({ ...block, items })} />
        </div>
      );
    case "gallery":
      return (
        <div className="grid gap-3">
          {head}
          <GalleryField value={block.images} onChange={(images) => onChange({ ...block, images })} />
        </div>
      );
    case "video":
      return (
        <div className="grid gap-3">
          {head}
          <Field label="YouTube link">
            <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://youtu.be/…" />
          </Field>
        </div>
      );
    case "testimonials":
      return (
        <div className="grid gap-3">
          {head}
          <ItemsEditor items={block.items} add={{ name: "", text: "" }} fields={[{ key: "name", label: "Customer name" }, { key: "text", label: "Review", long: true }]} onChange={(items) => onChange({ ...block, items })} />
        </div>
      );
    case "faq":
      return (
        <div className="grid gap-3">
          {head}
          <ItemsEditor items={block.items} add={{ q: "", a: "" }} fields={[{ key: "q", label: "Question" }, { key: "a", label: "Answer", long: true }]} onChange={(items) => onChange({ ...block, items })} />
        </div>
      );
    case "countdown":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {head}
          <Field label="Ends at" hint="Hidden automatically after it ends.">
            <Input
              type="datetime-local"
              value={block.endsAt ? new Date(new Date(block.endsAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
              onChange={(e) => onChange({ ...block, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </Field>
        </div>
      );
    case "products":
      return <div className="grid gap-3">{head}<p className="text-xs text-muted-foreground">Shows the offer products chosen above.</p></div>;
    case "order":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {head}
          <Field label="Button text">
            <Input value={block.buttonLabel} maxLength={60} onChange={(e) => onChange({ ...block, buttonLabel: e.target.value })} />
          </Field>
          <Field label="Note under the heading" className="sm:col-span-2">
            <Input value={block.note} maxLength={400} onChange={(e) => onChange({ ...block, note: e.target.value })} />
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">Guests order with name, phone and address — cash on delivery. Orders arrive in Orders with the “Landing page” channel.</p>
        </div>
      );
  }
}

function LandingEditor({ page, onClose, onSaved }: { page: Landing | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Landing>(() => (page ? structuredClone(page) : template()));
  const [openBlock, setOpenBlock] = useState<string | null>(draft.blocks[0]?.id ?? null);
  const [slugTouched, setSlugTouched] = useState(Boolean(page));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Landing>(k: K, v: Landing[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const updateBlock = (b: Block) => set("blocks", draft.blocks.map((x) => (x.id === b.id ? b : x)));
  const save = async () => {
    if (!draft.productSlugs.length) return toast.error("Choose at least one offer product.");
    setBusy(true);
    try {
      const { _id, updatedAt, ...body } = draft;
      void updatedAt;
      await send(`admin/landing${_id ? `/${_id}` : ""}`, body, _id ? "PATCH" : "POST");
      toast.success(_id ? "Landing page saved" : "Landing page published", { description: `/lp/${draft.slug}` });
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>{page ? `Edit ${page.title}` : "New landing page"}</SheetTitle>
          <SheetDescription>Build a focused campaign page. Drag blocks to reorder.</SheetDescription>
        </SheetHeader>
        <SheetBody className="grid content-start gap-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
            <Field label="Page title">
              <Input
                required
                value={draft.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setDraft((d) => ({ ...d, title, ...(slugTouched ? {} : { slug: slugify(title) }) }));
                }}
                placeholder="Eid smartwatch offer"
              />
            </Field>
            <Field label="URL" hint={`/lp/${draft.slug || "…"}`}>
              <Input
                required
                value={draft.slug}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value.toLowerCase());
                }}
              />
            </Field>
            <Field label="Accent">
              <Input type="color" value={draft.accent} onChange={(e) => set("accent", e.target.value)} className="h-9 p-1" />
            </Field>
          </div>
          <Field label="Offer products" hint="Customers choose from these in the order form (up to 12).">
            <ProductPicker value={draft.productSlugs} onChange={(v) => set("productSlugs", v)} max={12} />
          </Field>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Page blocks</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    <Plus /> Add block
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {BLOCKS.map((b) => (
                    <DropdownMenuItem
                      key={b.type}
                      onSelect={() => {
                        const block = b.make();
                        set("blocks", [...draft.blocks, block]);
                        setOpenBlock(block.id);
                      }}
                    >
                      <b.icon /> {b.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <SortableList items={draft.blocks} getId={(b) => b.id} onChange={(blocks) => set("blocks", blocks)} className="grid gap-2">
              {(block, _i, handle) => {
                const meta = blockMeta(block.type);
                const isOpen = openBlock === block.id;
                return (
                  <div className={cn("rounded-xl border bg-card", isOpen && "border-brand/40")}>
                    <div className="flex items-center gap-2 px-2 py-2">
                      <DragHandle {...handle} />
                      <button type="button" className="flex flex-1 items-center gap-2 text-left" onClick={() => setOpenBlock(isOpen ? null : block.id)}>
                        <meta.icon className="size-4 text-brand" />
                        <span className="text-sm font-semibold">{meta.label}</span>
                        {block.heading && <span className="truncate text-xs text-muted-foreground">· {block.heading}</span>}
                      </button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove block" onClick={() => set("blocks", draft.blocks.filter((b) => b.id !== block.id))}>
                        <Trash2 />
                      </Button>
                    </div>
                    {isOpen && (
                      <div className="border-t p-3">
                        <BlockEditor block={block} onChange={updateBlock} />
                      </div>
                    )}
                  </div>
                );
              }}
            </SortableList>
            {!draft.blocks.some((b) => b.type === "order") && <p className="text-xs text-warning">Add an Order form block so visitors can buy.</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO title">
              <Input value={draft.seo.title} maxLength={180} onChange={(e) => set("seo", { ...draft.seo, title: e.target.value })} placeholder={draft.title} />
            </Field>
            <Field label="SEO description">
              <Input value={draft.seo.description} maxLength={400} onChange={(e) => set("seo", { ...draft.seo, description: e.target.value })} />
            </Field>
          </div>
        </SheetBody>
        <SheetFooter className="items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} /> {draft.active ? "Published" : "Hidden"}
          </label>
          <div className="flex gap-2">
            {page && (
              <Button type="button" variant="outline" onClick={() => window.open(`/lp/${page.slug}`, "_blank")}>
                <ExternalLink /> Preview
              </Button>
            )}
            <Button type="button" variant="brand" disabled={busy || !draft.title || !draft.slug} onClick={save}>
              {busy ? <Spinner /> : <Save />} {page ? "Save" : "Publish"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function LandingPagesPage({ description }: { description: string }) {
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useApi<PageResult<Landing & { _id: string }>>(`admin/landing?limit=100&q=${encodeURIComponent(query)}`, 200);
  const [editing, setEditing] = useState<Landing | "new" | null>(null);
  return (
    <>
      <PageHeader
        eyebrow="Storefront"
        title="Landing pages"
        description={description}
        actions={
          <Button variant="brand" onClick={() => setEditing("new")}>
            <Plus /> New landing page
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search landing pages…" />
      </div>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {data && !data.items.length ? (
        <Card>
          <EmptyState
            icon={Rocket}
            title="No landing pages yet"
            description="Create a campaign page for an ad or social post — it comes with a ready-made order form."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> New landing page
              </Button>
            }
          />
        </Card>
      ) : (
        <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", loading && "opacity-70")}>
          {data?.items.map((p) => (
            <Card key={p._id} className="gap-3 overflow-hidden pt-0">
              <div className="h-2" style={{ background: `linear-gradient(90deg,#6d3f0e,${p.accent})` }} />
              <div className="flex items-start justify-between gap-2 px-5">
                <div className="min-w-0">
                  <p className="truncate font-bold">{p.title}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">/lp/{p.slug}</p>
                </div>
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
                    <DropdownMenuItem onSelect={() => window.open(`/lp/${p.slug}`, "_blank")}>
                      <ExternalLink /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigator.clipboard.writeText(`${location.origin}/lp/${p.slug}`).then(() => toast.success("Link copied"))}>
                      <Copy /> Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setEditing({ ...structuredClone(p), _id: undefined, title: `${p.title} (copy)`, slug: `${p.slug}-copy` })}>
                      <Copy /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      destructive
                      onSelect={async () => {
                        if (!(await confirm({ title: `Delete ${p.title}?`, description: "The link will stop working.", confirmLabel: "Delete", destructive: true }))) return;
                        try {
                          await api(`admin/landing/${p._id}`, { method: "DELETE" });
                          toast.success("Landing page deleted");
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
              </div>
              <div className="flex flex-wrap items-center gap-2 px-5 text-xs text-muted-foreground">
                <Badge variant={p.active ? "success" : "muted"}>{p.active ? "Published" : "Hidden"}</Badge>
                {p.productSlugs.length} product{p.productSlugs.length === 1 ? "" : "s"} · {p.blocks.length} blocks
                {p.updatedAt && <span>· updated {date(p.updatedAt)}</span>}
              </div>
              <div className="px-5">
                <Button size="sm" variant="outline" className="w-full" onClick={() => setEditing(p)}>
                  <Pencil /> Open editor
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <LandingEditor
          key={editing === "new" ? "new" : (editing._id ?? editing.slug)}
          page={editing === "new" ? null : editing}
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
