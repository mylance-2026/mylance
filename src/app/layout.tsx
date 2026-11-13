import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ToastProvider } from "@/components/toast";
import { PreviewBanner } from "@/components/guards";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Mylance — Find the right talent. Get work done.", template: "%s | Mylance" },
  description: "Mylance helps businesses discover skilled professionals, hire confidently, manage projects and pay through a transparent marketplace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2">Skip to content</a>
          <SiteHeader />
          <PreviewBanner />
          <main id="main" className="flex-1">{children}</main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
