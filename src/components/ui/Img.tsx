import Image, { type ImageProps } from "next/image";
import type { ImageAsset } from "@/types";

/** Shown when the snapshot had no copy of an image (reference used the same artwork). */
export const NO_IMAGE: ImageAsset = { src: "/images/site/no-images.png", width: 1200, height: 1263 };

type Props = Omit<ImageProps, "src" | "alt"> & {
  asset: ImageAsset | null | undefined;
  alt: string;
};

/**
 * next/image fed by an ImageAsset from the catalogue. Width/height default to the asset's
 * intrinsic size; pass them to override the rendered box (aspect ratio is kept by CSS).
 */
export function Img({ asset, alt, fill, width, height, ...rest }: Props) {
  const a = asset ?? NO_IMAGE;
  if (a.src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={a.src} alt={alt} className={rest.className} />;
  }
  if (fill) return <Image src={a.src} alt={alt} fill {...rest} />;
  return <Image src={a.src} alt={alt} width={width ?? a.width ?? 600} height={height ?? a.height ?? 600} {...rest} />;
}
