import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { visibleTools } from "@/lib/site-access";
import {
  isToolCategory,
  TOOL_CATEGORIES,
  type ToolCategory,
} from "@/lib/tools-registry";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tools" };

function categoryLabel(key: ToolCategory): string {
  return TOOL_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export default async function ToolsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { category: raw } = await searchParams;
  const category = isToolCategory(raw) ? raw : null;
  const tools = await visibleTools();
  // Only offer filters that have something in them for this visitor.
  const categories = TOOL_CATEGORIES.filter((c) =>
    tools.some((t) => t.category === c.key),
  );
  const shown = category ? tools.filter((t) => t.category === category) : tools;

  const filters = [{ key: null, label: "All" }, ...categories];

  return (
    <div className="mx-auto max-w-7xl px-6 pb-8 lg:px-10">
      <PageHeader eyebrow="Tools" title="Tools" lede="[Intro: Shan to write]" />

      {categories.length > 1 ? (
        <nav aria-label="Filter by category">
          <ul className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = filter.key === category;
              return (
                <li key={filter.label}>
                  <Link
                    href={
                      filter.key ? `/tools?category=${filter.key}` : "/tools"
                    }
                    aria-current={active ? "page" : undefined}
                    scroll={false}
                    className={cn(
                      "focus-visible:ring-ring/50 inline-flex h-8 items-center rounded-full border px-3.5 text-sm transition-colors outline-none focus-visible:ring-3",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
                    )}
                  >
                    {filter.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      {shown.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((tool) => (
            <li key={tool.slug}>
              <Link
                href={tool.href}
                className="group border-border bg-card hover:border-foreground/30 focus-visible:ring-ring/50 flex h-full flex-col rounded-lg border p-5 transition-colors outline-none focus-visible:ring-3"
              >
                <span className="meta-label text-muted-foreground">
                  {categoryLabel(tool.category)}
                </span>
                <span className="mt-2 flex items-start justify-between gap-3 text-lg font-medium">
                  {tool.title}
                  <ArrowUpRight
                    className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition-colors"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-muted-foreground mt-1 text-sm">
                  {tool.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-8 text-sm">Nothing here yet.</p>
      )}
    </div>
  );
}
