import { ViewTransition, type ReactNode } from "react";

/*
 * View transitions between hubs and detail pages (React <ViewTransition>,
 * which Next's App Router runs on every client navigation). Animations are
 * in globals.css and switched off under prefers-reduced-motion. Browsers
 * without the View Transitions API simply swap the page.
 */

/**
 * Wraps a hub or detail page: it fades out as you leave and fades in as you
 * arrive. `default="none"` keeps it still for everything else (Suspense
 * reveals, refreshes, form transitions).
 */
export function PageTransition({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}

/** Name for the cover image shared by a hub card and its detail page. */
export function coverTransitionName(href: string): string {
  return `cover${href.replaceAll(/[^a-z0-9]+/gi, "-")}`;
}

/**
 * A cover image that morphs between a hub card and the detail page's hero.
 * Use the same `href` on both ends; each name may appear once per page.
 */
export function SharedCover({
  href,
  children,
}: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <ViewTransition
      name={coverTransitionName(href)}
      share="cover-morph"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
