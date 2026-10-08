"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

interface CarouselProps {
  children: React.ReactNode;
  /** width of each slide, e.g. "w-[calc((100%-8px)/2)] lg:w-[calc((100%-40px)/5)]" */
  slideClassName: string;
  /** gap between slides (Tailwind gap utility) */
  gapClassName?: string;
  autoplayMs?: number;
  bullets?: boolean;
  /** "slides": one bullet per slide (Swiper default); "pages": one per scroll position */
  bulletMode?: "slides" | "pages";
  className?: string;
  trackClassName?: string;
  bulletsClassName?: string;
  ariaLabel?: string;
}

/**
 * Lightweight replacement for the Swiper sliders used by the reference: native horizontal
 * scrolling with snap points, mouse-drag, optional autoplay and gold pill pagination.
 */
export function Carousel({
  children,
  slideClassName,
  gapClassName = "gap-2",
  autoplayMs,
  bullets = true,
  bulletMode = "slides",
  className,
  trackClassName,
  bulletsClassName = "mt-4",
  ariaLabel,
}: CarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const slides = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [maxIndex, setMaxIndex] = useState(slides.length - 1);
  const paused = useRef(false);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const step = useCallback(() => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 1;
    const second = first.nextElementSibling as HTMLElement | null;
    return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
  }, []);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const s = step();
    const last = Math.max(0, Math.round((el.scrollWidth - el.clientWidth) / s));
    setMaxIndex(last);
    setIndex(Math.min(last, Math.round(el.scrollLeft / s)));
  }, [step]);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, slides.length]);

  const goTo = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el) return;
      el.scrollTo({ left: i * step(), behavior: "smooth" });
    },
    [step],
  );

  useEffect(() => {
    if (!autoplayMs || maxIndex === 0) return;
    const t = setInterval(() => {
      if (paused.current || document.hidden) return;
      const el = track.current;
      if (!el) return;
      const current = Math.round(el.scrollLeft / step());
      goTo(current >= maxIndex ? 0 : current + 1);
    }, autoplayMs);
    return () => clearInterval(t);
  }, [autoplayMs, maxIndex, goTo, step]);

  const bulletCount = bulletMode === "pages" ? maxIndex + 1 : slides.length;
  const activeBullet = bulletMode === "pages" ? index : index >= maxIndex && maxIndex > 0 ? Math.min(slides.length - 1, index) : index;

  return (
    <div
      className={cn("relative", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      <div
        ref={track}
        onScroll={() => {
          const el = track.current;
          if (el) setIndex(Math.round(el.scrollLeft / step()));
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !track.current) return;
          drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          const el = track.current;
          if (!d || !el) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 5) {
            d.moved = true;
            el.dataset.dragging = "1";
            el.style.scrollSnapType = "none";
            el.scrollLeft = d.left - dx;
          }
        }}
        onPointerUp={() => {
          const d = drag.current;
          const el = track.current;
          drag.current = null;
          if (!d || !el || !d.moved) return;
          setTimeout(() => delete el.dataset.dragging, 0);
          el.style.scrollSnapType = "";
          goTo(Math.round(el.scrollLeft / step()));
        }}
        onPointerLeave={() => {
          const el = track.current;
          if (drag.current && el) {
            drag.current = null;
            el.style.scrollSnapType = "";
            goTo(Math.round(el.scrollLeft / step()));
          }
        }}
        onClickCapture={(e) => {
          // swallow the click that ends a drag
          if (track.current?.dataset.dragging === "1") e.preventDefault();
        }}
        className={cn("flex overflow-x-auto snap-x snap-mandatory no-scrollbar overscroll-x-contain", gapClassName, trackClassName)}
      >
        {slides.map((child, i) => (
          <div key={i} className={cn("shrink-0 snap-start", slideClassName)} aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>
            {child}
          </div>
        ))}
      </div>
      {bullets && bulletCount > 1 && maxIndex > 0 && (
        <div className={cn("dz-bullets", bulletsClassName)}>
          {Array.from({ length: bulletCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className="dz-bullet"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === activeBullet ? "true" : undefined}
              onClick={() => goTo(Math.min(i, maxIndex))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
