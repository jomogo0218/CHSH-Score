import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '教室 AI 監控系統 | 學生行為分析',
  description: '混合版 AI 教室監控系統 - 即時偵測學生低頭、滑手機、趴睡等行為，提供專注度分析報表',
  keywords: '教室監控, AI 分析, 學生行為, 姿態偵測, 專注度分析',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
