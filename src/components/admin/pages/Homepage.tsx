"use client";
import * as React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  LayoutTemplate,
  Plus,
  RotateCcw,
  Rocket,
  Trash2,
  X,
} from "lucide-react";
import type { Banner, ImageAsset, MarqueeItem, ProductTab } from "@/types";
import { HOME_SECTIONS, type HomeSection, type HomeSectionId } from "@/lib/home-sections";
import { cn } from "../lib/utils";
import { send, timeAgo, useApi } from "../lib/api";
import type { HomeDoc } from "../lib/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Skeleton, Switch } from "../ui/controls";
import { ErrorNote, Field, PageHeader, Spinner, Thumb, useConfirm } from "../shared/kit";
import { ImageField } from "../shared/media";
import { Combobox, ProductPicker, useTaxonomy } from "../shared/pickers";
import { DragHandle, SortableList } from "../shared/sortable";

type BannerKey = keyof HomeDoc["offerBanners"];
const BANNER_SECTIONS: Partial<Record<HomeSectionId, { key: BannerKey; max: number; hint: string }>> = {
  offersAfterFlash: { key: "afterFlashSale", max: 4, hint: "Shown as a pair below the flash sale. Use 2 or 4 banners." },
  offersAfterClip: { key: "afterClipToCart", max: 4, hint: "Shown as a pair below Clip to Cart, cropped to a fixed height on desktop." },
  offersAfterNew: { key: "afterNewArrivals", max: 4, hint: "Shown as a pair below New Arrivals." },
};
const keyed = <T,>(list: T[]) => list.map((item) => ({ item, key: Math.random().toString(36).slice(2) }));

/* ---------- Small editors ---------- */
function BannerList({ value, onChange, max, hint }: { value: Banner[]; onChange: (v: Banner[]) => void; max: number; hint?: string }) {
  const [rows, setRows] = useState(() => keyed(value));
  useEffect(() => {
    // Keep stable keys while the parent value changes from this editor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows((r) => (r.length === value.length && r.every((x, i) => x.item === value[i]) ? r : value.map((item, i) => ({ item, key: r[i]?.key ?? Math.random().toString(36).slice(2) }))));
  }, [value]);
  const update = (i: number, patch: Partial<Banner>) => onChange(value.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  return (
    <div className="grid gap-3">
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <SortableList items={rows} getId={(r) => r.key} onChange={(next) => onChange(next.map((r) => r.item))} className="grid gap-2.5">
        {({ item: banner }, i, handle) => (
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <DragHandle {...handle} />
              <ImageField wide value={banner.image} onChange={(img) => img && update(i, { image: img })} />
            </div>
            <div className="grid flex-1 gap-2">
              <Input value={banner.href} onChange={(e) => update(i, { href: e.target.value })} placeholder="/offer/eid-sale, https://… or # for no link" aria-label="Banner link" />
              <label className="flex w-fit items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={Boolean(banner.newTab)} onCheckedChange={(newTab) => update(i, { newTab })} /> Open in a new tab
              </label>
            </div>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove banner" className="self-end text-destructive sm:self-center" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
        )}
      </SortableList>
      <BannerAdder disabled={value.length >= max} onAdd={(image) => onChange([...value, { image, href: "/offer", newTab: false }])} />
      <p className="text-xs text-muted-foreground">
        {value.length} / {max} banners
      </p>
    </div>
  );
}

function BannerAdder({ onAdd, disabled }: { onAdd: (image: ImageAsset) => void; disabled?: boolean }) {
  if (disabled) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed p-3">
      <ImageField wide value={null} onChange={(image) => image && onAdd(image)} />
      <p className="text-xs text-muted-foreground">Add a banner: upload or pick an image, then set its link.</p>
    </div>
  );
}

