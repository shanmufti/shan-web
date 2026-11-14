"use client";

import { useState } from "react";

import { BentoGrid, BentoTile } from "@/components/ui/bento";
import {
  TOOL_CATEGORIES,
  type ToolCategory,
  type ToolEntry,
} from "@/lib/tools-registry";
import { cn } from "@/lib/utils";

function categoryLabel(key: ToolCategory): string {
  return TOOL_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/** Tools this visitor can open, with category chips that filter in place. */
export function ToolDirectory({ tools }: Readonly<{ tools: ToolEntry[] }>) {
  const [category, setCategory] = useState<ToolCategory | null>(null);
  // Only offer chips that have something in them for this visitor.
  const categories = TOOL_CATEGORIES.filter((c) =>
    tools.some((t) => t.category === c.key),
  );
  const shown = category ? tools.filter((t) => t.category === category) : tools;
  const chips = [{ key: null, label: "All" }, ...categories];

  return (
    <>
      {categories.length > 1 ? (
        <div
          role="group"
          aria-label="Filter tools by category"
          className="flex flex-wrap gap-2"
        >
          {chips.map((chip) => {
            const active = chip.key === category;
            return (
              <button
                key={chip.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setCategory(chip.key);
                }}
                className={cn(
                  "focus-visible:ring-ring/50 inline-flex h-8 items-center rounded-full border px-3.5 text-sm transition-colors outline-none focus-visible:ring-3",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <BentoGrid columns={3} className="mt-5 auto-rows-[minmax(9rem,auto)]">
        {shown.map((tool) => (
          <BentoTile
            key={tool.slug}
            eyebrow={categoryLabel(tool.category)}
            title={tool.title}
            description={tool.description}
            href={tool.href}
            layout="flow"
          />
        ))}
      </BentoGrid>
    </>
  );
}
