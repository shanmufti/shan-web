import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

export interface PagerItem {
  href: string;
  title: string;
  /** Small mono line under the direction label, e.g. a date. */
  meta?: string | undefined;
  /** Passcode item: shows a lock next to the title. */
  locked?: boolean | undefined;
}

function PagerLink({
  item,
  label,
  side,
}: Readonly<{ item: PagerItem; label: string; side: "prev" | "next" }>) {
  const next = side === "next";
  return (
    <Link
      href={item.href}
      rel={next ? "next" : "prev"}
      className={`group bg-card border-border lift block rounded-2xl border p-5 ${
        next ? "sm:col-start-2 sm:text-right" : ""
      }`}
    >
      <span
        className={`meta-label text-muted-foreground inline-flex items-center gap-1.5 ${
          next ? "sm:flex-row-reverse" : ""
        }`}
      >
        {next ? (
          <ArrowRight className="size-3.5" aria-hidden="true" />
        ) : (
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        )}
        {label}
      </span>
      <span className="mt-2 block text-lg leading-snug font-medium tracking-tight underline-offset-4 group-hover:underline">
        {item.title}
        {item.locked ? (
          <>
            <Lock
              className="text-muted-foreground ml-1.5 inline size-3.5 align-baseline"
              aria-hidden="true"
            />
            <span className="sr-only"> (passcode required)</span>
          </>
        ) : null}
      </span>
      {item.meta ? (
        <span className="text-muted-foreground mt-1 block text-sm">
          {item.meta}
        </span>
      ) : null}
    </Link>
  );
}

/** Previous / next links at the foot of a detail page. */
export function DetailPager({
  label,
  prev,
  next,
  prevLabel = "Previous",
  nextLabel = "Next",
}: Readonly<{
  /** Accessible name of the nav, e.g. "More journeys". */
  label: string;
  prev?: PagerItem | undefined;
  next?: PagerItem | undefined;
  prevLabel?: string;
  nextLabel?: string;
}>) {
  if (!prev && !next) return null;
  return (
    <nav aria-label={label} className="mt-20 grid gap-4 sm:grid-cols-2">
      {prev ? <PagerLink item={prev} label={prevLabel} side="prev" /> : null}
      {next ? <PagerLink item={next} label={nextLabel} side="next" /> : null}
    </nav>
  );
}
