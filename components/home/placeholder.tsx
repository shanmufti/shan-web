import { cn } from "@/lib/utils";

/**
 * Text Shan still has to write. Bracketed, mono and underlined with a
 * dashed line so it reads as a placeholder, never as real copy.
 */
export function Placeholder({
  children,
  className,
}: Readonly<{ children: string; className?: string }>) {
  return (
    <span
      data-placeholder=""
      className={cn(
        "decoration-muted-foreground/60 font-mono text-[0.9em] tracking-tight underline decoration-dashed underline-offset-4",
        className,
      )}
    >
      {children}
    </span>
  );
}
