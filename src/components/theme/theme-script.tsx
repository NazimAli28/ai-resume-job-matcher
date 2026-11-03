import Script from "next/script";
import type { Accent } from "./use-theme";

/** Runs before hydration so the saved theme/accent never flashes. `accent` is from a fixed list, so it's safe to inline. */
export function ThemeScript({ accent }: { accent: Accent }) {
  const script = `(() => {
  try {
    var t = localStorage.getItem("arw-theme") || "system";
    var a = localStorage.getItem("arw-accent") || "${accent}";
    var dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.accent = a;
  } catch (e) {}
})();`;
  return (
    // Browsers hide a nonce from scripts after parsing it, which React would otherwise report as a mismatch.
    // Rendered only from the root layout, where App Router supports beforeInteractive; the rule targets pages/.
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script id="theme-init" strategy="beforeInteractive" suppressHydrationWarning>
      {script}
    </Script>
  );
}
