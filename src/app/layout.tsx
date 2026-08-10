import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { M_PLUS_Rounded_1c, Noto_Sans_TC } from "next/font/google";
import { ClassAlertListener } from "@/components/ClassAlertListener";
import { StaffAlertListener } from "@/components/StaffAlertListener";
import { ClickSound } from "@/components/ClickSound";
import { OfflineSync } from "@/components/OfflineSync";
import { PwaRegister } from "@/components/PwaRegister";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_NAME, SITE_SHORT_NAME, SITE_TAGLINE } from "@/lib/constants";
import { THEME_BOOT_SCRIPT } from "@/lib/theme/themes";
import "./globals.css";

const display = M_PLUS_Rounded_1c({
  weight: ["500", "700", "800"],
  subsets: ["latin"],
  variable: "--font-rounded",
  display: "swap",
});

const body = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: SITE_NAME,
  description: `${SITE_NAME}：${SITE_TAGLINE}`,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_SHORT_NAME,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2a6b58",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <Script id="chsh-theme" strategy="beforeInteractive">
          {THEME_BOOT_SCRIPT}
        </Script>
        <PwaRegister />
        <ClickSound />
        <ClassAlertListener />
        <StaffAlertListener />
        <SiteHeader />
        <OfflineSync />
        <main className="site-shell py-3 sm:py-5">{children}</main>
        <footer className="site-shell pb-6 pt-1 text-center text-[11px] text-muted">
          {SITE_NAME} · 可加入主畫面使用
        </footer>
      </body>
    </html>
  );
}
