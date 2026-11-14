"use client";

import { ArrowDownUp } from "lucide-react";
import { useMemo, useState } from "react";

import { jsonToYaml, yamlToJson } from "@/lib/tools/yaml";

import { buttonClass, CopyButton, Segmented, TextField } from "./tool-ui";

type Direction = "yaml-to-json" | "json-to-yaml";

const SAMPLES: Record<Direction, string> = {
  "yaml-to-json": `service: api
replicas: 2
ports:
  - 80
  - 443
env:
  DEBUG: false
`,
  "json-to-yaml": `{"service":"api","replicas":2,"ports":[80,443],"env":{"DEBUG":false}}`,
};

export function YamlJsonTool() {
  const [direction, setDirection] = useState<Direction>("yaml-to-json");
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    if (input.trim() === "") return null;
    return direction === "yaml-to-json" ? yamlToJson(input) : jsonToYaml(input);
  }, [direction, input]);
  const output = result?.ok ? result.output : "";

  const from = direction === "yaml-to-json" ? "YAML" : "JSON";
  const to = direction === "yaml-to-json" ? "JSON" : "YAML";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Convert"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "yaml-to-json", label: "YAML → JSON" },
            { value: "json-to-yaml", label: "JSON → YAML" },
          ]}
        />
        <button
          type="button"
          className={buttonClass}
          disabled={!result?.ok}
          onClick={() => {
            setDirection(
              direction === "yaml-to-json" ? "json-to-yaml" : "yaml-to-json",
            );
            setInput(output);
          }}
        >
          <ArrowDownUp aria-hidden="true" />
          Use output as input
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <TextField
          label={`${from} input`}
          value={input}
          onChange={setInput}
          rows={14}
          error={result && !result.ok ? result.error : null}
          hint={
            direction === "yaml-to-json"
              ? "Several documents separated by --- become a JSON array."
              : undefined
          }
          actions={
            <>
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setInput(SAMPLES[direction]);
                }}
              >
                Sample
              </button>
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
            </>
          }
        />
        <TextField
          label={`${to} output`}
          value={output}
          rows={14}
          actions={<CopyButton value={output} what="output" />}
        />
      </div>
    </div>
  );
}
