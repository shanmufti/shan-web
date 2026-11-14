import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  eventLabel,
  formatDay,
  relativeDays,
  type VaultEvent,
} from "@/lib/vault";

/** Renewals and expiries as a dated list linking to each record. */
export function VaultEventList({ events }: Readonly<{ events: VaultEvent[] }>) {
  return (
    <ul className="divide-border border-border mt-3 divide-y border-y">
      {events.map((event) => (
        <li key={`${String(event.record.id)}-${event.kind}`}>
          <Link
            href={`/vault/records/${String(event.record.id)}`}
            className="hover:bg-muted/60 focus-visible:ring-ring/50 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2 py-3 outline-none focus-visible:ring-3"
          >
            <span className="min-w-0">
              <span className="font-medium">{event.record.title}</span>
              <span className="text-muted-foreground ml-2 text-sm">
                {eventLabel(event.kind)}
              </span>
            </span>
            <span className="text-sm tabular-nums">
              {formatDay(event.date)}{" "}
              <span
                className={cn(
                  event.daysAway < 0
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                ({relativeDays(event.daysAway)})
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
