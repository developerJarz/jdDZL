"use client";

import { useEffect, type RefObject } from "react";

/** Measure only the available space; CSS handles the dropdown's motion and scrolling. */
export function useDropdownHeight(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
) {
  useEffect(() => {
    if (!open || !ref.current) return;
    const element = ref.current;
    let frame = 0;
    const measure = () => {
      const viewport = window.visualViewport;
      const bottom = viewport
        ? viewport.height + viewport.offsetTop
        : window.innerHeight;
      element.style.setProperty(
        "--header-menu-height",
        `${Math.max(0, bottom - element.getBoundingClientRect().bottom - 24)}px`,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [ref, open]);
}
