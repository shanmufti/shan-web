"use client";

import { ArrowDownUp } from "lucide-react";
import { useMemo, useState } from "react";

import {
  queryParams,
  urlDecode,
  urlEncode,
  type UrlMode,
} from "@/lib/tools/encoding";

import {
  buttonClass,
  Checkbox,
  CopyButton,
  Panel,
  Segmented,
  TextField,
} from "./tool-ui";

type Direction = "encode" | "decode";

export function UrlTool() {
  const [direction, setDirection] = useState<Direction>("encode");
  const [mode, setMode] = useState<UrlMode>("component");
  const [plusAsSpace, setPlusAsSpace] = useState(true);
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    if (input === "") return null;
    return direction === "encode"
      ? { ok: true as const, output: urlEncode(input, mode) }
      : urlDecode(input, { mode, plusAsSpace });
  }, [direction, input, mode, plusAsSpace]);
  const output = result?.ok ? result.output : "";

  const params = useMemo(() => {
    const decoded = direction === "decode" ? output : input;
    return decoded ? queryParams(decoded) : null;
  }, [direction, input, output]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Segmented
          label="Mode"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "encode", label: "Encode" },
            { value: "decode", label: "Decode" },
          ]}
        />
        <Segmented
          label="Treat as"
          value={mode}
          onChange={setMode}
          options={[
            { value: "component", label: "Component" },
            { value: "uri", label: "Full URL" },
          ]}
        />
        {direction === "decode" ? (
          <Checkbox
            label="+ means space"
            checked={plusAsSpace}
            onChange={setPlusAsSpace}
          />
        ) : null}
        <button
          type="button"
          className={buttonClass}
          disabled={!result?.ok || output === ""}
          onClick={() => {
            setDirection(direction === "encode" ? "decode" : "encode");
            setInput(output);
          }}
        >
          <ArrowDownUp aria-hidden="true" />
          Swap
        </button>
      </div>
      <p className="text-muted-foreground text-sm">
        {mode === "component"
          ? "Component encodes every reserved character (/, ?, &, = …), for a single query value or path segment."
          : "Full URL keeps the characters that give a URL its structure (:/?#&=) and encodes the rest."}
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <TextField
          label={direction === "encode" ? "Text" : "Encoded"}
          value={input}
          onChange={setInput}
          rows={8}
          error={result && !result.ok ? result.error : null}
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
          label={direction === "encode" ? "Encoded" : "Text"}
          value={output}
          rows={8}
          actions={<CopyButton value={output} what="output" />}
        />
      </div>
      {params && params.length > 0 ? (
        <Panel title="Query parameters">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-1 pr-4 font-medium">
                    Name
                  </th>
                  <th scope="col" className="py-1 font-medium">
                    Value (decoded)
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {params.map(([name, value], i) => (
                  <tr key={`${name}-${String(i)}`} className="border-t">
                    <td className="py-1.5 pr-4 align-top break-all">{name}</td>
                    <td className="py-1.5 align-top break-all">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
