import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { HUB_DETAIL } from "./page-transition";

export interface Crumb {
  label: string;
  href?: string | undefined;
}

/**
 * Trail of parent pages above a detail page's title. The last crumb is the
 * current page and is not a link.
 */
export function Breadcrumbs({
  items,
  className,
}: Readonly<{ items: Crumb[]; className?: string }>) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="meta-label text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${String(index)}`}
              className="inline-flex min-w-0 items-center gap-1.5"
            >
              {item.href && !last ? (
                <Link
                  transitionTypes={HUB_DETAIL}
                  href={item.href}
                  className="hover:text-foreground underline-offset-4 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(last && "text-foreground truncate")}
                >
                  {item.label}
                </span>
              )}
              {last ? null : (
                <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
