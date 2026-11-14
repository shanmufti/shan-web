"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createSharedList,
  type CreateListState,
} from "@/lib/actions/shared-lists";

const labelClass =
  "text-muted-foreground block text-xs tracking-wide uppercase";
const inputClass =
  "border-input bg-background focus-visible:ring-ring/40 mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export function SharedListCreateForm() {
  const [state, formAction, pending] = useActionState<
    CreateListState,
    FormData
  >(createSharedList, {});

  return (
    <form
      action={formAction}
      className="border-border bg-card grid gap-5 rounded-lg border p-5"
    >
      <div>
        <label htmlFor="list-title" className={labelClass}>
          Title
        </label>
        <input
          id="list-title"
          name="title"
          required
          maxLength={120}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="list-items" className={labelClass}>
          Items, one per line (optional)
        </label>
        <textarea
          id="list-items"
          name="items"
          rows={6}
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating…" : "Create list"}
        </Button>
        {state.error ? (
          <p className="text-destructive text-sm" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
