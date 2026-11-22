import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MDPay — Ухаалаг төлбөрийн систем",
  description: "MDPay төлбөрийн платформ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}