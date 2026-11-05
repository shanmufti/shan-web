import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-7xl px-6 pt-24 sm:pt-32 lg:px-10">
      <p className="meta-label text-muted-foreground">404 · Off the map</p>
      <h1 className="font-heading mt-3 max-w-2xl text-[clamp(2.25rem,5vw,4rem)]">
        This page drifted out of range.
      </h1>
      <p className="text-muted-foreground mt-4 max-w-xl text-lg">
        The link may be old, or the page may have moved.
      </p>
      <div className="mt-8 flex gap-6 text-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          Back home <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
        <Link
          href="/travel"
          className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          Browse journeys <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
