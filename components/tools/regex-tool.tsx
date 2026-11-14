"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";

import {
  MAX_MATCHES,
  runRegex,
  segmentText,
  type RegexMatch,
} from "@/lib/tools/regex";
import { cn } from "@/lib/utils";

import {
  Checkbox,
  ErrorText,
  inputClass,
  monoAreaClass,
  Panel,
} from "./tool-ui";

const FLAGS = [
  { flag: "g", label: "Global (g)" },
  { flag: "i", label: "Ignore case (i)" },
  { flag: "m", label: "Multiline (m)" },
  { flag: "s", label: "Dot matches newline (s)" },
  { flag: "u", label: "Unicode (u)" },
  { flag: "y", label: "Sticky (y)" },
] as const;

const SAMPLE_PATTERN = String.raw`(?<user>[\w.+-]+)@(?<domain>[\w-]+\.[\w.]+)`;
const SAMPLE_TEXT = `Write to hello@example.com or support@help.example.org.
Not an address: user@localhost`;

export function RegexTool() {
  const uid = useId();
  const [pattern, setPattern] = useState(SAMPLE_PATTERN);
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState(SAMPLE_TEXT);

  // Keeps typing responsive on large inputs.
  const deferred = {
    pattern: useDeferredValue(pattern),
    flags: useDeferredValue(flags),
    text: useDeferredValue(text),
  };
  const result = useMemo(
    () => runRegex(deferred.pattern, deferred.flags, deferred.text),
    [deferred.pattern, deferred.flags, deferred.text],
  );
  const segments = useMemo(
    () => (result.ok ? segmentText(deferred.text, result.matches) : []),
    [result, deferred.text],
  );

  const toggleFlag = (flag: string, on: boolean) => {
    setFlags((current) => {
      const set = new Set(current);
      if (on) set.add(flag);
      else set.delete(flag);
      return FLAGS.map((f) => f.flag)
        .filter((f) => set.has(f))
        .join("");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-pattern`} className="text-sm font-medium">
          Pattern
        </label>
        <div className="flex items-center gap-1 font-mono">
          <span className="text-muted-foreground" aria-hidden="true">
            /
          </span>
          <input
            id={`${uid}-pattern`}
            value={pattern}
            onChange={(e) => {
              setPattern(e.target.value);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-invalid={result.ok ? undefined : true}
            aria-describedby={`${uid}-err`}
            className={`${inputClass} h-10 font-mono`}
          />
          <span className="text-muted-foreground" aria-hidden="true">
            /{flags}
          </span>
        </div>
        <ErrorText id={`${uid}-err`} error={result.ok ? null : result.error} />
        <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
          <legend className="sr-only">Flags</legend>
          {FLAGS.map((f) => (
            <Checkbox
              key={f.flag}
              label={f.label}
              checked={flags.includes(f.flag)}
              onChange={(on) => {
                toggleFlag(f.flag, on);
              }}
            />
          ))}
        </fieldset>
        <p className="text-muted-foreground text-xs">
          Uses your browser&apos;s JavaScript regex engine. Very slow patterns
          can make the page stop responding for a moment.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${uid}-text`} className="text-sm font-medium">
            Test text
          </label>
          <textarea
            id={`${uid}-text`}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
            rows={10}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            className={monoAreaClass}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <h2 id={`${uid}-hl`} className="text-sm font-medium">
            Matches highlighted
          </h2>
          <div
            role="region"
            aria-labelledby={`${uid}-hl`}
            className="border-border bg-muted/40 min-h-40 overflow-auto rounded-md border px-3 py-2 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap"
          >
            {segments.map((s, i) =>
              s.match === null ? (
                <span key={i}>{s.text}</span>
              ) : (
                <mark
                  key={i}
                  className={cn(
                    "text-foreground rounded-sm px-px",
                    s.match % 2 === 0 ? "bg-primary/25" : "bg-chart-3/30",
                  )}
                >
                  {s.text}
                </mark>
              ),
            )}
          </div>
        </div>
      </div>

      {result.ok && deferred.pattern !== "" ? (
        <MatchDetails matches={result.matches} truncated={result.truncated} />
      ) : null}
    </div>
  );
}

function matchSummary(count: number, truncated: boolean): string {
  if (count === 0) return "No matches.";
  if (truncated) {
    return `${String(MAX_MATCHES)}+ matches (showing the first ${String(MAX_MATCHES)}).`;
  }
  return count === 1 ? "1 match." : `${String(count)} matches.`;
}

function MatchDetails({
  matches,
  truncated,
}: Readonly<{ matches: RegexMatch[]; truncated: boolean }>) {
  return (
    <Panel title="Match details">
      <p className="text-sm" aria-live="polite">
        {matchSummary(matches.length, truncated)}
      </p>
      {matches.length > 0 ? (
        <ol className="mt-3 space-y-3">
          {matches.slice(0, 200).map((m, i) => (
            <li
              key={`${String(m.index)}-${String(i)}`}
              className="border-border rounded-md border p-3 text-sm"
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="meta-label text-muted-foreground">
                  Match {i + 1}
                </span>
                <span className="text-muted-foreground text-xs">
                  index {m.index}–{m.end}
                </span>
              </div>
              <code className="bg-muted mt-1 inline-block rounded px-1.5 py-0.5 break-all">
                {m.text === "" ? "(empty)" : m.text}
              </code>
              {m.groups.length > 0 ? (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  {m.groups.map((g) => (
                    <div key={g.name} className="contents">
                      <dt className="text-muted-foreground font-mono">
                        {g.name}
                      </dt>
                      <dd className="font-mono break-all">
                        {g.value ?? (
                          <span className="text-muted-foreground">
                            (not matched)
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      {matches.length > 200 ? (
        <p className="text-muted-foreground mt-3 text-sm">
          Details shown for the first 200 matches.
        </p>
      ) : null}
    </Panel>
  );
}
