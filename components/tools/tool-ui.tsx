"use client";

import { Check, Copy } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export const inputClass =
  "border-input bg-background focus-visible:ring-ring/50 focus-visible:border-ring w-full min-w-0 rounded-md border px-3 text-base outline-none focus-visible:ring-3 aria-invalid:border-destructive sm:text-sm";

export const monoAreaClass = cn(
  inputClass,
  "min-h-40 resize-y py-2 font-mono leading-relaxed",
);

export const buttonClass =
  "border-border bg-background hover:bg-muted focus-visible:ring-ring/50 focus-visible:border-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

export const primaryButtonClass = cn(
  buttonClass,
  "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent",
);

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

/** Labelled monospace textarea with an optional toolbar on the right. */
export function TextField({
  label,
  value,
  onChange,
  error,
  actions,
  hint,
  className,
  ...props
}: Readonly<
  {
    label: string;
    value: string;
    onChange?: (value: string) => void;
    error?: string | null | undefined;
    actions?: ReactNode;
    hint?: ReactNode;
  } & Omit<ComponentProps<"textarea">, "value" | "onChange">
>) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <textarea
        id={id}
        value={value}
        onChange={
          onChange
            ? (e) => {
                onChange(e.target.value);
              }
            : undefined
        }
        readOnly={!onChange}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(monoAreaClass, !onChange && "bg-muted/40")}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      <ErrorText id={errorId} error={error} />
    </div>
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

export interface Choice<T extends string> {
  value: T;
  label: string;
}

/** Radio group styled as a segmented control; arrow keys move between options. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
}: Readonly<{
  label: string;
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
}>) {
  const name = useId();
  return (
    <fieldset className="flex min-w-0 flex-wrap items-center gap-2">
      <legend className="sr-only">{label}</legend>
      {hideLabel ? null : (
        <span aria-hidden="true" className="text-sm font-medium">
          {label}
        </span>
      )}
      <div className="bg-muted inline-flex flex-wrap rounded-md p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className="has-[:checked]:bg-background has-[:checked]:text-foreground text-muted-foreground has-[:focus-visible]:ring-ring/50 relative cursor-pointer rounded-[5px] px-3 py-1 text-sm has-[:checked]:shadow-sm has-[:focus-visible]:ring-3"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value);
              }}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
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
