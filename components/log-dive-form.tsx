"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createDiveLog,
  type CreateDiveState,
} from "@/lib/actions/create-dive-log";

const inputClass =
  "border-border bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const labelClass =
  "text-muted-foreground block text-xs tracking-wide uppercase";

function todayInputValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${String(y)}-${m}-${d}`;
}

export function LogDiveForm() {
  const [state, action, pending] = useActionState<CreateDiveState, FormData>(
    createDiveLog,
    {},
  );

  return (
    <form action={action} className="mt-8 space-y-8">
      {/* Honeypot */}
      <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-heading text-base font-semibold">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className={labelClass}>
              Dive name
            </label>
            <input
              id="title"
              name="title"
              required
              maxLength={99}
              placeholder="Oct 19, 2025 - Whytecliff (1)"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="date" className={labelClass}>
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={todayInputValue()}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="siteName" className={labelClass}>
              Site / location
            </label>
            <input
              id="siteName"
              name="siteName"
              placeholder="Whytecliff"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="buddyOrShop" className={labelClass}>
              Buddy / shop
            </label>
            <input
              id="buddyOrShop"
              name="buddyOrShop"
              placeholder="Diving Sports"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-base font-semibold">Vitals</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="maxDepthMeters" className={labelClass}>
              Max depth (m)
            </label>
            <input
              id="maxDepthMeters"
              name="maxDepthMeters"
              type="number"
              min={0}
              step="any"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="bottomTimeMinutes" className={labelClass}>
              Bottom time (min)
            </label>
            <input
              id="bottomTimeMinutes"
              name="bottomTimeMinutes"
              type="number"
              min={0}
              step="any"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="visibilityMeters" className={labelClass}>
              Visibility (m)
            </label>
            <input
              id="visibilityMeters"
              name="visibilityMeters"
              type="number"
              min={0}
              step="any"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="surfaceTempC" className={labelClass}>
              Surface temp (°C)
            </label>
            <input
              id="surfaceTempC"
              name="surfaceTempC"
              type="number"
              step="any"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="bottomTempC" className={labelClass}>
              Bottom temp (°C)
            </label>
            <input
              id="bottomTempC"
              name="bottomTempC"
              type="number"
              step="any"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="weightLbs" className={labelClass}>
              Weight (lbs)
            </label>
            <input
              id="weightLbs"
              name="weightLbs"
              type="number"
              min={0}
              step="any"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="gasType" className={labelClass}>
              Gas
            </label>
            <select
              id="gasType"
              name="gasType"
              defaultValue="air"
              className={inputClass}
            >
              <option value="air">Air</option>
              <option value="nitrox">Nitrox</option>
              <option value="trimix">Trimix</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="startPressurePsi" className={labelClass}>
              Start PSI
            </label>
            <input
              id="startPressurePsi"
              name="startPressurePsi"
              type="number"
              min={0}
              step="any"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="endPressurePsi" className={labelClass}>
              End PSI
            </label>
            <input
              id="endPressurePsi"
              name="endPressurePsi"
              type="number"
              min={0}
              step="any"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-base font-semibold">Notes</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="skillsPracticed" className={labelClass}>
              Skills practiced
            </label>
            <textarea
              id="skillsPracticed"
              name="skillsPracticed"
              rows={2}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="environmentalNotes" className={labelClass}>
              Environmental notes
            </label>
            <textarea
              id="environmentalNotes"
              name="environmentalNotes"
              rows={2}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lessonsLearned" className={labelClass}>
              Lessons learned
            </label>
            <textarea
              id="lessonsLearned"
              name="lessonsLearned"
              rows={2}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Saving…" : "Save dive"}
      </Button>
    </form>
  );
}
