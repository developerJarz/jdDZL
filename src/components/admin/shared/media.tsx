"use client";
import * as React from "react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ImagePlus, Images, Link2, Star, Trash2, UploadCloud } from "lucide-react";
import type { ImageAsset } from "@/types";
import { cn } from "../lib/utils";
import { api, uploadImage, useApi } from "../lib/api";
import type { MediaItem, PageResult } from "../lib/types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Skeleton } from "../ui/controls";
import { DragHandle, SortableList } from "./sortable";
import { Spinner } from "./kit";

/** Uploads files sequentially, reporting failures individually so one bad file doesn't stop the rest. */
export async function uploadFiles(files: File[], onProgress?: (done: number) => void) {
  const uploaded: ImageAsset[] = [];
  for (const [i, file] of files.entries()) {
    try {
      uploaded.push(await uploadImage(file));
    } catch (err) {
      toast.error((err as Error).message);
    }
    onProgress?.(i + 1);
  }
  return uploaded;
}

function useDropzone(onFiles: (files: File[]) => void, disabled?: boolean) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e: React.DragEvent) => {
        if (disabled || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => {
        if (disabled || !e.dataTransfer.files.length) return;
        e.preventDefault();
        setOver(false);
        onFiles([...e.dataTransfer.files]);
      },
    },
  };
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  multiple = false,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  multiple?: boolean;
  onSelect: (images: ImageAsset[]) => void;
}) {
  const [page, setPage] = useState(1);
  const { data, loading, reload } = useApi<PageResult<MediaItem>>(open ? `admin/media?page=${page}` : null);
  const [picked, setPicked] = useState<MediaItem[]>([]);
  const [path, setPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toggle = (item: MediaItem) =>
    setPicked((list) =>
      list.some((p) => p._id === item._id)
        ? list.filter((p) => p._id !== item._id)
        : multiple
          ? [...list, item]
          : [item],
    );
  const finish = (images: ImageAsset[]) => {
    onSelect(images);
    setPicked([]);
    setPath("");
    onOpenChange(false);
  };
  const upload = async (files: File[]) => {
    setUploading(true);
    const images = await uploadFiles(files);
    setUploading(false);
    if (images.length) {
      toast.success(`${images.length} image${images.length > 1 ? "s" : ""} uploaded`);
      if (!multiple) finish(images.slice(0, 1));
      else {
        setPage(1);
        reload();
      }
    }
  };
  const drop = useDropzone(upload, uploading);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>Choose a previously uploaded image, upload new files, or use a storefront image path.</DialogDescription>
        </DialogHeader>
        <div
          {...drop.props}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition",
            drop.over ? "border-brand bg-brand-soft/60" : "border-input",
          )}
        >
          <UploadCloud className="size-6 text-brand" />
          <p className="text-sm">
            Drop images here or{" "}
            <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline dark:text-brand" onClick={() => input.current?.click()}>
              browse
            </button>
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP · up to 5 MB each</p>
          {uploading && (
            <p className="flex items-center gap-2 text-xs font-medium">
              <Spinner className="size-3.5" /> Uploading…
            </p>
          )}
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
        </div>
        <div className="admin-scroll grid max-h-[46vh] grid-cols-3 gap-2.5 overflow-y-auto sm:grid-cols-5">
          {loading && !data
            ? Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)
            : data?.items.map((item) => {
                const selected = picked.some((p) => p._id === item._id);
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => toggle(item)}
                    title={item.name}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-xl border-2 bg-white transition",
                      selected ? "border-brand ring-4 ring-brand/20" : "border-transparent hover:border-input",
                    )}
                  >
                    <Image src={item.src} alt={item.name || ""} fill sizes="160px" className="object-contain p-1.5" />
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-white">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
          {data && !data.items.length && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No uploaded images yet.</p>
          )}
        </div>
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Newer
            </Button>
            Page {page} of {data.pages}
            <Button size="sm" variant="outline" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
              Older
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/images/products/example.webp"
              className="pl-9"
              aria-label="Storefront image path"
            />
          </div>
          <Button
            variant="outline"
            disabled={!/^\/images\/[^.][^\s]*$/.test(path.trim()) || path.includes("..")}
            onClick={() => finish([{ src: path.trim(), width: null, height: null }])}
          >
            Use path
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!picked.length}
            onClick={() => finish(picked.map((p) => ({ src: p.src, width: p.width ?? null, height: p.height ?? null })))}
          >
            {multiple && picked.length > 1 ? `Add ${picked.length} images` : "Use image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Single image with preview, upload, library and remove. */
export function ImageField({
  value,
  onChange,
  wide = false,
  className,
}: {
  value: ImageAsset | null;
  onChange: (image: ImageAsset | null) => void;
  wide?: boolean;
  className?: string;
}) {
  const [library, setLibrary] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const upload = async (files: File[]) => {
    if (!files[0]) return;
    setBusy(true);
    const [image] = await uploadFiles(files.slice(0, 1));
    setBusy(false);
    if (image) onChange(image);
  };
  const drop = useDropzone(upload, busy);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        {...drop.props}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 transition",
          wide ? "h-20 w-36" : "size-20",
          drop.over ? "border-brand bg-brand-soft" : value ? "border-transparent bg-white" : "border-input",
        )}
      >
        {busy ? (
          <Spinner />
        ) : value ? (
          <Image src={value.src} alt="" fill sizes="160px" className={wide ? "object-cover" : "object-contain p-1.5"} />
        ) : (
          <ImagePlus className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          <UploadCloud /> Upload
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setLibrary(true)}>
          <Images /> Library
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => onChange(null)}>
            <Trash2 /> Remove
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          upload([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <MediaLibraryDialog open={library} onOpenChange={setLibrary} onSelect={(images) => onChange(images[0] ?? null)} />
    </div>
  );
}

