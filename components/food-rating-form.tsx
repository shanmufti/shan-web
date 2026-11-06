"use client";

import { startTransition, useActionState, useState } from "react";

import {
  submitFoodRating,
  type FoodRatingState,
} from "@/lib/actions/submit-food-rating";
import {
  RUBRIC_CATEGORIES,
  RUBRIC_LEVELS,
  RUBRIC_MAX_TOTAL,
} from "@/lib/food-rubric";
import { cn } from "@/lib/utils";

const NAME_STORAGE_KEY = "food-tour-name";

const inputClass =
  "border-border bg-background mt-1 w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const labelClass =
  "text-muted-foreground block text-xs tracking-wide uppercase";

interface RestaurantOption {
  id: string;
  name: string;
  neighbourhood?: string | null | undefined;
}

export function FoodRatingForm({
  restaurants,
}: Readonly<{ restaurants: RestaurantOption[] }>) {
  const [state, action, pending] = useActionState<FoodRatingState, FormData>(
    submitFoodRating,
    {},
  );
  const [restaurantId, setRestaurantId] = useState("");
  const [scores, setScores] = useState<Partial<Record<string, number>>>({});

  // After a successful submit, clear the scores for the next restaurant.
  // (Adjusting state during render, per React docs, rather than in an effect.)
  const [seenSubmit, setSeenSubmit] = useState(state.submittedAt);
  if (state.submittedAt !== seenSubmit) {
    setSeenSubmit(state.submittedAt);
    setScores({});
    setRestaurantId("");
  }

  const total = Object.values(scores).reduce<number>(
    (sum, v) => sum + (v ?? 0),
    0,
  );
  const complete = RUBRIC_CATEGORIES.every((c) => scores[c.key] !== undefined);

  return (
    <form
      // onSubmit (not action=) so React doesn't auto-reset the form, which
      // would wipe a half-filled rubric when there's a validation error.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => {
          action(formData);
        });
      }}
      className="space-y-10"
    >
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

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={40}
            autoComplete="given-name"
            // Remember the name on this device so each stop is one less
            // thing to type. Uncontrolled, filled once from storage on mount.
            ref={(el) => {
              if (!el || el.value !== "") return;
              try {
                el.value = window.localStorage.getItem(NAME_STORAGE_KEY) ?? "";
              } catch {
                // Storage can be unavailable (private mode).
              }
            }}
            onChange={(e) => {
              try {
                window.localStorage.setItem(NAME_STORAGE_KEY, e.target.value);
              } catch {
                // Storage can be unavailable (private mode).
              }
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="restaurantId" className={labelClass}>
            Restaurant
          </label>
          <select
            id="restaurantId"
            name="restaurantId"
            required
            value={restaurantId}
            onChange={(e) => {
              setRestaurantId(e.target.value);
            }}
            className={inputClass}
          >
            <option value="" disabled>
              Pick a stop…
            </option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.neighbourhood ? `${r.name} · ${r.neighbourhood}` : r.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {RUBRIC_CATEGORIES.map((category) => (
        <fieldset key={category.key} className="space-y-3">
          <legend className="text-base font-semibold tracking-tight">
            {category.label}
          </legend>
          <div className="grid gap-2 sm:grid-cols-4">
            {RUBRIC_LEVELS.map((level) => {
              const id = `${category.key}-${String(level.points)}`;
              const checked = scores[category.key] === level.points;
              return (
                <label
                  key={level.points}
                  htmlFor={id}
                  className={cn(
                    "border-border hover:bg-muted/60 has-focus-visible:ring-ring/40 flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors has-focus-visible:ring-2",
                    checked && "border-primary bg-primary/5 hover:bg-primary/5",
                  )}
                >
                  <input
                    id={id}
                    type="radio"
                    name={category.key}
                    value={level.points}
                    required
                    checked={checked}
                    onChange={() => {
                      setScores((prev) => ({
                        ...prev,
                        [category.key]: level.points,
                      }));
                    }}
                    className="sr-only"
                  />
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{level.label}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {level.points} {level.points === 1 ? "pt" : "pts"}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-sm leading-snug">
                    {category.descriptions[level.points]}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div>
        <label htmlFor="comment" className={labelClass}>
          Comment (optional)
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          maxLength={500}
          key={state.submittedAt ?? 0}
          className={inputClass}
        />
      </div>

      <div className="border-border flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <p className="text-muted-foreground font-mono text-sm">
          Total {complete ? total : "–"} / {RUBRIC_MAX_TOTAL}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md px-5 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {pending ? "Sealing…" : "Submit rubric"}
        </button>
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-primary text-sm font-medium">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
