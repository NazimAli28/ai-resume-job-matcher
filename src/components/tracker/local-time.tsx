"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** An exact moment in the reader's own time zone. The server has no zone to use, so it renders Pakistan time first. */
export function LocalTime({ iso }: { iso: string }) {
  const zone = useSyncExternalStore(subscribe, () => undefined as string | undefined, () => "Asia/Karachi");
  const text = new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: zone });
  return <time dateTime={iso}>{text}</time>;
}