/** Product gallery: multi-upload with drag-and-drop, reorder, cover selection. */
export function GalleryField({
  value,
  onChange,
  max = 12,
}: {
  value: ImageAsset[];
  onChange: (images: ImageAsset[]) => void;
  max?: number;
}) {
  const [library, setLibrary] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const room = max - value.length;
  const add = (images: ImageAsset[]) => {
    const fresh = images.filter((img) => !value.some((v) => v.src === img.src));
    onChange([...value, ...fresh].slice(0, max));
  };
  const upload = async (files: File[]) => {
    const batch = files.slice(0, room);
    if (files.length > room) toast.warning(`Only ${max} images per product — ${files.length - room} skipped.`);
    if (!batch.length) return;
    setProgress({ done: 0, total: batch.length });
    const images = await uploadFiles(batch, (done) => setProgress({ done, total: batch.length }));
    setProgress(null);
    add(images);
  };
  const drop = useDropzone(upload, Boolean(progress) || room <= 0);
  return (
    <div className="grid gap-3">
      {value.length > 0 && (
        <SortableList
          items={value}
          getId={(img) => img.src}
          onChange={onChange}
          grid
          className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5"
        >
          {(img, i, handle) => (
            <div
              className={cn(
                "group relative aspect-square overflow-hidden rounded-xl border bg-white",
                i === 0 && "col-span-2 row-span-2 border-brand/50 ring-2 ring-brand/15",
              )}
            >
              <Image src={img.src} alt="" fill sizes={i === 0 ? "320px" : "160px"} className="object-contain p-2" />
              {i === 0 && (
                <span className="absolute top-2 left-2 rounded-full bg-[#1c1814]/85 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#f3dcc0] uppercase">
                  Cover
                </span>
              )}
              <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <DragHandle {...handle} className="bg-white/90 shadow-sm" />
                <div className="flex gap-1">
                  {i > 0 && (
                    <button
                      type="button"
                      aria-label="Make cover image"
                      title="Make cover image"
                      onClick={() => onChange([img, ...value.filter((_, j) => j !== i)])}
                      className="flex size-7 items-center justify-center rounded-md bg-white/90 text-[#6d3f0e] shadow-sm hover:bg-white"
                    >
                      <Star className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    className="flex size-7 items-center justify-center rounded-md bg-white/90 text-destructive shadow-sm hover:bg-white"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </SortableList>
      )}
      {room > 0 && (
        <div
          {...drop.props}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition",
            drop.over ? "border-brand bg-brand-soft/60" : "border-input bg-muted/30 hover:bg-muted/50",
          )}
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-primary dark:text-brand">
            {progress ? <Spinner /> : <UploadCloud className="size-5" />}
          </div>
          {progress ? (
            <p className="text-sm font-medium">
              Uploading {progress.done} of {progress.total}…
            </p>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-semibold">Drag images here</span> or use the buttons below
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPEG, WebP · up to 5 MB · {room} of {max} slots left · first image is the cover
              </p>
            </>
          )}
          <div className="mt-1 flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={Boolean(progress)} onClick={() => input.current?.click()}>
              <UploadCloud /> Upload files
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setLibrary(true)}>
              <Images /> Media library
            </Button>
          </div>
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
        </div>
      )}
      <MediaLibraryDialog open={library} onOpenChange={setLibrary} multiple onSelect={add} />
    </div>
  );
}

export async function deleteMedia(id: string) {
  await api(`admin/media/${id}`, { method: "DELETE" });
}
