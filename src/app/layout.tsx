import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-script";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/config/brand";
import { defaultAccent } from "@/server/settings/app-settings";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME}: ${PRODUCT_TAGLINE}`,
  description:
    "Upload your resume, paste a job, and see exactly how you fit. Evidence-backed resume edits that never invent experience, mock interviews with model answers, and a tracker that remembers which resume you sent.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const accent = await defaultAccent();
  return (
    <html
      lang="en"
      data-theme="light"
      data-accent={accent}
      suppressHydrationWarning
      className={`${bricolage.variable} ${atkinson.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeScript accent={accent} />
        {children}
      </body>
    </html>
  );
}
