"use client";

import { ArrowRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { createSplitGroup, type CreateGroupState } from "@/lib/actions/split";
import { SPLIT_CURRENCIES, SPLIT_MAX_PEOPLE } from "@/lib/split-options";

const fieldClass =
  "border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const labelClass = "meta-label text-muted-foreground block";

const withoutRow = (key: number) => (rows: { key: number }[]) =>
  rows.filter((r) => r.key !== key);

export function NewGroupForm() {
  const [state, action, pending] = useActionState<CreateGroupState, FormData>(
    createSplitGroup,
    {},
  );
  // Row keys only need to be unique within this form.
  const [rows, setRows] = useState([{ key: 0 }, { key: 1 }, { key: 2 }]);

  if (state.link && state.path) {
    return (
      <div
        role="status"
        className="rounded-tile border-border bg-tint-kelp border p-5 sm:p-6"
      >
        <p className="text-lg font-medium">Your group is ready.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Anyone with this link can add expenses, so only send it to the group.
          There&apos;s no list of groups anywhere: keep the link.
        </p>
        <p className="bg-card border-border mt-4 rounded-md border px-3 py-2 font-mono text-sm break-all">
          {state.link}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CopyButton text={state.link} label="group link">
            Copy link
          </CopyButton>
          <Link href={state.path} className={buttonVariants({ size: "lg" })}>
            Open the group <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="rounded-tile border-border bg-card space-y-5 border p-5 shadow-xs sm:p-6"
    >
      <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div>
          <label htmlFor="group-name" className={labelClass}>
            Group name
          </label>
          <input
            id="group-name"
            name="name"
            required
            maxLength={80}
            className={fieldClass}
            placeholder="e.g. Lisbon weekend"
          />
        </div>
        <div>
          <label htmlFor="group-currency" className={labelClass}>
            Currency
          </label>
          <select
            id="group-currency"
            name="currency"
            defaultValue="USD"
            className={fieldClass}
          >
            {SPLIT_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>People</legend>
        <ul className="mt-1 space-y-2">
          {rows.map((row, index) => (
            <li key={row.key} className="flex items-center gap-2">
              <label htmlFor={`person-${String(row.key)}`} className="sr-only">
                Person {index + 1}
              </label>
              <input
                id={`person-${String(row.key)}`}
                name="person"
                maxLength={40}
                required={index < 2}
                className={`${fieldClass} mt-0`}
                placeholder={`Person ${String(index + 1)}`}
              />
              {rows.length > 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Remove person ${String(index + 1)}`}
                  onClick={() => {
                    setRows(withoutRow(row.key));
                  }}
                >
                  <X aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {rows.length < SPLIT_MAX_PEOPLE ? (
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => {
              setRows((prev) => [
                ...prev,
                { key: Math.max(...prev.map((r) => r.key)) + 1 },
              ]);
            }}
          >
            <Plus aria-hidden="true" /> Add person
          </Button>
        ) : null}
      </fieldset>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating…" : "Create group"}
        </Button>
        {state.error ? (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
