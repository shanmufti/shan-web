"use client";

import { X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import {
  allTimeZones,
  formatInZone,
  formatLongInZone,
  localTimeZone,
  parseTimeInput,
  parseWallTime,
  relativeTime,
  toDateTimeLocalValue,
  zonedTimeToMs,
  type TimeUnit,
} from "@/lib/tools/time";

import {
  buttonClass,
  CopyButton,
  ErrorText,
  inputClass,
  Panel,
  ValueRow,
} from "./tool-ui";
import { useIsClient } from "./use-client-value";

const DEFAULT_ZONES = [
  "UTC",
  "America/New_York",
  "Europe/London",
  "Asia/Tokyo",
];

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);
  return now;
}

function ZoneSelect({
  id,
  value,
  onChange,
  zones,
  placeholder,
}: Readonly<{
  id: string;
  value: string;
  onChange: (zone: string) => void;
  zones: string[];
  placeholder?: string;
}>) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      className={`${inputClass} h-10`}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {zones.map((z) => (
        <option key={z} value={z}>
          {z.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}

function ZoneTable({
  ms,
  zones,
  localZone,
  onRemove,
}: Readonly<{
  ms: number;
  zones: string[];
  localZone: string;
  onRemove: (zone: string) => void;
}>) {
  const list = [localZone, ...zones.filter((z) => z !== localZone)];
  return (
    <ul className="divide-y">
      {list.map((zone) => {
        const text = formatInZone(ms, zone);
        return (
          <li
            key={zone}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5"
          >
            <span className="w-full text-sm font-medium sm:w-48">
              {zone.replaceAll("_", " ")}
              {zone === localZone ? (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  (yours)
                </span>
              ) : null}
            </span>
            <span className="min-w-0 flex-1 font-mono text-sm">{text}</span>
            <span className="flex gap-2">
              <CopyButton value={text} what={zone} />
              {zone === localZone ? null : (
                <button
                  type="button"
                  className={`${buttonClass} h-8 px-2`}
                  onClick={() => {
                    onRemove(zone);
                  }}
                  aria-label={`Remove ${zone}`}
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function TimestampTool() {
  const isClient = useIsClient();
  const now = useNow();
  const uid = useId();
  const zonesList = useMemo(() => (isClient ? allTimeZones() : []), [isClient]);
  const localZone = isClient ? localTimeZone() : "UTC";

  const [input, setInput] = useState("");
  const [unit, setUnit] = useState<TimeUnit | "auto">("auto");
  const [zones, setZones] = useState<string[]>(DEFAULT_ZONES);
  const [addZone, setAddZone] = useState("");

  const [wall, setWall] = useState("");
  const [wallZone, setWallZone] = useState("");

  const parsed = useMemo(
    () => (input.trim() ? parseTimeInput(input, unit) : null),
    [input, unit],
  );
  const wallMs = useMemo(() => {
    const w = parseWallTime(wall);
    return w ? zonedTimeToMs(w, wallZone || localZone) : null;
  }, [wall, wallZone, localZone]);

  const removeZone = (zone: string) => {
    setZones((z) => z.filter((x) => x !== zone));
  };

  return (
    <div className="space-y-6">
      <Panel title="Now">
        {isClient ? (
          <dl>
            <ValueRow
              label="Unix seconds"
              value={String(Math.floor(now / 1000))}
            />
            <ValueRow label="Unix milliseconds" value={String(now)} />
            <ValueRow
              label="ISO 8601 (UTC)"
              value={new Date(now).toISOString()}
            />
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">
            Loading the current time…
          </p>
        )}
      </Panel>

      <Panel title="Convert a timestamp or date">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label htmlFor={`${uid}-in`} className="text-sm font-medium">
              Timestamp or date
            </label>
            <input
              id={`${uid}-in`}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
              }}
              placeholder="1700000000 or 2026-11-14T09:30:00Z"
              spellCheck={false}
              autoComplete="off"
              inputMode="text"
              aria-invalid={parsed && !parsed.ok ? true : undefined}
              aria-describedby={`${uid}-err`}
              className={`${inputClass} h-10 font-mono`}
            />
          </div>
          <div className="flex flex-col gap-2 sm:w-44">
            <label htmlFor={`${uid}-unit`} className="text-sm font-medium">
              Unit
            </label>
            <select
              id={`${uid}-unit`}
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value as TimeUnit | "auto");
              }}
              className={`${inputClass} h-10`}
            >
              <option value="auto">Detect</option>
              <option value="s">Seconds</option>
              <option value="ms">Milliseconds</option>
              <option value="us">Microseconds</option>
              <option value="ns">Nanoseconds</option>
            </select>
          </div>
          <button
            type="button"
            className={`${buttonClass} h-10`}
            onClick={() => {
              setInput(String(Math.floor(Date.now() / 1000)));
            }}
          >
            Now
          </button>
        </div>
        <div className="mt-2">
          <ErrorText
            id={`${uid}-err`}
            error={parsed && !parsed.ok ? parsed.error : null}
          />
        </div>
        {parsed?.ok ? (
          <div className="mt-4">
            <p className="text-muted-foreground text-sm">{parsed.detected}</p>
            <dl className="mt-2">
              <ValueRow
                label="Unix seconds"
                value={String(Math.floor(parsed.ms / 1000))}
              />
              <ValueRow label="Unix milliseconds" value={String(parsed.ms)} />
              <ValueRow
                label="ISO 8601 (UTC)"
                value={new Date(parsed.ms).toISOString()}
              />
              <ValueRow
                label="Your time"
                value={formatLongInZone(parsed.ms, localZone)}
                mono={false}
              />
              <ValueRow
                label="Relative"
                value={relativeTime(parsed.ms, now)}
                mono={false}
              />
            </dl>
            <h3 className="mt-5 text-sm font-semibold">In other time zones</h3>
            <ZoneTable
              ms={parsed.ms}
              zones={zones}
              localZone={localZone}
              onRemove={removeZone}
            />
          </div>
        ) : null}
      </Panel>

      <Panel title="Convert a time between zones">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor={`${uid}-wall`} className="text-sm font-medium">
              Date and time
            </label>
            <input
              id={`${uid}-wall`}
              type="datetime-local"
              step={1}
              value={wall}
              onChange={(e) => {
                setWall(e.target.value);
              }}
              className={`${inputClass} h-10`}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${uid}-wallzone`} className="text-sm font-medium">
              In time zone
            </label>
            <ZoneSelect
              id={`${uid}-wallzone`}
              value={wallZone}
              onChange={setWallZone}
              zones={zonesList}
              placeholder={`Your time zone (${localZone})`}
            />
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              setWall(toDateTimeLocalValue(Date.now(), wallZone || localZone));
            }}
          >
            Use current time
          </button>
        </div>
        {wallMs === null ? null : (
          <div className="mt-4">
            <dl>
              <ValueRow
                label="Unix seconds"
                value={String(Math.floor(wallMs / 1000))}
              />
              <ValueRow
                label="ISO 8601 (UTC)"
                value={new Date(wallMs).toISOString()}
              />
            </dl>
            <ZoneTable
              ms={wallMs}
              zones={zones}
              localZone={localZone}
              onRemove={removeZone}
            />
          </div>
        )}
      </Panel>

      <Panel title="Time zones shown">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label htmlFor={`${uid}-add`} className="text-sm font-medium">
              Add a time zone
            </label>
            <ZoneSelect
              id={`${uid}-add`}
              value={addZone}
              onChange={setAddZone}
              zones={zonesList.filter((z) => !zones.includes(z))}
              placeholder="Choose a time zone"
            />
          </div>
          <button
            type="button"
            className={`${buttonClass} h-10`}
            disabled={addZone === ""}
            onClick={() => {
              setZones((z) => [...z, addZone]);
              setAddZone("");
            }}
          >
            Add
          </button>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          {zones.length > 0
            ? `Showing your zone plus ${zones.map((z) => z.replaceAll("_", " ")).join(", ")}.`
            : "Showing your zone only."}
        </p>
      </Panel>
    </div>
  );
}
