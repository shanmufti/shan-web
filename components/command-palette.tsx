"use client";

import {
  ArrowRight,
  BookOpen,
  Code,
  CornerDownLeft,
  Map as MapIcon,
  MapPin,
  Moon,
  Search,
  Sparkles,
  Waves,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import type { SearchGroup, SearchItem } from "@/lib/search-index";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Entry =
  | (SearchItem & { kind: "link" })
  | { kind: "theme"; group: "Actions"; title: string; hint?: string };

type EntryGroup = SearchGroup | "Actions";

const GROUP_ORDER: EntryGroup[] = [
  "Pages",
  "Journeys",
  "Stories",
  "Places",
  "Dives",
  "Tech notes",
  "Hobbies",
  "Tools",
  "Actions",
];

const GROUP_ICON: Record<EntryGroup, typeof ArrowRight> = {
  Pages: ArrowRight,
  Journeys: MapIcon,
  Stories: BookOpen,
  Places: MapPin,
  Dives: Waves,
  "Tech notes": Code,
  Hobbies: Sparkles,
  Tools: Wrench,
  Actions: Moon,
};

/** Rank: title starts with query, a word starts with it, contains it, hint. */
function score(entry: Entry, query: string): number {
  const title = entry.title.toLowerCase();
  if (title.startsWith(query)) return 0;
  if (title.split(/[\s\-–—:]+/).some((w) => w.startsWith(query))) return 1;
  if (title.includes(query)) return 2;
  const keywords = "keywords" in entry ? (entry.keywords ?? "") : "";
  const extra = `${entry.group} ${entry.hint ?? ""} ${keywords}`.toLowerCase();
  return extra.includes(query) ? 3 : -1;
}

function filterEntries(entries: Entry[], raw: string): Entry[] {
  const query = raw.trim().toLowerCase();
  if (!query) {
    // Empty: pages and actions, plus the latest few of each content group.
    const perGroup = new Map<string, number>();
    return entries.filter((e) => {
      if (e.group === "Pages" || e.group === "Actions") return true;
      const n = (perGroup.get(e.group) ?? 0) + 1;
      perGroup.set(e.group, n);
      return n <= 3;
    });
  }
  return entries
    .map((entry, index) => ({ entry, index, s: score(entry, query) }))
    .filter((r) => r.s >= 0)
    .sort((a, b) => a.s - b.s || a.index - b.index)
    .slice(0, 40)
    .map((r) => r.entry);
}

/** Groups in display order, each entry tagged with its keyboard index. */
function groupEntries(entries: Entry[]) {
  let index = 0;
  return GROUP_ORDER.map((group) => ({
    group,
    entries: entries
      .filter((e) => e.group === group)
      .map((entry) => ({ entry, index: index++ })),
  })).filter((g) => g.entries.length > 0);
}

function isDarkNow() {
  return document.documentElement.classList.contains("dark");
}

/**
 * Cmd+K palette. Native <dialog> gives the focus trap, Escape and inert
 * background; the input is an ARIA combobox over a grouped listbox.
 * Items come from /search-index, which only returns what this visitor can
 * open, so nothing private is ever shipped to the browser.
 */
export function CommandPalette({ onClose }: Readonly<{ onClose: () => void }>) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [dark] = useState(isDarkNow);
  const id = useId();

  // Mounted only while open: show the modal, close on a backdrop click, and
  // load the index fresh (it changes when someone unlocks or logs in).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialog.open) dialog.showModal();
    inputRef.current?.focus();
    const onBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) onClose();
    };
    dialog.addEventListener("click", onBackdrop);

    const controller = new AbortController();
    fetch("/search-index", {
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<{ items: SearchItem[] }>;
      })
      .then((data) => {
        setItems(data.items);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setFailed(true);
      });
    return () => {
      dialog.removeEventListener("click", onBackdrop);
      controller.abort();
      // No dialog.close() here: its async "close" event would call onClose
      // again after a remount. The dialog leaves with the component; put
      // focus back where it was.
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [onClose]);

  const entries = useMemo<Entry[]>(() => {
    const links: Entry[] = (items ?? []).map((item) => ({
      ...item,
      kind: "link",
    }));
    return [
      ...links,
      {
        kind: "theme",
        group: "Actions",
        title: dark ? "Switch to light theme" : "Switch to dark theme",
      },
    ];
  }, [items, dark]);

  const results = useMemo(
    () => filterEntries(entries, query),
    [entries, query],
  );
  const groups = useMemo(() => groupEntries(results), [results]);
  // Visual order (grouped) is the keyboard order.
  const ordered = useMemo(
    () => groups.flatMap((g) => g.entries.map((e) => e.entry)),
    [groups],
  );
  const activeIndex = Math.min(active, Math.max(0, ordered.length - 1));
  const optionId = (index: number) => `${id}-option-${String(index)}`;

  // Keep the active option in view while arrowing.
  useEffect(() => {
    const el = document.getElementById(optionId(activeIndex));
    el?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const choose = useCallback(
    (entry: Entry | undefined) => {
      if (!entry) return;
      if (entry.kind === "theme") {
        const next = !isDarkNow();
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
        } catch {
          // Storage blocked: the theme still applies to this page.
        }
        onClose();
        return;
      }
      onClose();
      router.push(entry.href);
    },
    [onClose, router],
  );

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const last = ordered.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive(activeIndex >= last ? 0 : activeIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive(activeIndex <= 0 ? last : activeIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(last);
        break;
      case "Enter":
        event.preventDefault();
        choose(ordered[activeIndex]);
        break;
      default:
        break;
    }
  }

  let status = `${String(results.length)} results`;
  if (failed) status = "Search is unavailable right now.";
  else if (items === null) status = "Loading…";
  else if (results.length === 0) status = "No matches.";

  return (
    <dialog
      ref={dialogRef}
      aria-label="Search the site"
      onClose={onClose}
      className="dialog-backdrop bg-popover text-popover-foreground ring-border open:animate-pop-in backdrop:animate-fade-in fixed inset-x-0 top-[12vh] mx-auto mt-0 w-[min(40rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-2xl p-0 shadow-lg ring-1"
    >
      <div className="border-border flex items-center gap-3 border-b px-4">
        <Search
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={
            ordered.length > 0 ? optionId(activeIndex) : undefined
          }
          aria-label="Search pages, journeys, stories, dives and tech notes"
          placeholder="Jump to…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          className="placeholder:text-muted-foreground h-14 min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none"
        />
        <kbd className="text-muted-foreground border-border hidden rounded-md border px-1.5 py-0.5 text-[0.7rem] sm:inline-block">
          Esc
        </kbd>
      </div>

      <div
        id={`${id}-list`}
        role="listbox"
        aria-label="Results"
        className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain p-2"
      >
        {groups.map(({ group, entries: groupItems }) => {
          const Icon = GROUP_ICON[group];
          const headingId = `${id}-group-${group.replace(/\s/g, "-")}`;
          return (
            <div key={group} role="group" aria-labelledby={headingId}>
              <div
                id={headingId}
                role="presentation"
                className="eyebrow text-muted-foreground px-3 pt-3 pb-1.5 text-[0.7rem]"
              >
                {group}
              </div>
              {groupItems.map(({ entry, index }) => {
                const selected = index === activeIndex;
                return (
                  <div
                    key={
                      entry.kind === "link"
                        ? entry.href
                        : `${entry.kind}-${entry.title}`
                    }
                    id={optionId(index)}
                    role="option"
                    tabIndex={-1}
                    aria-selected={selected}
                    onMouseMove={() => {
                      if (!selected) setActive(index);
                    }}
                    onMouseDown={(event) => {
                      // Keep focus in the input.
                      event.preventDefault();
                    }}
                    onClick={() => {
                      choose(entry);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") choose(entry);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem]",
                      selected
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        selected ? "" : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {entry.title}
                    </span>
                    {entry.hint ? (
                      <span
                        className={cn(
                          "font-mono text-xs",
                          selected ? "" : "text-muted-foreground",
                        )}
                      >
                        {entry.hint}
                      </span>
                    ) : null}
                    {selected ? (
                      <CornerDownLeft
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
        {results.length === 0 || items === null || failed ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            {status}
          </p>
        ) : null}
      </div>

      <div className="border-border text-muted-foreground flex items-center gap-4 border-t px-4 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <kbd className="border-border rounded border px-1">↑</kbd>
          <kbd className="border-border rounded border px-1">↓</kbd>
          to move
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="border-border rounded border px-1">↵</kbd>
          to open
        </span>
        <p className="sr-only" aria-live="polite">
          {status}
        </p>
      </div>
    </dialog>
  );
}
