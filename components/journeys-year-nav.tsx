"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function smooth(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

/**
 * Sticky horizontal year line under the site header. Clicking a year jumps to
 * it; the year in view is highlighted. Also shows a back-to-top button once
 * the reader has scrolled down.
 */
interface YearLink {
  year: number;
  /** Id of the year's section on the page. */
  anchor: string;
}

/** Sections whose top is this close to the viewport top count as "in view". */
const ACTIVE_OFFSET_PX = 160;
/** How long a clicked year stays highlighted while the page scrolls to it. */
const PIN_MS = 1000;

export function JourneysYearNav({ years }: Readonly<{ years: YearLink[] }>) {
  const [active, setActive] = useState<number | null>(years[0]?.year ?? null);
  const [showTop, setShowTop] = useState(false);
  const barRef = useRef<HTMLOListElement>(null);
  // After a click, keep the clicked year lit while the smooth scroll runs.
  const pinnedUntil = useRef(0);

  // Keep the active year visible when the bar scrolls sideways (phones).
  useEffect(() => {
    if (active === null) return;
    barRef.current
      ?.querySelector<HTMLElement>(`[data-year="${String(active)}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  // Active year: the last section whose top has reached the sticky bar.
  useEffect(() => {
    const sections = years.flatMap(({ year, anchor }) => {
      const el = document.getElementById(anchor);
      return el ? [{ year, el }] : [];
    });
    const onScroll = () => {
      setShowTop(window.scrollY > 600);
      if (performance.now() < pinnedUntil.current) return;
      // At the very bottom the last, short years can't reach the bar.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      const reached = sections.filter(
        ({ el }) => el.getBoundingClientRect().top <= ACTIVE_OFFSET_PX,
      );
      const current = atBottom ? sections.at(-1) : reached.at(-1);
      setActive(current?.year ?? sections[0]?.year ?? null);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [years]);

  const jump = ({ year, anchor }: YearLink, clickedAt: number) => {
    setActive(year);
    pinnedUntil.current = clickedAt + PIN_MS;
    document
      .getElementById(anchor)
      ?.scrollIntoView({ behavior: smooth(), block: "start" });
    history.replaceState(null, "", `#${anchor}`);
  };

  return (
    <>
      <nav
        aria-label="Years"
        className="bg-background/85 border-border sticky top-14 z-30 -mx-6 mb-8 border-b px-6 backdrop-blur-md lg:-mx-10 lg:px-10"
      >
        <ol
          ref={barRef}
          className="relative flex [scrollbar-width:none] justify-between gap-6 overflow-x-auto py-3"
        >
          {/* The line the years sit on */}
          <span
            aria-hidden="true"
            className="bg-border pointer-events-none absolute top-[1.4rem] right-0 left-0 h-px"
          />
          {years.map((link) => {
            const { year } = link;
            const on = year === active;
            return (
              <li key={year} className="relative shrink-0">
                <button
                  type="button"
                  data-year={year}
                  aria-current={on ? "true" : undefined}
                  onClick={(event) => {
                    jump(link, event.timeStamp);
                  }}
                  className="group flex flex-col items-center gap-1.5 px-1"
                >
                  <span
                    aria-hidden="true"
                    className={`ring-background block rounded-full ring-4 transition-all ${
                      on
                        ? "bg-foreground size-2.5"
                        : "bg-muted-foreground/50 group-hover:bg-foreground my-0.5 size-1.5"
                    }`}
                  />
                  <span
                    className={`meta-label transition-colors ${
                      on
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {year}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <button
        type="button"
        aria-label="Back to top"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: smooth() });
          history.replaceState(null, "", window.location.pathname);
        }}
        className={`bg-foreground text-background fixed right-5 bottom-5 z-40 flex size-11 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:opacity-90 ${
          showTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
        tabIndex={showTop ? 0 : -1}
      >
        <ArrowUp className="size-5" aria-hidden="true" />
      </button>
    </>
  );
}
