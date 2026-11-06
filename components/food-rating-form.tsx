"use client";

import {
  startTransition,
  useActionState,
  useState,
  useSyncExternalStore,
} from "react";

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

const PERSON_STORAGE_KEY = "food-tour-person";

const inputClass =
  "border-border bg-background mt-1 w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const labelClass =
  "text-muted-foreground block text-xs tracking-wide uppercase";

interface Option {
  id: string;
  name: string;
}

interface RestaurantOption extends Option {
  neighbourhood?: string | null | undefined;
}

// The remembered "who are you" choice lives in localStorage. Reading it via
// useSyncExternalStore keeps server and first client render in agreement.
function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
  };
}

function readStoredPerson(): string {
  try {
    return window.localStorage.getItem(PERSON_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storePerson(id: string) {
  try {
    window.localStorage.setItem(PERSON_STORAGE_KEY, id);
  } catch {
    // Storage can be unavailable (private mode); picking again is fine.
  }
}

export function FoodRatingForm({
  participants,
  restaurants,
  submitted,
}: Readonly<{
  participants: Option[];
  restaurants: RestaurantOption[];
  /** `${participantId}:${restaurantId}` for every rubric already in. */
  submitted: string[];
}>) {
  const [state, action, pending] = useActionState<FoodRatingState, FormData>(
    submitFoodRating,
    {},
  );

  const stored = useSyncExternalStore(
    subscribeToStorage,
    readStoredPerson,
    () => "",
  );
  const [picked, setPicked] = useState<string | null>(null);
  const candidate = picked ?? stored;
  const participantId = participants.some((p) => p.id === candidate)
    ? candidate
    : "";
  const person = participants.find((p) => p.id === participantId);

  const [restaurantId, setRestaurantId] = useState("");
  const [scores, setScores] = useState<Partial<Record<string, number>>>({});

  // After a successful submit, clear the rubric for the next restaurant.
  // (Adjusting state during render, per React docs, rather than in an effect.)
  const [seenSubmit, setSeenSubmit] = useState(state.submittedAt);
  if (state.submittedAt !== seenSubmit) {
    setSeenSubmit(state.submittedAt);
    setScores({});
    setRestaurantId("");
  }

  const done = new Set(submitted);
  const hasSubmitted = (rid: string) => done.has(`${participantId}:${rid}`);
  const remaining = restaurants.filter((r) => !hasSubmitted(r.id)).length;

  const total = Object.values(scores).reduce<number>(
    (sum, v) => sum + (v ?? 0),
    0,
  );
  const complete = RUBRIC_CATEGORIES.every((c) => scores[c.key] !== undefined);
  const restaurant = restaurants.find((r) => r.id === restaurantId);
  const submitLabel =
    restaurant && hasSubmitted(restaurant.id)
      ? "Replace my rubric"
      : "Submit rubric";

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

      <fieldset className="space-y-3">
        <legend className={labelClass}>1 · Who are you?</legend>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => {
            const checked = p.id === participantId;
            return (
              <label
                key={p.id}
                className={cn(
                  "border-border hover:bg-muted/60 has-focus-visible:ring-ring/40 cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors has-focus-visible:ring-2",
                  checked &&
                    "border-primary bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                <input
                  type="radio"
                  name="participantId"
                  value={p.id}
                  required
                  checked={checked}
                  onChange={() => {
                    setPicked(p.id);
                    storePerson(p.id);
                    setRestaurantId("");
                    setScores({});
                  }}
                  className="sr-only"
                />
                {p.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      {person ? (
        <div>
          <label htmlFor="restaurantId" className={labelClass}>
            2 · Which restaurant?
          </label>
          <select
            id="restaurantId"
            name="restaurantId"
            required
            value={restaurantId}
            onChange={(e) => {
              setRestaurantId(e.target.value);
              setScores({});
            }}
            className={inputClass}
          >
            <option value="" disabled>
              Pick a stop…
            </option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {hasSubmitted(r.id) ? "✓ " : ""}
                {r.neighbourhood ? `${r.name} · ${r.neighbourhood}` : r.name}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground mt-2 text-sm">
            {remaining === 0
              ? `You've scored every stop, ${person.name}. Pick one to change your rubric.`
              : `${String(remaining)} of ${String(restaurants.length)} left to score. ✓ means you've already submitted — sending again replaces it.`}
          </p>
        </div>
      ) : null}

      {person && restaurant ? (
        <>
          <p className={labelClass}>3 · Score {restaurant.name}</p>
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
                        checked &&
                          "border-primary bg-primary/5 hover:bg-primary/5",
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
                        <span className="text-sm font-medium">
                          {level.label}
                        </span>
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
              key={`${restaurantId}-${String(state.submittedAt ?? 0)}`}
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
              {pending ? "Sealing…" : submitLabel}
            </button>
          </div>
        </>
      ) : null}

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
