import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pipeline — Strategie comerciala 2026",
  description: "Tracking pipeline comercial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0B0F14] text-slate-100">
        {children}
      </body>
    </html>
  );
}
