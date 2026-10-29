"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Live media query, hydration-safe (false on the server and during hydration). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True when the visitor asked for reduced motion. Use for structural choices (static vs animated). */
export function useReduced(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** Pointer-driven effects (tilt, parallax) only on a fine pointer that can hover, and never with reduced motion. */
export function useCanTilt(): boolean {
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduce = useReduced();
  return fine && !reduce;
}

function subscribeScroll(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}

/** True once the page has scrolled past `threshold` pixels. */
export function useScrolledPast(threshold: number): boolean {
  return useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > threshold,
    () => false,
  );
}

/** Scroll to an in-page anchor, smoothly unless reduced motion is on. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}
