"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { NANOID_ALPHABET, nanoid, uuidV4, uuidV7 } from "@/lib/tools/ids";

import {
  Checkbox,
  CopyButton,
  ErrorText,
  inputClass,
  Panel,
  primaryButtonClass,
  Segmented,
  TextField,
} from "./tool-ui";

type Kind = "v4" | "v7" | "nanoid";

const ALPHABETS = {
  default: { label: "URL-safe (A-Z a-z 0-9 _ -)", value: NANOID_ALPHABET },
  alnum: {
    label: "Letters and digits",
    value: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  },
  lowerHex: { label: "Hex (0-9 a-f)", value: "0123456789abcdef" },
  digits: { label: "Digits", value: "0123456789" },
  custom: { label: "Custom", value: "" },
} as const;
type AlphabetKey = keyof typeof ALPHABETS;

const KIND_HELP: Record<Kind, string> = {
  v4: "UUID v4: 122 random bits. The usual choice for an ID.",
  v7: "UUID v7: starts with the current time in milliseconds, so IDs sort by creation time. Good for database keys.",
  nanoid:
    "nanoid: shorter random IDs from a chosen alphabet. 21 URL-safe characters is about as unique as a UUID v4.",
};

export function UuidTool() {
  const uid = useId();
  const [kind, setKind] = useState<Kind>("v4");
  const [count, setCount] = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [size, setSize] = useState(21);
  const [alphabetKey, setAlphabetKey] = useState<AlphabetKey>("default");
  const [custom, setCustom] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(() => {
    try {
      const n = Math.min(Math.max(Math.trunc(count) || 1, 1), 500);
      const alphabet =
        alphabetKey === "custom" ? custom : ALPHABETS[alphabetKey].value;
      const list = Array.from({ length: n }, () => {
        if (kind === "nanoid") return nanoid(size, alphabet);
        const id = kind === "v4" ? uuidV4() : uuidV7();
        return uppercase ? id.toUpperCase() : id;
      });
      setIds(list);
      setError(null);
    } catch (e) {
      setIds([]);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [alphabetKey, count, custom, kind, size, uppercase]);

  const output = ids.join("\n");

  return (
    <div className="space-y-6">
      <Panel>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            generate();
          }}
        >
          <Segmented
            label="Type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "v4", label: "UUID v4" },
              { value: "v7", label: "UUID v7" },
              { value: "nanoid", label: "nanoid" },
            ]}
          />
          <p className="text-muted-foreground text-sm">{KIND_HELP[kind]}</p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex w-28 flex-col gap-2">
              <label htmlFor={`${uid}-count`} className="text-sm font-medium">
                How many
              </label>
              <input
                id={`${uid}-count`}
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => {
                  setCount(Number(e.target.value));
                }}
                className={`${inputClass} h-10`}
              />
            </div>
            {kind === "nanoid" ? (
              <>
                <div className="flex w-28 flex-col gap-2">
                  <label
                    htmlFor={`${uid}-size`}
                    className="text-sm font-medium"
                  >
                    Length
                  </label>
                  <input
                    id={`${uid}-size`}
                    type="number"
                    min={1}
                    max={256}
                    value={size}
                    onChange={(e) => {
                      setSize(Number(e.target.value));
                    }}
                    className={`${inputClass} h-10`}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <label
                    htmlFor={`${uid}-alpha`}
                    className="text-sm font-medium"
                  >
                    Alphabet
                  </label>
                  <select
                    id={`${uid}-alpha`}
                    value={alphabetKey}
                    onChange={(e) => {
                      setAlphabetKey(e.target.value as AlphabetKey);
                    }}
                    className={`${inputClass} h-10`}
                  >
                    {Object.entries(ALPHABETS).map(([key, a]) => (
                      <option key={key} value={key}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                {alphabetKey === "custom" ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <label
                      htmlFor={`${uid}-custom`}
                      className="text-sm font-medium"
                    >
                      Custom alphabet
                    </label>
                    <input
                      id={`${uid}-custom`}
                      value={custom}
                      onChange={(e) => {
                        setCustom(e.target.value);
                      }}
                      placeholder="e.g. abcdef123456"
                      spellCheck={false}
                      className={`${inputClass} h-10 font-mono`}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <Checkbox
                label="Uppercase"
                checked={uppercase}
                onChange={setUppercase}
              />
            )}
          </div>
          <button type="submit" className={`${primaryButtonClass} h-10`}>
            <RefreshCw aria-hidden="true" />
            Generate
          </button>
          <ErrorText error={error} />
        </form>
      </Panel>
      <TextField
        label={`Generated (${String(ids.length)})`}
        value={output}
        rows={Math.min(Math.max(ids.length, 5), 16)}
        actions={<CopyButton value={output} label="Copy all" />}
        hint="Generated with your browser's secure random number generator (crypto.getRandomValues)."
      />
    </div>
  );
}
