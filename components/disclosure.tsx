"use client";

import { useState, type ReactNode } from "react";

/**
 * <details> whose open state belongs to the visitor: a server re-render
 * (e.g. after a form saves) doesn't snap it shut.
 */
export function Disclosure({
  summary,
  defaultOpen = false,
  className,
  children,
}: Readonly<{
  summary: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}>) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
      className={`bg-card ring-foreground/10 rounded-xl ring-1 ${className ?? ""}`}
    >
      <summary className="focus-visible:ring-ring cursor-pointer rounded-xl px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2">
        {summary}
      </summary>
      <div className="border-border border-t p-4">{children}</div>
    </details>
  );
}
