import type { Metadata, Viewport } from "next";
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
  title: "Novasoft CRM — Pipeline",
  description: "Tracking pipeline comercial Novasoft",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    title: "Novasoft CRM",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0D1A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className={`${barlow.variable} ${inter.variable} h-full antialiased`}>
      <head>
        {/* Aplica tema (light/dark/system) inainte de randare, ca sa evitam
            flash-ul de continut nestilizat (FOUC). Citeste intai din
            localStorage (cache rapid local, scris la fiecare schimbare din
            Profil), cu fallback la 'dark' daca nu exista inca nimic salvat. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem('novasoft-theme') || 'dark';
                  var resolved = stored;
                  if (stored === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                  }
                  document.documentElement.classList.add(resolved);
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--surface-0)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
