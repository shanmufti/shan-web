"use client";

import { MapPin } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { formatDate } from "@/lib/format-date";
import { stayLabel, type RouteStop } from "@/lib/journey-route";

import { RouteMapLoader } from "./route-map-loader";
import type { RouteTrack } from "./route-map";

function wide() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function behavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function StopList({
  stops,
  selected,
  onSelect,
  onHover,
}: Readonly<{
  stops: RouteStop[];
  selected: number | null;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}>) {
  return (
    <ol
      className="space-y-1"
      onMouseLeave={() => {
        onHover(null);
      }}
    >
      {stops.map((stop, index) => {
        const active = selected === index;
        const stay = stayLabel(stop.stayDays);
        return (
          <li key={`${stop.name}-${String(index)}`} data-stop={index}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => {
                onSelect(index);
              }}
              onMouseEnter={() => {
                onHover(index);
              }}
              onFocus={() => {
                onHover(index);
              }}
              onBlur={() => {
                onHover(null);
              }}
              className={`group flex w-full scroll-mt-32 items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                active ? "bg-tint-coral" : "hover:bg-muted/70"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full font-mono text-[0.7rem] font-medium tabular-nums ${
                  active
                    ? "bg-coral text-coral-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">
                  <span className="sr-only">Stop {index + 1}: </span>
                  {stop.name}
                </span>
                {stop.arrivedOn || stay ? (
                  <span className="meta-label text-muted-foreground block">
                    {[stop.arrivedOn ? formatDate(stop.arrivedOn) : null, stay]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : null}
              </span>
              <MapPin
                className="text-muted-foreground mt-1 ml-auto size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                aria-hidden="true"
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

interface RouteSelection {
  stops: RouteStop[];
  track: RouteTrack;
  selected: number | null;
  hovered: number | null;
  setHovered: (index: number | null) => void;
  selectFromList: (index: number) => void;
  selectFromMap: (index: number) => void;
  rootRef: RefObject<HTMLDivElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
}

const RouteContext = createContext<RouteSelection | null>(null);

function useRoute(): RouteSelection {
  const value = useContext(RouteContext);
  if (!value) throw new Error("Use inside <JourneyRouteView>");
  return value;
}

/**
 * Journey page body in the Polarsteps style. Wide screens: the route map is
 * sticky and full height on the right while the story and stops scroll on
 * the left. Phones: the map is full width at the top and the content slides
 * over it as a sheet. The stop list and the map's markers are linked both
 * ways (pick a stop to fly to it; pick a marker to highlight its stop).
 *
 * Server content goes in as children of <JourneyRouteSheet>; place
 * <JourneyStopList> inside it where the list should appear.
 */
export function JourneyRouteView({
  stops,
  track,
  children,
}: Readonly<{
  stops: RouteStop[];
  track: RouteTrack;
  children: ReactNode;
}>) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // From the list: select, and on phones bring the map back into view.
  const selectFromList = useCallback((index: number) => {
    setSelected(index);
    const root = rootRef.current;
    if (root && !wide()) {
      const offset =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--header-height",
          ),
        ) * 16 || 64;
      const top = root.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: behavior() });
    }
  }, []);

  // From the map: select, and on wide screens show the stop in the list.
  const selectFromMap = useCallback((index: number) => {
    setSelected(index);
    if (wide()) {
      listRef.current
        ?.querySelector(`[data-stop="${String(index)}"] button`)
        ?.scrollIntoView({ block: "nearest", behavior: behavior() });
    }
  }, []);

  const value = useMemo(
    () => ({
      stops,
      track,
      selected,
      hovered,
      setHovered,
      selectFromList,
      selectFromMap,
      rootRef,
      listRef,
    }),
    [stops, track, selected, hovered, selectFromList, selectFromMap],
  );

  const hasMap = stops.length > 0;

  return (
    <RouteContext.Provider value={value}>
      <div
        ref={rootRef}
        className={
          hasMap
            ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
            : ""
        }
      >
        {hasMap ? (
          <section
            aria-label="Route map"
            className="sticky top-[var(--header-offset)] z-0 h-[58vh] transition-[top] duration-300 lg:order-2 lg:h-[calc(100dvh-var(--header-offset))] lg:self-start lg:border-l"
          >
            <RouteMapLoader
              stops={stops}
              track={track}
              selected={selected}
              highlighted={hovered}
              onSelect={selectFromMap}
            />
          </section>
        ) : null}

        <div
          className={
            hasMap
              ? "bg-background relative z-10 -mt-8 rounded-t-[1.75rem] shadow-[0_-12px_32px_-16px_oklch(0.234_0.047_250/25%)] lg:order-1 lg:mt-0 lg:rounded-none lg:shadow-none"
              : ""
          }
        >
          {hasMap ? (
            <div
              aria-hidden="true"
              className="bg-border mx-auto mt-3 h-1.5 w-12 rounded-full lg:hidden"
            />
          ) : null}
          <div className="mx-auto max-w-[44rem] px-4 pb-24 sm:px-8 lg:px-10">
            {children}
          </div>
        </div>
      </div>
    </RouteContext.Provider>
  );
}

/** The numbered stop list, linked to the map. Renders nothing for one stop. */
export function JourneyStopList() {
  const { stops, selected, setHovered, selectFromList, listRef } = useRoute();
  if (stops.length < 2) return null;
  return (
    <section aria-labelledby="route-stops" className="mt-12">
      <h2 id="route-stops" className="text-2xl font-medium tracking-[-0.03em]">
        Route
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Pick a stop to show it on the map.
      </p>
      <div ref={listRef} className="-mx-3 mt-4">
        <StopList
          stops={stops}
          selected={selected}
          onSelect={selectFromList}
          onHover={setHovered}
        />
      </div>
    </section>
  );
}
