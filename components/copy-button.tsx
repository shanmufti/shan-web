"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Copies text to the clipboard; `label` names what's copied for screen readers. */
export function CopyButton({
  text,
  label,
  children,
}: Readonly<{ text: string; label: string; children?: string }>) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="border-border bg-background text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs outline-none focus-visible:ring-3"
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      <span aria-live="polite">{copied ? "Copied" : (children ?? "Copy")}</span>
    </button>
  );
}
