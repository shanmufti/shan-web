"use client";

import { ArrowDownUp } from "lucide-react";
import { useMemo, useState } from "react";

import { base64Decode, base64Encode } from "@/lib/tools/encoding";

import {
  buttonClass,
  Checkbox,
  CopyButton,
  Segmented,
  TextField,
} from "./tool-ui";

type Mode = "encode" | "decode";

export function Base64Tool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    if (input === "") return null;
    return mode === "encode"
      ? { ok: true as const, output: base64Encode(input, urlSafe) }
      : base64Decode(input);
  }, [input, mode, urlSafe]);
  const output = result?.ok ? result.output : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Segmented
          label="Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "encode", label: "Encode" },
            { value: "decode", label: "Decode" },
          ]}
        />
        {mode === "encode" ? (
          <Checkbox
            label="URL-safe (- and _, no padding)"
            checked={urlSafe}
            onChange={setUrlSafe}
          />
        ) : null}
        <button
          type="button"
          className={buttonClass}
          disabled={!result?.ok || output === ""}
          onClick={() => {
            setMode(mode === "encode" ? "decode" : "encode");
            setInput(output);
          }}
        >
          <ArrowDownUp aria-hidden="true" />
          Swap
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <TextField
          label={mode === "encode" ? "Text" : "Base64"}
          value={input}
          onChange={setInput}
          rows={10}
          error={result && !result.ok ? result.error : null}
          hint={
            mode === "decode"
              ? "Accepts standard and URL-safe Base64, with or without padding. Text is read as UTF-8."
              : "Text is encoded as UTF-8."
          }
          actions={
            <button
              type="button"
              className={buttonClass}
              disabled={input === ""}
              onClick={() => {
                setInput("");
              }}
            >
              Clear
            </button>
          }
        />
        <TextField
          label={mode === "encode" ? "Base64" : "Text"}
          value={output}
          rows={10}
          actions={<CopyButton value={output} what="output" />}
        />
      </div>
    </div>
  );
}
