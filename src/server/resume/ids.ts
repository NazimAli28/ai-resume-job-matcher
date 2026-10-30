/** Deterministic short ids: same input always yields the same id (FNV-1a, base36, 6 chars). */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function stableId(prefix: "w" | "e" | "b" | "p", key: string): string {
  return `${prefix}_${fnv1a(key).toString(36).padStart(6, "0").slice(-6)}`;
}