function MarqueeEditor({ value, onChange }: { value: MarqueeItem[]; onChange: (v: MarqueeItem[]) => void }) {
  const rows = useMemo(() => value.map((item, i) => ({ item, key: `${i}` })), [value]);
  const update = (i: number, patch: Partial<MarqueeItem>) => onChange(value.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <div className="grid gap-2">
      <SortableList items={rows} getId={(r) => r.key} onChange={(next) => onChange(next.map((r) => r.item))} className="grid gap-1.5">
        {({ item }, i, handle) => (
          <div className="flex items-center gap-2">
            <DragHandle {...handle} />
            <Input value={item.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="🎉 Free delivery on orders over ৳10,000" aria-label="Announcement text" />
            <Input value={item.href} onChange={(e) => update(i, { href: e.target.value })} placeholder="/offer" aria-label="Announcement link" className="w-44" />
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove announcement" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </div>
        )}
      </SortableList>
      <Button type="button" variant="outline" size="sm" className="w-fit" disabled={value.length >= 30} onClick={() => onChange([...value, { label: "", href: "/" }])}>
        <Plus /> Add announcement
      </Button>
    </div>
  );
}

function OrderedPicker({
  value,
  onChange,
  options,
  placeholder,
  max,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string; image: ImageAsset | null }[];
  placeholder: string;
  max: number;
}) {
  const byValue = new Map(options.map((o) => [o.value, o]));
  return (
    <div className="grid gap-3">
      <Combobox multiple options={options} value={value} onChange={(v) => onChange(v.slice(0, max))} placeholder={placeholder} />
      {value.length > 0 && (
        <SortableList items={value} getId={(v) => v} onChange={onChange} grid className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {(v, i, handle) => (
            <div className="flex items-center gap-2 rounded-xl border bg-card p-1.5">
              <DragHandle {...handle} />
              <Thumb image={byValue.get(v)?.image} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{byValue.get(v)?.label ?? `${v} (missing)`}</span>
              <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded p-1 text-muted-foreground hover:bg-muted">
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </SortableList>
      )}
    </div>
  );
}

function TabsEditor({ value, onChange }: { value: ProductTab[]; onChange: (v: ProductTab[]) => void }) {
  const [active, setActive] = useState(0);
  const current = value[Math.min(active, value.length - 1)];
  const index = Math.min(active, value.length - 1);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((tab, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
              i === index ? "border-brand bg-brand-soft text-primary dark:text-brand" : "hover:bg-muted",
            )}
          >
            {tab.label || "Untitled"} <span className="text-xs font-normal text-muted-foreground">{tab.productSlugs.length}</span>
          </button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={value.length >= 8}
          onClick={() => {
            onChange([...value, { label: "New tab", productSlugs: [] }]);
            setActive(value.length);
          }}
        >
          <Plus /> Tab
        </Button>
      </div>
      {current ? (
        <div className="grid gap-3 rounded-xl border bg-muted/20 p-3.5">
          <div className="flex items-end gap-2">
            <Field label="Tab label" className="flex-1">
              <Input value={current.label} maxLength={40} onChange={(e) => onChange(value.map((t, j) => (j === index ? { ...t, label: e.target.value } : t)))} />
            </Field>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                onChange(value.filter((_, j) => j !== index));
                setActive(0);
              }}
            >
              <Trash2 /> Remove tab
            </Button>
          </div>
          <ProductPicker value={current.productSlugs} onChange={(slugs) => onChange(value.map((t, j) => (j === index ? { ...t, productSlugs: slugs } : t)))} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No tabs — add one to show products in this section.</p>
      )}
    </div>
  );
}

const toLocal = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";

function summary(id: HomeSectionId, home: HomeDoc) {
  const n = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
  switch (id) {
    case "marquee":
      return n(home.marquee.length, "announcement");
    case "hero":
      return n(home.heroSlides.length, "slide");
    case "categories":
      return `${home.categorySlugs.length} ${home.categorySlugs.length === 1 ? "category" : "categories"}`;
    case "flashSale":
      return `${n(home.flashSale.tabs.length, "tab")}${home.flashSale.endsAt ? " · countdown" : ""}`;
    case "brands":
      return n(home.shopByBrandSlugs.length, "brand");
    case "newArrivals":
      return n(home.newArrivals.tabs.length, "tab");
    case "mostPopular":
      return n(home.mostPopularSlugs.length, "product");
    case "hotDeal":
      return n(home.hotDealSlugs.length, "product");
    case "featured":
      return n(home.featuredSlugs.length, "product");
    case "trending":
    case "clipToCart":
    case "blog":
      return "Automatic";
    default: {
      const b = BANNER_SECTIONS[id];
      return b ? n(home.offerBanners[b.key].length, "banner") : "";
    }
  }
}

