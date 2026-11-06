import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./snow/brand.css";
import "./portal.css";

export const metadata: Metadata = {
  // 导航栏 / 分享标题用短名；全称放在门户副标与关于页
  title: "青唐冰雪烩 · AI 伴游",
  description: "青海·青唐城第三届冰雪烩园区导览、点位讲解与游线推荐",
  formatDetection: { telephone: false }
};

/**
 * viewportFit: "cover" 是 env(safe-area-inset-*) 返回非零值的前提。
 * 少了它，iOS 上底部输入框会被 home indicator 压住。
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#8e2b26"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
