"use client";

import { CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";

import { formatJson, minifyJson } from "@/lib/tools/json";

import {
  buttonClass,
  Checkbox,
  CopyButton,
  Segmented,
  TextField,
} from "./tool-ui";

const SAMPLE = `{"name":"smufti.com","tools":["json","yaml"],"nested":{"ok":true,"count":2}}`;

type Mode = "format" | "minify";
type Indent = "2" | "4" | "tab";

export function JsonTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("format");
  const [indent, setIndent] = useState<Indent>("2");
  const [sortKeys, setSortKeys] = useState(false);

  const result = useMemo(() => {
    if (input.trim() === "") return null;
    if (mode === "minify") return minifyJson(input);
    return formatJson(input, {
      indent: indent === "tab" ? "\t" : Number(indent),
      sortKeys,
    });
  }, [input, mode, indent, sortKeys]);

  const output = result?.ok ? result.output : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Segmented
          label="Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "format", label: "Format" },
            { value: "minify", label: "Minify" },
          ]}
        />
        {mode === "format" ? (
          <>
            <Segmented
              label="Indent"
              value={indent}
              onChange={setIndent}
              options={[
                { value: "2", label: "2" },
                { value: "4", label: "4" },
                { value: "tab", label: "Tab" },
              ]}
            />
            <Checkbox
              label="Sort keys"
              checked={sortKeys}
              onChange={setSortKeys}
            />
          </>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TextField
          label="JSON input"
          value={input}
          onChange={setInput}
          placeholder='{"paste": "JSON here"}'
          rows={14}
          error={result && !result.ok ? result.error : null}
          actions={
            <>
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setInput(SAMPLE);
                }}
              >
                Sample
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setInput("");
                }}
                disabled={input === ""}
              >
                Clear
              </button>
            </>
          }
        />
        <TextField
          label="Output"
          value={output}
          rows={14}
          actions={<CopyButton value={output} what="output" />}
          hint={
            result?.ok ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2
                  className="text-success size-3.5"
                  aria-hidden="true"
                />
                Valid JSON · {output.length.toLocaleString()} characters
              </span>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
