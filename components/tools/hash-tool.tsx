"use client";

import { useEffect, useId, useState } from "react";

import {
  digestAll,
  HASH_ALGORITHMS,
  type HashAlgorithm,
} from "@/lib/tools/hash";

import {
  buttonClass,
  ErrorText,
  Panel,
  Segmented,
  TextField,
  ValueRow,
} from "./tool-ui";

type Source = "text" | "file";
type Format = "hex" | "base64";
type Digests = Record<HashAlgorithm, { hex: string; base64: string }>;

const MAX_FILE_BYTES = 512 * 1024 * 1024;

function formatBytes(n: number): string {
  if (n < 1024) return `${String(n)} bytes`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

export function HashTool() {
  const uid = useId();
  const [source, setSource] = useState<Source>("text");
  const [format, setFormat] = useState<Format>("hex");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [digests, setDigests] = useState<Digests | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (source === "file" && !file) {
        setDigests(null);
        return;
      }
      setBusy(true);
      try {
        const data =
          file && source === "file"
            ? new Uint8Array(await file.arrayBuffer())
            : text;
        const result = await digestAll(data);
        if (!cancelled) {
          setDigests(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setDigests(null);
          const reason = e instanceof Error ? e.message : String(e);
          setError(
            "subtle" in crypto
              ? `Could not hash: ${reason}`
              : "This browser doesn't offer WebCrypto here (it needs HTTPS).",
          );
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [source, text, file]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Segmented
          label="Input"
          value={source}
          onChange={setSource}
          options={[
            { value: "text", label: "Text" },
            { value: "file", label: "File" },
          ]}
        />
        <Segmented
          label="Output"
          value={format}
          onChange={setFormat}
          options={[
            { value: "hex", label: "Hex" },
            { value: "base64", label: "Base64" },
          ]}
        />
      </div>

      {source === "text" ? (
        <TextField
          label="Text"
          value={text}
          onChange={setText}
          rows={6}
          hint="Hashed as UTF-8 exactly as typed, including spaces and line breaks."
          actions={
            <button
              type="button"
              className={buttonClass}
              disabled={text === ""}
              onClick={() => {
                setText("");
              }}
            >
              Clear
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${uid}-file`} className="text-sm font-medium">
            File
          </label>
          <input
            id={`${uid}-file`}
            type="file"
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              if (picked && picked.size > MAX_FILE_BYTES) {
                setFile(null);
                setError(
                  `That file is ${formatBytes(picked.size)}. The limit here is 512 MB.`,
                );
                return;
              }
              setError(null);
              setFile(picked);
            }}
            className="file:border-border file:bg-background hover:file:bg-muted text-sm file:mr-3 file:h-9 file:rounded-md file:border file:px-3 file:text-sm file:font-medium"
          />
          <p className="text-muted-foreground text-xs">
            The file is read in this tab only; it is not uploaded.
            {file ? ` ${file.name}, ${formatBytes(file.size)}.` : ""}
          </p>
        </div>
      )}
      <ErrorText error={error} />

      <Panel title="Digests">
        <p className="sr-only" aria-live="polite">
          {busy ? "Hashing…" : ""}
        </p>
        {digests ? (
          <dl>
            {HASH_ALGORITHMS.map((a) => (
              <ValueRow key={a} label={a} value={digests[a][format]} />
            ))}
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">
            {busy ? "Hashing…" : "Choose a file to hash."}
          </p>
        )}
        <p className="text-muted-foreground mt-3 text-xs">
          SHA-1 is broken for security uses; prefer SHA-256 or stronger.
          Computed with WebCrypto.
        </p>
      </Panel>
    </div>
  );
}
