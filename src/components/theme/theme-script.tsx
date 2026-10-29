import Script from "next/script";
import { DEFAULT_ACCENT } from "@/config/brand";

// Runs before hydration so the saved theme/accent never flashes.
const script = `(() => {
  try {
    var t = localStorage.getItem("arw-theme") || "system";
    var a = localStorage.getItem("arw-accent") || "${DEFAULT_ACCENT}";
    var dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.accent = a;
  } catch (e) {}
})();`;

export function ThemeScript() {
  return (
    // Rendered only from the root layout, where App Router supports beforeInteractive; the rule targets pages/.
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script id="theme-init" strategy="beforeInteractive">
      {script}
    </Script>
  );
}
