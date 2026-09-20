import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Volea — find your fourth",
    template: "%s · Volea",
  },
  description:
    "Padel matchmaking that actually fills the court. Tell Volea when you are free, and it finds three players at your level and books a court.",
  applicationName: "Volea",
  keywords: ["padel", "padel matchmaking", "find padel players", "padel courts", "padel tournaments"],
  openGraph: {
    type: "website",
    siteName: "Volea",
    title: "Volea — find your fourth",
    description:
      "Tell Volea when you are free. It finds three players at your level and books the court.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Volea — find your fourth",
    description:
      "Tell Volea when you are free. It finds three players at your level and books the court.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/brand/logomark.svg" },
};

export const viewport: Viewport = {
  themeColor: "#060C0E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ball-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-court-950"
        >
          Skip to content
        </a>
        <TopBar />
        <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-5 md:pb-12">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
