import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { WaterLight } from "@/components/layout/water-light";
import { siteUrl } from "@/lib/site-url";
import { themeInitScript } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Kept neutral while most sections are hidden; link previews show this.
const description = "Shan Mufti";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Shan Mufti",
    template: "%s · Shan Mufti",
  },
  description,
  openGraph: {
    siteName: "Shan Mufti",
    type: "website",
    locale: "en_US",
    description,
    images: ["/opengraph-image"],
  },
  // No twitter:image: X falls back to og:image, which is per page.
  twitter: { card: "summary_large_image" },
};

// Browser chrome colour: light and dark --background.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The theme script sets the `dark` class before React hydrates.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="relative isolate flex min-h-full flex-col">
        <WaterLight />
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only z-50 rounded-lg px-4 py-2 text-sm shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
