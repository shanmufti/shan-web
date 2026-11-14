"use client";

import { useId, useMemo, useState } from "react";

import {
  explainCron,
  nextRuns,
  parseCron,
  type CronZone,
} from "@/lib/tools/cron";
import { localTimeZone, relativeTime } from "@/lib/tools/time";

import {
  buttonClass,
  CopyButton,
  ErrorText,
  inputClass,
  Panel,
  Segmented,
} from "./tool-ui";
import { useIsClient, useNow } from "./use-client-value";

const PRESETS = [
  { label: "Every 15 min", value: "*/15 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Weekdays 09:30", value: "30 9 * * 1-5" },
  { label: "Daily midnight", value: "@daily" },
  { label: "1st of month", value: "0 0 1 * *" },
];

const FIELD_NAMES = [
  ["minute", "Minute", "0-59"],
  ["hour", "Hour", "0-23"],
  ["dayOfMonth", "Day of month", "1-31"],
  ["month", "Month", "1-12 or JAN-DEC"],
  ["dayOfWeek", "Day of week", "0-6 or SUN-SAT (7 = Sunday)"],
] as const;

export function CronTool() {
  const uid = useId();
  const isClient = useIsClient();
  const [expression, setExpression] = useState("30 9 * * 1-5");
  const [zone, setZone] = useState<CronZone>("local");
  const now = useNow();

  const parsed = useMemo(() => parseCron(expression), [expression]);
  const runs = useMemo(
    () =>
      parsed.ok && isClient
        ? nextRuns(parsed.schedule, 5, new Date(now), zone)
        : [],
    [parsed, isClient, now, zone],
  );

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: zone === "utc" ? "UTC" : undefined,
      }),
    [zone],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-expr`} className="text-sm font-medium">
          Cron expression
        </label>
        <div className="flex gap-2">
          <input
            id={`${uid}-expr`}
            value={expression}
            onChange={(e) => {
              setExpression(e.target.value);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-invalid={parsed.ok ? undefined : true}
            aria-describedby={`${uid}-hint ${uid}-err`}
            className={`${inputClass} h-11 font-mono text-lg sm:text-base`}
          />
          <CopyButton value={expression} what="expression" className="h-11" />
        </div>
        <p id={`${uid}-hint`} className="text-muted-foreground text-xs">
          Five fields: minute hour day-of-month month day-of-week. Also @hourly,
          @daily, @weekly, @monthly, @yearly.
        </p>
        <ErrorText id={`${uid}-err`} error={parsed.ok ? null : parsed.error} />
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Examples"
        >
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`${buttonClass} h-8 text-xs`}
              onClick={() => {
                setExpression(p.value);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {parsed.ok ? (
        <>
          <Panel>
            <p
              className="text-xl font-medium tracking-tight"
              aria-live="polite"
            >
              {explainCron(parsed.schedule)}
            </p>
          </Panel>

          <Panel title="Next 5 runs">
            <Segmented
              label="Time zone"
              value={zone}
              onChange={setZone}
              options={[
                {
                  value: "local",
                  label: isClient ? `Local (${localTimeZone()})` : "Local",
                },
                { value: "utc", label: "UTC" },
              ]}
            />
            {runs.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">
                {isClient
                  ? "No run times in the next 8 years (for example, 31 February)."
                  : ""}
              </p>
            ) : (
              <ol className="mt-3 divide-y">
                {runs.map((run) => (
                  <li
                    key={run.getTime()}
                    className="flex flex-wrap justify-between gap-x-4 py-2 text-sm"
                  >
                    <span className="font-mono">{formatter.format(run)}</span>
                    <span className="text-muted-foreground">
                      {relativeTime(run.getTime(), now)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-muted-foreground mt-3 text-xs">
              Cron runs in its server&apos;s time zone. When both day fields are
              set, a day matching either one runs (standard cron behaviour).
            </p>
          </Panel>

          <Panel title="Fields">
            <dl className="divide-y">
              {FIELD_NAMES.map(([key, label, range]) => {
                const field = parsed.schedule[key];
                return (
                  <div
                    key={key}
                    className="grid gap-1 py-2 text-sm sm:grid-cols-[10rem_6rem_1fr]"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-mono">{field.text}</dd>
                    <dd className="text-muted-foreground font-mono text-xs sm:text-sm">
                      {field.values.length > 20
                        ? `${String(field.values.length)} values (${range})`
                        : field.values.join(", ")}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
