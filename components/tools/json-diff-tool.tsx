"use client";

import { useMemo, useState } from "react";

import { diffJson, parseJson, type DiffEntry } from "@/lib/tools/json";
import { cn } from "@/lib/utils";

import { buttonClass, CopyButton, Panel, TextField } from "./tool-ui";

const SAMPLE_A = `{
  "name": "site",
  "version": 1,
  "tags": ["a", "b"],
  "owner": { "email": "old@example.com" }
}`;
const SAMPLE_B = `{
  "name": "site",
  "version": 2,
  "tags": ["a"],
  "owner": { "email": "new@example.com", "verified": true }
}`;

const KIND_LABEL: Record<DiffEntry["kind"], string> = {
  added: "Added",
  removed: "Removed",
  changed: "Changed",
};

const KIND_CLASS: Record<DiffEntry["kind"], string> = {
  added: "border-l-success",
  removed: "border-l-destructive",
  changed: "border-l-warning",
};

function show(value: unknown): string {
  const text = JSON.stringify(value);
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

function summary(entries: DiffEntry[]): string {
  const count = (kind: DiffEntry["kind"]) =>
    entries.filter((e) => e.kind === kind).length;
  return `${String(entries.length)} difference${entries.length === 1 ? "" : "s"}: ${String(count("added"))} added, ${String(count("removed"))} removed, ${String(count("changed"))} changed.`;
}

export function JsonDiffTool() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");

  const a = useMemo(() => (left.trim() ? parseJson(left) : null), [left]);
  const b = useMemo(() => (right.trim() ? parseJson(right) : null), [right]);
  const diff = useMemo(
    () => (a?.ok && b?.ok ? diffJson(a.value, b.value) : null),
    [a, b],
  );

  const report = diff
    ? diff
        .map((d) => {
          if (d.kind === "added") return `+ ${d.path}: ${show(d.after)}`;
          if (d.kind === "removed") return `- ${d.path}: ${show(d.before)}`;
          return `~ ${d.path}: ${show(d.before)} -> ${show(d.after)}`;
        })
        .join("\n")
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setLeft(SAMPLE_A);
            setRight(SAMPLE_B);
          }}
        >
          Sample
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setLeft(right);
            setRight(left);
          }}
        >
          Swap
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={!left && !right}
          onClick={() => {
            setLeft("");
            setRight("");
          }}
        >
          Clear
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <TextField
          label="Original JSON"
          value={left}
          onChange={setLeft}
          rows={12}
          error={a && !a.ok ? a.error : null}
        />
        <TextField
          label="Changed JSON"
          value={right}
          onChange={setRight}
          rows={12}
          error={b && !b.ok ? b.error : null}
        />
      </div>

      <Panel title="Differences">
        <div aria-live="polite">
          {diff === null ? (
            <p className="text-muted-foreground text-sm">
              Enter valid JSON on both sides to compare. Object key order is
              ignored; arrays are compared by position.
            </p>
          ) : null}
          {diff?.length === 0 ? (
            <p className="text-sm">No differences. The documents are equal.</p>
          ) : null}
          {diff && diff.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">{summary(diff)}</p>
                <CopyButton value={report} label="Copy as text" />
              </div>
              <ul className="mt-4 space-y-2">
                {diff.map((d) => (
                  <li
                    key={`${d.kind}:${d.path}`}
                    className={cn(
                      "bg-muted/40 rounded-r-md border-l-4 px-3 py-2 font-mono text-sm break-all",
                      KIND_CLASS[d.kind],
                    )}
                  >
                    <span className="meta-label text-muted-foreground mr-2 font-sans">
                      {KIND_LABEL[d.kind]}
                    </span>
                    <span className="font-semibold">{d.path}</span>
                    <div className="mt-1">
                      {d.kind === "added" ? show(d.after) : null}
                      {d.kind === "removed" ? show(d.before) : null}
                      {d.kind === "changed" ? (
                        <>
                          {show(d.before)} <span aria-hidden="true">→</span>
                          <span className="sr-only">becomes</span>{" "}
                          {show(d.after)}
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
