import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: {
    template: "%s | KnotBook",
    default: "KnotBook | Premium Wedding Planning Dashboard",
  },
  description:
    "Plan your dream Asian wedding in the UK with KnotBook. Manage guests, budgets, seating, vendors, and outfits in one elegant dashboard.",
  keywords: [
    "wedding planning",
    "Asian wedding",
    "UK wedding",
    "guest management",
    "budget tracker",
    "seating planner",
  ],
  metadataBase: new URL("https://knotbook.onrender.com"),
  openGraph: {
    title: "KnotBook | Premium Wedding Planning Dashboard",
    description:
      "Plan your dream Asian wedding in the UK with KnotBook. Manage guests, budgets, seating, vendors, and outfits in one elegant dashboard.",
    url: "https://knotbook.onrender.com",
    siteName: "KnotBook",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  manifest: "/manifest.json",
  other: {
    "theme-color": "#D4AF37",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-background text-on-surface font-body antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
