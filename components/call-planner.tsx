"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";

import {
  buildWeek,
  hourLabel,
  isAwake,
  offsetMinutes,
  type GridDay,
  type PlannerPerson,
} from "@/lib/call-planner";
import { cn } from "@/lib/utils";

const TICK_MS = 30_000;

function subscribeClock(onChange: () => void) {
  const timer = window.setInterval(onChange, TICK_MS / 3);
  return () => {
    window.clearInterval(timer);
  };
}
const clockSnapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
const noSubscribe = () => () => undefined;
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverNull = () => null;

const labelClass =
  "text-muted-foreground block text-xs tracking-wide uppercase";
const selectClass =
  "border-input bg-background focus-visible:ring-ring/40 mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

function formatTime(instant: number, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

function formatWeekday(instant: number, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(instant);
}

function formatDiff(minutes: number): string {
  if (minutes === 0) return "Same time as you";
  const sign = minutes > 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const mins = m ? ":" + String(m).padStart(2, "0") : "";
  return `${sign}${String(h)}${mins} h`;
}

function zoneLabel(zone: string): string {
  return zone.replaceAll("_", " ");
}

function PeopleNow({
  people,
  refZone,
  now,
  wakeStart,
  wakeEnd,
}: Readonly<{
  people: readonly PlannerPerson[];
  refZone: string;
  now: number;
  wakeStart: number;
  wakeEnd: number;
}>) {
  const refOffset = offsetMinutes(now, refZone);
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {people.map((person) => {
        const awake = isAwake(now, person.timeZone, wakeStart, wakeEnd);
        return (
          <li
            key={`${person.name}-${person.timeZone}`}
            className="border-border bg-card rounded-lg border p-4"
          >
            <p className="font-medium">{person.name}</p>
            <p className="text-muted-foreground text-xs">
              {person.city ?? zoneLabel(person.timeZone)}
            </p>
            <p className="mt-3 text-3xl font-medium tabular-nums">
              {formatTime(now, person.timeZone)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {formatWeekday(now, person.timeZone)} ·{" "}
              {formatDiff(offsetMinutes(now, person.timeZone) - refOffset)}
            </p>
            <p
              className={cn(
                "mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
                awake
                  ? "bg-tint-kelp text-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full",
                  awake ? "bg-success" : "bg-muted-foreground",
                )}
              />
              {awake ? "Probably awake" : "Probably asleep"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function windowsText(day: GridDay): string {
  if (day.windows.length === 0) return "No hour when everyone is awake";
  return day.windows
    .map((w) => `${hourLabel(w.start)}–${hourLabel(w.end)}`)
    .join(", ");
}

function WeekGrid({
  week,
  total,
  refZone,
}: Readonly<{ week: GridDay[]; total: number; refZone: string }>) {
  const captionId = useId();
  return (
    <div
      role="region"
      aria-labelledby={captionId}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region
      tabIndex={0}
      className="border-border bg-card focus-visible:ring-ring/50 relative mt-4 overflow-x-auto rounded-lg border outline-none focus-visible:ring-3"
    >
      <table className="w-full min-w-[56rem] border-separate border-spacing-0.5 p-2 text-xs tabular-nums">
        <caption id={captionId} className="sr-only">
          People awake each hour this week, in {zoneLabel(refZone)} time
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="text-muted-foreground w-24 text-left font-normal"
            >
              <span className="sr-only">Day</span>
            </th>
            {Array.from({ length: 24 }, (_, h) => (
              <th
                key={h}
                scope="col"
                className="text-muted-foreground font-normal"
              >
                {String(h).padStart(2, "0")}
                <span className="sr-only">:00</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {week.map((day) => (
            <tr key={day.key}>
              <th
                scope="row"
                className="pr-2 text-left font-medium whitespace-nowrap"
              >
                {formatWeekday(day.labelInstant, "UTC")}
              </th>
              {day.cells.map((cell) => {
                if (cell.instant === null) {
                  return (
                    <td
                      key={cell.hour}
                      className="text-muted-foreground h-8 text-center"
                      title="Skipped: clocks change"
                    >
                      –<span className="sr-only">skipped, clocks change</span>
                    </td>
                  );
                }
                const count = cell.awake.length;
                const all = total > 0 && count === total;
                return (
                  <td
                    key={cell.hour}
                    title={
                      count > 0
                        ? `Awake: ${cell.awake.join(", ")}`
                        : "Nobody awake"
                    }
                    className={cn(
                      "h-8 rounded-sm text-center",
                      all && "bg-primary text-primary-foreground font-medium",
                      !all && count > 0 && "bg-primary/20 text-foreground",
                      count === 0 && "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                    <span className="sr-only"> of {total} awake</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CallPlanner({
  people,
  wakeStart: initialStart,
  wakeEnd: initialEnd,
}: Readonly<{
  people: PlannerPerson[];
  wakeStart: number;
  wakeEnd: number;
}>) {
  const uid = useId();
  const now = useSyncExternalStore(subscribeClock, clockSnapshot, serverNull);
  const myZone = useSyncExternalStore(noSubscribe, browserZone, serverNull);
  const [chosenZone, setChosenZone] = useState<string | null>(null);
  const [wakeStart, setWakeStart] = useState(initialStart);
  const [wakeEnd, setWakeEnd] = useState(initialEnd);

  const refZone = chosenZone ?? myZone ?? "UTC";
  const zones = useMemo(() => {
    const list = [
      ...new Set([myZone ?? "UTC", ...people.map((p) => p.timeZone)]),
    ];
    return list;
  }, [myZone, people]);

  // Recompute the week once an hour, not on every clock tick.
  const hourKey = now === null ? null : Math.floor(now / 3_600_000);
  const week = useMemo(
    () =>
      hourKey === null
        ? []
        : buildWeek({
            people,
            refZone,
            now: hourKey * 3_600_000,
            wakeStart,
            wakeEnd,
          }),
    [hourKey, people, refZone, wakeStart, wakeEnd],
  );

  if (people.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No people yet. Add them in admin under Tools → Call planner.
      </p>
    );
  }

  if (now === null) {
    return <p className="text-muted-foreground text-sm">Loading times…</p>;
  }

  return (
    <div>
      <section aria-labelledby={`${uid}-now`}>
        <h2 id={`${uid}-now`} className="sr-only">
          Local time now
        </h2>
        <PeopleNow
          people={people}
          refZone={refZone}
          now={now}
          wakeStart={wakeStart}
          wakeEnd={wakeEnd}
        />
      </section>

      <section aria-labelledby={`${uid}-week`} className="mt-12">
        <h2 id={`${uid}-week`} className="text-lg font-medium">
          This week
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={`${uid}-zone`} className={labelClass}>
              Show times in
            </label>
            <select
              id={`${uid}-zone`}
              value={refZone}
              onChange={(e) => {
                setChosenZone(e.target.value);
              }}
              className={selectClass}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zoneLabel(zone)}
                  {zone === myZone ? " (you)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-start`} className={labelClass}>
              Awake from
            </label>
            <select
              id={`${uid}-start`}
              value={wakeStart}
              onChange={(e) => {
                setWakeStart(Number(e.target.value));
              }}
              className={selectClass}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-end`} className={labelClass}>
              Awake until
            </label>
            <select
              id={`${uid}-end`}
              value={wakeEnd}
              onChange={(e) => {
                setWakeEnd(Number(e.target.value));
              }}
              className={selectClass}
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Waking hours apply in each person&apos;s own time zone.
        </p>

        <h3 className="mt-8 text-base font-medium">
          When everyone is awake ({zoneLabel(refZone)} time)
        </h3>
        <ul className="border-border bg-card mt-3 divide-y rounded-lg border text-sm">
          {week.map((day) => (
            <li
              key={day.key}
              className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-4 py-2.5"
            >
              <span className="font-medium">
                {formatWeekday(day.labelInstant, "UTC")}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  day.windows.length === 0 && "text-muted-foreground",
                )}
              >
                {windowsText(day)}
              </span>
            </li>
          ))}
        </ul>

        <h3 className="mt-8 text-base font-medium">Hour by hour</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Each cell is how many people are awake for that whole hour.
        </p>
        <WeekGrid week={week} total={people.length} refZone={refZone} />
        <ul className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <li className="flex items-center gap-2">
            <span className="bg-primary size-3 rounded-sm" aria-hidden="true" />
            <span>Everyone awake</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className="bg-primary/20 size-3 rounded-sm"
              aria-hidden="true"
            />
            <span>Some awake</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="bg-muted size-3 rounded-sm" aria-hidden="true" />
            <span>Nobody awake</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