export function HomepageBuilder({ description }: { description: string }) {
  const confirm = useConfirm();
  const { taxonomy } = useTaxonomy();
  const { data, error, reload, setData } = useApi<{ home: HomeDoc }>("admin/home");
  const [home, setHome] = useState<HomeDoc | null>(null);
  const [selected, setSelected] = useState<HomeSectionId>("hero");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- editable working copy of the published layout
    if (data) setHome(structuredClone(data.home));
  }, [data]);
  const dirty = Boolean(home && data && JSON.stringify(home) !== JSON.stringify(data.home));
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (error && !home) return <ErrorNote message={error} onRetry={reload} />;
  if (!home)
    return (
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]" role="status" aria-label="Loading homepage">
        <Skeleton className="h-[640px] rounded-2xl" />
        <Skeleton className="h-[640px] rounded-2xl" />
      </div>
    );

  const patch = (next: Partial<HomeDoc>) => setHome((h) => (h ? { ...h, ...next } : h));
  const section = home.sections.find((s) => s.id === selected) ?? home.sections[0];
  const meta = HOME_SECTIONS.find((s) => s.id === section.id)!;
  const setSection = (id: HomeSectionId, change: Partial<HomeSection>) =>
    patch({ sections: home.sections.map((s) => (s.id === id ? { ...s, ...change } : s)) });
  const categoryOptions = taxonomy.categories.map((c) => ({ value: c.slug, label: c.name, image: c.image }));
  const brandOptions = taxonomy.brands.map((b) => ({ value: b.slug, label: b.name, image: b.logo }));

  const publish = async () => {
    setBusy(true);
    try {
      const { updatedAt: _u, ...body } = home;
      void _u;
      const result = await send<{ home: HomeDoc }>("admin/home", body, "PATCH");
      setData({ home: result.home });
      toast.success("Homepage published", { description: "Changes are live for every visitor." });
    } catch (err) {
      toast.error("Could not publish", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const editor = () => {
    const banner = BANNER_SECTIONS[section.id];
    if (banner)
      return (
        <BannerList
          key={section.id}
          value={home.offerBanners[banner.key]}
          max={banner.max}
          hint={banner.hint}
          onChange={(v) => patch({ offerBanners: { ...home.offerBanners, [banner.key]: v } })}
        />
      );
    switch (section.id) {
      case "marquee":
        return <MarqueeEditor value={home.marquee} onChange={(marquee) => patch({ marquee })} />;
      case "hero":
        return <BannerList key="hero" value={home.heroSlides} max={12} hint="Full-width slides at the top of the page. Recommended size 1920 × 900 px." onChange={(heroSlides) => patch({ heroSlides })} />;
      case "categories":
        return <OrderedPicker value={home.categorySlugs} onChange={(categorySlugs) => patch({ categorySlugs })} options={categoryOptions} placeholder="Add categories…" max={40} />;
      case "brands":
        return <OrderedPicker value={home.shopByBrandSlugs} onChange={(shopByBrandSlugs) => patch({ shopByBrandSlugs })} options={brandOptions} placeholder="Add brands…" max={30} />;
      case "flashSale":
        return (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Heading" className="sm:col-span-1">
                <Input value={home.flashSale.title} maxLength={80} onChange={(e) => patch({ flashSale: { ...home.flashSale, title: e.target.value } })} />
              </Field>
              <Field label="Countdown ends" hint={home.flashSale.endsAt && new Date(home.flashSale.endsAt) < new Date() ? "This date has passed — the timer is hidden." : "Leave empty for no timer."}>
                <Input
                  type="datetime-local"
                  value={toLocal(home.flashSale.endsAt)}
                  onChange={(e) => patch({ flashSale: { ...home.flashSale, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null } })}
                />
              </Field>
              <Field label="“See all” link">
                <Input value={home.flashSale.href} onChange={(e) => patch({ flashSale: { ...home.flashSale, href: e.target.value } })} />
              </Field>
            </div>
            <TabsEditor value={home.flashSale.tabs} onChange={(tabs) => patch({ flashSale: { ...home.flashSale, tabs } })} />
          </div>
        );
      case "newArrivals":
        return <TabsEditor value={home.newArrivals.tabs} onChange={(tabs) => patch({ newArrivals: { tabs } })} />;
      case "mostPopular":
        return (
          <div className="grid gap-6">
            <ProductPicker value={home.mostPopularSlugs} onChange={(mostPopularSlugs) => patch({ mostPopularSlugs })} />
            <div>
              <p className="mb-2 text-sm font-bold">Banner carousel below the grid</p>
              <BannerList key="mostPopular" value={home.offerBanners.mostPopular} max={10} onChange={(v) => patch({ offerBanners: { ...home.offerBanners, mostPopular: v } })} />
            </div>
          </div>
        );
      case "hotDeal":
        return <ProductPicker value={home.hotDealSlugs} onChange={(hotDealSlugs) => patch({ hotDealSlugs })} />;
      case "featured":
        return (
          <div className="grid gap-6">
            <ProductPicker value={home.featuredSlugs} onChange={(featuredSlugs) => patch({ featuredSlugs })} />
            <div>
              <p className="mb-2 text-sm font-bold">Two tall banners below the products</p>
              <BannerList key="featured" value={home.offerBanners.afterFeatured} max={2} hint="Both banners are needed for this block to show (wide left, narrow right)." onChange={(v) => patch({ offerBanners: { ...home.offerBanners, afterFeatured: v } })} />
            </div>
          </div>
        );
      default:
        return (
          <div className="flex gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-brand" />
            <p className="text-muted-foreground">
              {section.id === "trending"
                ? "Filled automatically from the newest, best-selling, and best-value products."
                : section.id === "clipToCart"
                  ? "Uses the products in the first Flash Sale tab."
                  : "Shows the latest blog posts, trust badges, and SEO copy."}{" "}
              You can rename the heading, move the section, or hide it.
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Storefront"
        title="Homepage builder"
        description={
          <>
            {description}{" "}
            {data?.home.updatedAt && <span className="text-xs">Last published {timeAgo(data.home.updatedAt)}.</span>}
          </>
        }
        actions={
          <>
            <Button
              variant="ghost"
              onClick={async () => {
                if (
                  await confirm({
                    title: "Restore the original homepage?",
                    description: "Every section, banner, and product list goes back to the imported layout. This replaces the published homepage.",
                    confirmLabel: "Restore original",
                    destructive: true,
                  })
                ) {
                  try {
                    const r = await send<{ home: HomeDoc }>("admin/home/reset", {});
                    setData({ home: r.home });
                    toast.success("Original homepage restored");
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                }
              }}
            >
              <RotateCcw /> Restore original
            </Button>
            <Button asChild variant="outline">
              <Link href="/" target="_blank">
                <ExternalLink /> View store
              </Link>
            </Button>
            {dirty && (
              <Button variant="outline" onClick={() => data && setHome(structuredClone(data.home))}>
                Discard
              </Button>
            )}
            <Button variant="brand" disabled={!dirty || busy} onClick={publish}>
              {busy ? <Spinner /> : <Rocket />} Publish{dirty ? " changes" : "ed"}
            </Button>
          </>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="gap-3 lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Page sections {dirty && <Badge variant="warning">Unsaved</Badge>}
            </CardTitle>
            <CardDescription>Drag to reorder, toggle the eye to show or hide.</CardDescription>
          </CardHeader>
          <CardContent className="px-3">
            <SortableList items={home.sections} getId={(s) => s.id} onChange={(sections) => patch({ sections })} className="grid gap-1">
              {(s, _i, handle) => {
                const info = HOME_SECTIONS.find((x) => x.id === s.id)!;
                const active = s.id === section.id;
                return (
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-xl border px-1.5 py-1.5 transition",
                      active ? "border-brand/50 bg-brand-soft/70" : "border-transparent hover:bg-muted/60",
                      !s.visible && "opacity-55",
                    )}
                  >
                    <DragHandle {...handle} />
                    <button type="button" onClick={() => setSelected(s.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-semibold">{s.title || info.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{summary(s.id, home)}</span>
                    </button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={s.visible ? `Hide ${info.label}` : `Show ${info.label}`}
                      onClick={() => setSection(s.id, { visible: !s.visible })}
                    >
                      {s.visible ? <Eye /> : <EyeOff />}
                    </Button>
                    <ChevronRight className={cn("size-4 text-muted-foreground transition", active ? "opacity-100" : "opacity-0")} />
                  </div>
                );
              }}
            </SortableList>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3 border-b">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary dark:text-brand">
              <LayoutTemplate className="size-[18px]" />
            </span>
            <div className="flex-1">
              <CardTitle className="text-base">{meta.label}</CardTitle>
              <CardDescription className="mt-1">Position {home.sections.indexOf(section) + 1} of {home.sections.length}</CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              {section.visible ? "Visible" : "Hidden"}
              <Switch checked={section.visible} onCheckedChange={(visible) => setSection(section.id, { visible })} />
            </label>
          </CardHeader>
          <CardContent className="grid gap-6">
            {meta.title && (
              <Field label="Section heading" hint={`Leave empty to use “${meta.title}”.`}>
                <Input value={section.title} maxLength={80} placeholder={meta.title} onChange={(e) => setSection(section.id, { title: e.target.value })} />
              </Field>
            )}
            {editor()}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
