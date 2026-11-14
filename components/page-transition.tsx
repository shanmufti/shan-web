import { ViewTransition, type ReactNode } from "react";

/*
 * View transitions between hubs and detail pages (React <ViewTransition>).
 * They run only for navigations through links tagged with
 * `transitionTypes={HUB_DETAIL}` (cards, breadcrumbs, pagers, back links):
 * nothing animates on first load, Suspense reveals, refreshes, form
 * submissions or browser back/forward. Animations are in globals.css and
 * switched off under prefers-reduced-motion. Browsers without the View
 * Transitions API simply swap the page.
 */

/** Transition type for `<Link transitionTypes>` between hubs and details. */
export const HUB_DETAIL = ["hub-detail"];

/** Animation class for hub/detail navigations, "none" for anything else. */
function onHubDetail(className: string) {
  return { "hub-detail": className, default: "none" };
}

/**
 * Wraps a hub or detail page: it fades out as you leave and fades in as you
 * arrive.
 */
export function PageTransition({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ViewTransition
      enter={onHubDetail("page-enter")}
      exit={onHubDetail("page-exit")}
      default="none"
    >
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
      share={onHubDetail("cover-morph")}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
