"use client";

import { useState, useTransition } from "react";

import { togglePackingItem } from "@/lib/actions/toggle-packing-item";

export interface PackingListItem {
  label: string;
  category?: string | null;
  qty?: number | null;
  checked?: boolean | null;
}

export function PackingListChecklist({
  shareSlug,
  items,
}: Readonly<{
  shareSlug: string;
  items: PackingListItem[];
}>) {
  const [checkedState, setCheckedState] = useState(
    items.map((item) => Boolean(item.checked)),
  );
  const [isPending, startTransition] = useTransition();

  function onToggle(index: number) {
    const next = !checkedState[index];
    setCheckedState((prev) => prev.map((c, i) => (i === index ? next : c)));
    startTransition(() => {
      void togglePackingItem(shareSlug, index, next);
    });
  }

  const byCategory = new Map<string, number[]>();
  items.forEach((item, index) => {
    const category = item.category ?? "Uncategorized";
    const list = byCategory.get(category) ?? [];
    list.push(index);
    byCategory.set(category, list);
  });

  return (
    <div className="mt-8 space-y-8" aria-busy={isPending}>
      {[...byCategory.entries()].map(([category, indexes]) => (
        <section key={category}>
          <h2 className="font-heading text-base font-semibold">{category}</h2>
          <ul className="mt-3 space-y-2">
            {indexes.map((index) => {
              const item = items[index];
              if (!item) return null;
              return (
                <li key={index} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={checkedState[index] ?? false}
                    onChange={() => {
                      onToggle(index);
                    }}
                    className="size-4"
                  />
                  <span
                    className={
                      checkedState[index]
                        ? "text-muted-foreground line-through"
                        : ""
                    }
                  >
                    {item.label}
                    {item.qty && item.qty > 1 ? ` ×${String(item.qty)}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
