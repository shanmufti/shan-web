"use client";

import { useEffect, useMemo, useState } from "react";

import { decodeJwt, expiryStatus, type ExpiryStatus } from "@/lib/tools/jwt";
import { relativeTime } from "@/lib/tools/time";
import { cn } from "@/lib/utils";

import { buttonClass, CopyButton, Panel, TextField } from "./tool-ui";

// Harmless example: header {"alg":"HS256","typ":"JWT"}, fake signature.
const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkV4YW1wbGUgVXNlciIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAzNjAwfQ.c2lnbmF0dXJlLW5vdC12ZXJpZmllZA";

const TIME_LABEL = {
  iat: "Issued at (iat)",
  nbf: "Not before (nbf)",
  exp: "Expires (exp)",
};

const STATUS: Record<ExpiryStatus, { text: string; className: string }> = {
  expired: { text: "Expired", className: "bg-destructive/10 text-destructive" },
  valid: { text: "Not expired", className: "bg-success/15 text-foreground" },
  "not-yet-valid": {
    text: "Not valid yet",
    className: "bg-warning/20 text-foreground",
  },
  "no-expiry": {
    text: "No expiry claim",
    className: "bg-muted text-foreground",
  },
};

function formatLocal(seconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "long",
  }).format(new Date(seconds * 1000));
}

export function JwtTool() {
  const [token, setToken] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);

  const result = useMemo(
    () => (token.trim() ? decodeJwt(token) : null),
    [token],
  );
  const jwt = result?.ok ? result.jwt : null;
  const header = jwt ? JSON.stringify(jwt.header, null, 2) : "";
  const payload = jwt ? JSON.stringify(jwt.payload, null, 2) : "";
  const status = jwt ? STATUS[expiryStatus(jwt, now)] : null;

  return (
    <div className="space-y-6">
      <TextField
        label="Token"
        value={token}
        onChange={setToken}
        rows={5}
        placeholder="eyJhbGciOi…"
        error={result && !result.ok ? result.error : null}
        hint="Decoding only. The signature is not verified, so don't trust these claims on their own."
        actions={
          <>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setToken(SAMPLE);
              }}
            >
              Sample
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={token === ""}
              onClick={() => {
                setToken("");
              }}
            >
              Clear
            </button>
          </>
        }
      />

      {jwt && status ? (
        <>
          <Panel title="Expiry">
            <p>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-sm font-medium",
                  status.className,
                )}
              >
                {status.text}
              </span>
              <span className="text-muted-foreground ml-2 text-sm">
                Times shown in your local time zone (
                {Intl.DateTimeFormat().resolvedOptions().timeZone}).
              </span>
            </p>
            {jwt.times.length > 0 ? (
              <dl className="mt-3 divide-y">
                {jwt.times.map((t) => (
                  <div
                    key={t.name}
                    className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4"
                  >
                    <dt className="text-muted-foreground w-40 shrink-0 text-sm">
                      {TIME_LABEL[t.name]}
                    </dt>
                    <dd className="text-sm">
                      {formatLocal(t.seconds)}{" "}
                      <span className="text-muted-foreground">
                        ({relativeTime(t.seconds * 1000, now)})
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </Panel>
          <div className="grid gap-6 lg:grid-cols-2">
            <TextField
              label="Header"
              value={header}
              rows={6}
              actions={<CopyButton value={header} what="header" />}
            />
            <TextField
              label="Payload"
              value={payload}
              rows={12}
              actions={<CopyButton value={payload} what="payload" />}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Signature:{" "}
            {jwt.signature
              ? `${String(jwt.signature.length)} characters, not verified.`
              : "none (unsigned token)."}
          </p>
        </>
      ) : null}
    </div>
  );
}
