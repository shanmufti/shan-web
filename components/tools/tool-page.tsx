import { ChevronLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { TOOLS, type ToolEntry } from "@/lib/tools-registry";

function toolBySlug(slug: string): ToolEntry {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool)
    throw new Error(
      `Unknown tool "${slug}" (add it to lib/tools-registry.ts).`,
    );
  return tool;
}

/** Page metadata for /tools/<slug>, from the registry entry. */
export function toolMetadata(slug: string): Metadata {
  const tool = toolBySlug(slug);
  return {
    title: tool.title,
    description: tool.description,
    alternates: { canonical: tool.href },
    openGraph: {
      title: tool.title,
      description: tool.description,
      url: tool.href,
    },
  };
}

/** Shared frame for every browser-only tool page. */
export function ToolPage({
  slug,
  children,
}: Readonly<{ slug: string; children: ReactNode }>) {
  const tool = toolBySlug(slug);
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16 lg:px-10">
      <Link
        href="/tools"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-3"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Tools
      </Link>
      <header className="mt-4">
        <h1 className="font-heading text-[clamp(2rem,4vw,3rem)]">
          {tool.title}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          {tool.description}
        </p>
        <p className="text-muted-foreground mt-3 flex items-start gap-2 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Runs in your browser. Nothing you enter is sent to a server.
        </p>
      </header>
      <div className="mt-8">{children}</div>
    </div>
  );
}
