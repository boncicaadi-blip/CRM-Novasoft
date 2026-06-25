import type { Metadata } from "next";
import { Barlow, Inter } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

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
    <html lang="ro" className={`${barlow.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0B0D1A] text-slate-100">
        {children}
      </body>
    </html>
  );
}
