import "./(site)/globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { WaterLight } from "@/components/layout/water-light";
import { themeInitScript } from "@/lib/theme";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Not found · Shan Mufti",
};

/** 404 for URLs that match no route. Renders without the site layout. */
export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="relative isolate min-h-full">
        <WaterLight />
        <header>
          <div className="mx-auto flex h-(--header-height) max-w-7xl items-center px-6 lg:px-10">
            <Link
              href="/"
              aria-label="smufti, home"
              className="-mx-1 rounded-md px-1 text-lg font-semibold tracking-[-0.02em]"
            >
              smufti
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 pt-20 pb-24 sm:pt-28 lg:px-10">
          <p className="meta-label text-muted-foreground">404 · Off the map</p>
          <h1 className="font-heading mt-3 max-w-2xl text-[clamp(2.25rem,5vw,4rem)]">
            This page drifted out of range.
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-lg">
            The link may be old, or the page may have moved.
          </p>
          <div className="mt-8 flex gap-6 text-sm">
            <Link href="/" className="underline-offset-4 hover:underline">
              Back home →
            </Link>
            <Link href="/travel" className="underline-offset-4 hover:underline">
              Browse journeys →
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
