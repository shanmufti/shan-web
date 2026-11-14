"use client";

import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { savePlanResponse, type PlanResponseInput } from "@/lib/actions/plans";
import { cn } from "@/lib/utils";

export const fieldClass =
  "border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export const labelClass = "meta-label text-muted-foreground block";

/** A radio or checkbox drawn as a pill. */
export function ChoicePill({
  type = "radio",
  name,
  value,
  checked,
  disabled,
  onChange,
  children,
  className,
}: Readonly<{
  type?: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <label
      className={cn(
        "border-border hover:bg-muted has-focus-visible:ring-ring/50 inline-flex min-h-9 cursor-pointer items-center justify-center rounded-full border px-3.5 py-1.5 text-sm transition-colors has-focus-visible:ring-3",
        checked &&
          "border-primary bg-primary text-primary-foreground hover:bg-primary",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      {children}
    </label>
  );
}

/** Card shell for one plan section. */
export function PlanCard({
  eyebrow,
  title,
  id,
  children,
}: Readonly<{
  eyebrow: string;
  title: string;
  id: string;
  children: ReactNode;
}>) {
  const headingId = `block-${id}`;
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-tile border-border bg-card text-card-foreground border p-5 shadow-xs sm:p-6"
    >
      <p className="meta-label text-muted-foreground">{eyebrow}</p>
      <h2
        id={headingId}
        className="mt-2 text-xl font-medium tracking-[-0.015em]"
      >
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Save button plus the result message, wired to savePlanResponse. */
export function useSaveResponse(base: Omit<PlanResponseInput, "value">) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const save = (value: unknown, okText: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await savePlanResponse({ ...base, value });
      setMessage(
        "error" in result
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: okText },
      );
    });
  };
  return { pending, message, save };
}

export function SaveRow({
  label,
  pending,
  message,
  disabled,
}: Readonly<{
  label: string;
  pending: boolean;
  message: { kind: "ok" | "error"; text: string } | null;
  disabled?: boolean;
}>) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button type="submit" size="lg" disabled={pending || disabled}>
        {pending ? "Saving…" : label}
      </Button>
      <p
        role={message?.kind === "error" ? "alert" : "status"}
        className={cn(
          "text-sm",
          message?.kind === "error" ? "text-destructive" : "text-success",
        )}
      >
        {message?.text}
      </p>
    </div>
  );
}

export function names(ids: string[], people: Map<string, string>): string {
  return ids.map((id) => people.get(id) ?? "Someone").join(", ");
}

/** "Sat, Dec 5" for a day-only date. */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
