"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type SyntheticEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ListItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface ListView {
  title: string;
  items: ListItem[];
}

const POLL_MS = 4000;

const noSubscribe = () => () => undefined;

/**
 * Live checklist for /lists/<shareSlug>. Polls every few seconds while the
 * tab is visible, and right away when it regains focus. Changes are shown
 * at once and sent as single-item updates, so people ticking different
 * items at the same time don't undo each other.
 */
export function SharedListChecklist({
  shareSlug,
  initial,
}: Readonly<{ shareSlug: string; initial: ListView }>) {
  const uid = useId();
  // Controls stay disabled until React has hydrated, so a tick made before
  // then can't be silently dropped.
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const [list, setList] = useState<ListView>(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  // Every local change bumps this; poll and reply results older than the
  // latest change are ignored so they can't flip a box back.
  const seq = useRef(0);
  const inFlight = useRef(0);
  const endpoint = `/lists/${shareSlug}/items`;

  const refresh = useCallback(async () => {
    const started = seq.current;
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (response.status === 404) {
        setGone(true);
        return;
      }
      if (!response.ok) return;
      const next = (await response.json()) as ListView;
      if (seq.current === started && inFlight.current === 0) setList(next);
    } catch {
      // Offline for a moment; the next poll will catch up.
    }
  }, [endpoint]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const onFocus = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function send(body: object): Promise<boolean> {
    const mine = ++seq.current;
    inFlight.current++;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as ListView & { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Couldn't save that. Try again.");
        return false;
      }
      setError(null);
      if (seq.current === mine) setList(result);
      return true;
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
      return false;
    } finally {
      inFlight.current--;
      if (inFlight.current === 0 && seq.current !== mine) void refresh();
    }
  }

  function toggle(item: ListItem) {
    const checked = !item.checked;
    setList((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === item.id ? { ...i, checked } : i)),
    }));
    void send({ action: "toggle", id: item.id, checked }).then((ok) => {
      if (!ok) void refresh();
    });
  }

  async function add(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    const label = draft.trim();
    if (!label) return;
    setDraft("");
    if (!(await send({ action: "add", label }))) setDraft(label);
  }

  if (gone) {
    return (
      <p className="text-muted-foreground mt-8 text-sm" role="status">
        This list is no longer available.
      </p>
    );
  }

  const done = list.items.filter((i) => i.checked).length;

  return (
    <div className="mt-8">
      <p className="text-muted-foreground text-sm">
        {done} of {list.items.length} ticked
      </p>
      {list.items.length > 0 ? (
        <ul className="border-border bg-card mt-3 divide-y rounded-lg border">
          {list.items.map((item) => (
            <li key={item.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={!hydrated}
                  onChange={() => {
                    toggle(item);
                  }}
                  className="accent-primary size-4 shrink-0"
                />
                <span
                  className={cn(
                    "min-w-0 break-words",
                    item.checked && "text-muted-foreground line-through",
                  )}
                >
                  {item.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">
          Nothing on this list yet.
        </p>
      )}

      <form
        onSubmit={(e) => void add(e)}
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-0 flex-1 basis-56">
          <label
            htmlFor={`${uid}-new`}
            className="text-muted-foreground block text-xs tracking-wide uppercase"
          >
            Add an item
          </label>
          <input
            id={`${uid}-new`}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
            }}
            maxLength={200}
            autoComplete="off"
            className="border-input bg-background focus-visible:ring-ring/40 mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={!hydrated || draft.trim() === ""}
        >
          Add
        </Button>
      </form>
      {error ? (
        <p className="text-destructive mt-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-muted-foreground mt-6 text-xs">
        Anyone with this link can tick and add items. Changes from others show
        up within a few seconds.
      </p>
    </div>
  );
}
