"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  clonePackingList,
  type ClonePackingListState,
} from "@/lib/actions/clone-packing-list";

export interface PackingListTemplateOption {
  id: string;
  name: string;
}

export function ClonePackingListForm({
  templates,
}: Readonly<{ templates: PackingListTemplateOption[] }>) {
  const [state, formAction, pending] = useActionState<
    ClonePackingListState,
    FormData
  >(clonePackingList, {});

  return (
    <form action={formAction} className="mt-8 flex flex-wrap items-end gap-3">
      <div>
        <label
          htmlFor="templateId"
          className="text-muted-foreground block text-xs tracking-wide uppercase"
        >
          Template
        </label>
        <select
          id="templateId"
          name="templateId"
          required
          className="border-border bg-background focus-visible:ring-ring/40 mt-1 w-64 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Cloning…" : "Clone into new list"}
      </Button>
      {state.error ? (
        <p className="text-destructive w-full text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
