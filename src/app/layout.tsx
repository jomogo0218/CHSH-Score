import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c, Noto_Sans_TC } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import { SiteHeader } from "@/components/SiteHeader";
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
  title: "校園環境無名小站",
  description: "全校 32 班智慧校園環境評分與照片紀錄系統",
  applicationName: "校園環境無名小站",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "環境評分",
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
    <html lang="zh-Hant" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <PwaRegister />
        <SiteHeader />
        <main className="site-shell py-6 sm:py-8">{children}</main>
        <footer className="site-shell pb-10 pt-2 text-center text-xs text-muted">
          校園智慧環境評分系統 · 第 2 週評分上傳 · 可加入主畫面使用
        </footer>
      </body>
    </html>
  );
}
