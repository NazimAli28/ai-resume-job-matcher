import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { PRODUCT_NAME } from "@/config/brand";
import { DemoProvider } from "@/demo/store";

export const metadata: Metadata = { title: `${PRODUCT_NAME} (demo)` };

export default function AppLayout({ children }: LayoutProps<"/demo">) {
  return (
    <DemoProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </DemoProvider>
  );
}
