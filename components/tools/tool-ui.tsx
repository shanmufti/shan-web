"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const inputClass =
  "border-input bg-background focus-visible:ring-ring/50 focus-visible:border-ring w-full min-w-0 rounded-md border px-3 text-base outline-none focus-visible:ring-3 aria-invalid:border-destructive sm:text-sm";

export const monoAreaClass = cn(
  inputClass,
  "min-h-40 resize-y py-2 font-mono leading-relaxed",
);

export const buttonClass =
  "border-border bg-background hover:bg-muted focus-visible:ring-ring/50 focus-visible:border-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const COPY_TEXT = {
  idle: null,
  copied: "Copied",
  failed: "Copy failed",
} as const;

const COPY_ANNOUNCEMENT = {
  idle: "",
  copied: "Copied to clipboard",
  failed: "Copy failed. Select the text and copy it manually.",
} as const;

/**
 * Copies `value`; announces the result to screen readers. `what` names the
 * value for assistive tech, e.g. "SHA-256" gives "Copy SHA-256".
 */
export function CopyButton({
  value,
  label = "Copy",
  what,
  className,
}: Readonly<{
  value: string;
  label?: string;
  what?: string;
  className?: string;
}>) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setStatus("idle");
    }, 2000);
  }

  const text = COPY_TEXT[status] ?? label;
  return (
    <>
      <button
        type="button"
        onClick={() => void copy()}
        disabled={value === ""}
        aria-label={what ? `${text} ${what}` : undefined}
        className={cn(buttonClass, "h-8 px-2.5 text-xs", className)}
      >
        {status === "copied" ? (
          <Check aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
        <span>{text}</span>
      </button>
      <span role="status" className="sr-only">
        {COPY_ANNOUNCEMENT[status]}
      </span>
    </>
  );
}

export function ErrorText({
  id,
  error,
}: Readonly<{ id?: string; error?: string | null | undefined }>) {
  // Always rendered so screen readers announce changes.
  return (
    <p
      id={id}
      aria-live="polite"
      className="text-destructive text-sm empty:hidden"
    >
      {error ?? ""}
    </p>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
        className="accent-primary size-4"
      />
      {label}
    </label>
  );
}

/** Read-only value row with a copy button (for hashes, IDs, times). */
export function ValueRow({
  label,
  value,
  mono = true,
}: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div className="border-border flex flex-col gap-1 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <dt className="text-muted-foreground w-40 shrink-0 text-sm">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 text-sm break-all",
            mono && "font-mono",
          )}
        >
          {value}
        </span>
        <CopyButton value={value} what={label} className="shrink-0" />
      </dd>
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
}: Readonly<{ title?: string; children: ReactNode; className?: string }>) {
  return (
    <section
      className={cn("border-border rounded-lg border p-4 sm:p-5", className)}
    >
      {title ? (
        <h2 className="mb-3 text-base font-semibold tracking-tight">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
