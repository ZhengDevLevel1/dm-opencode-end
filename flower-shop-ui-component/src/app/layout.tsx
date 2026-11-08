import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "花屿 Bloom Isle · 登录",
  description: "一间安静的花艺工作室——登录后继续挑选花礼、查看订单与履约进度。",
};

const themeScript = `(function(){try{var t=localStorage.getItem("bloom-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className="bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
