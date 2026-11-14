"use client";

import { useId, useState, type SyntheticEvent } from "react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { encryptSecret } from "@/lib/secret-crypto";
import {
  MAX_SECRET_BYTES,
  SECRET_EXPIRY_OPTIONS,
  type SecretExpiry,
} from "@/lib/secret-options";

const labelClass =
  "text-muted-foreground block text-xs tracking-wide uppercase";
const inputClass =
  "border-input bg-background focus-visible:ring-ring/40 mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

interface Created {
  link: string;
  expiresAt: string;
  withPassphrase: boolean;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function SecretCreateForm() {
  const id = useId();
  const [text, setText] = useState("");
  const [expiresIn, setExpiresIn] = useState<SecretExpiry>("1d");
  const [passphrase, setPassphrase] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const bytes = new TextEncoder().encode(text).length;
  const tooLong = bytes > MAX_SECRET_BYTES;

  async function onSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    setError(null);
    if (text.trim() === "") {
      setError("Write the secret first.");
      return;
    }
    if (tooLong) {
      setError("That's over the 10 KB limit.");
      return;
    }
    setPending(true);
    try {
      const { payload, key } = await encryptSecret(text, passphrase);
      const response = await fetch("/tools/secret/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, expiresIn }),
      });
      const result = (await response.json()) as {
        id?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!response.ok || !result.id || !result.expiresAt) {
        setError(result.error ?? "Couldn't save the secret. Try again.");
        return;
      }
      setCreated({
        link: `${window.location.origin}/s/${result.id}#${key}`,
        expiresAt: result.expiresAt,
        withPassphrase: passphrase !== "",
      });
      setText("");
      setPassphrase("");
    } catch {
      setError("Couldn't encrypt or save the secret. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <div
        className="border-border bg-card rounded-lg border p-5"
        role="status"
      >
        <h2 className="text-lg font-medium">Link ready</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          It opens once, then the secret is deleted. Unopened, it expires{" "}
          {formatWhen(created.expiresAt)}.
          {created.withPassphrase
            ? " Send the passphrase some other way."
            : null}
        </p>
        <div className="bg-muted mt-4 flex flex-wrap items-center gap-3 rounded-md p-3">
          <code className="min-w-0 flex-1 text-xs break-all">
            {created.link}
          </code>
          <CopyButton text={created.link} label="secret link" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-5"
          onClick={() => {
            setCreated(null);
          }}
        >
          Make another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="border-border bg-card grid gap-5 rounded-lg border p-5 sm:grid-cols-2"
      noValidate
    >
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-text`} className={labelClass}>
          Secret
        </label>
        <textarea
          id={`${id}-text`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
          rows={6}
          required
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${id}-count`}
          className={`${inputClass} font-mono`}
        />
        <p
          id={`${id}-count`}
          className={
            tooLong
              ? "text-destructive mt-1 text-xs"
              : "text-muted-foreground mt-1 text-xs"
          }
        >
          {(bytes / 1000).toFixed(1)} of 10 KB
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-expiry`} className={labelClass}>
          Expires after
        </label>
        <select
          id={`${id}-expiry`}
          value={expiresIn}
          onChange={(e) => {
            setExpiresIn(e.target.value as SecretExpiry);
          }}
          className={inputClass}
        >
          {SECRET_EXPIRY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-pass`} className={labelClass}>
          Passphrase (optional)
        </label>
        <input
          id={`${id}-pass`}
          type="password"
          value={passphrase}
          onChange={(e) => {
            setPassphrase(e.target.value);
          }}
          autoComplete="new-password"
          aria-describedby={`${id}-pass-hint`}
          className={inputClass}
        />
        <p
          id={`${id}-pass-hint`}
          className="text-muted-foreground mt-1 text-xs"
        >
          Adds a second lock. Send it separately from the link.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Encrypting…" : "Create link"}
        </Button>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
