"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "arw-stored-change";
const memory = new Map<string, string>();

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function read(key: string, fallback: string): string {
  const mem = memory.get(key);
  if (mem !== undefined) return mem;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/** A string preference kept in localStorage (with an in-memory fallback). SSR renders the fallback. */
export function useStoredString(key: string, fallback: string): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const set = useCallback(
    (v: string) => {
      memory.set(key, v);
      try {
        localStorage.setItem(key, v);
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set];
}

export function useStoredBool(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const [raw, setRaw] = useStoredString(key, fallback ? "1" : "0");
  return [raw === "1", (v) => setRaw(v ? "1" : "0")];
}
