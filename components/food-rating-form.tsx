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
  bandFor,
  RUBRIC_BANDS,
  RUBRIC_CATEGORIES,
  RUBRIC_MAX_POINTS,
  RUBRIC_MAX_TOTAL,
  RUBRIC_POINTS,
} from "@/lib/food-rubric";
import {
  readStoredPerson,
  storePerson,
  subscribeToStorage,
} from "@/lib/food-tour-person";
import { cn } from "@/lib/utils";

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
  cuisine?: string | null | undefined;
  chosenBy?: string | null | undefined;
}

type Category = (typeof RUBRIC_CATEGORIES)[number];

function RestaurantMeta({
  restaurant,
}: Readonly<{ restaurant: RestaurantOption }>) {
  const parts = [
    restaurant.cuisine,
    restaurant.chosenBy ? `Chosen by ${restaurant.chosenBy}` : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p className="text-muted-foreground mt-1 text-sm">{parts.join(" · ")}</p>
  );
}

/** One category: a 1–10 picker, with the rubric wording for each range. */
function ScoreField({
  category,
  value,
  onChange,
}: Readonly<{
  category: Category;
  value: number | undefined;
  onChange: (points: number) => void;
}>) {
  const active = value === undefined ? undefined : bandFor(value);
  return (
    <fieldset className="space-y-3">
      <legend className="flex w-full items-baseline justify-between gap-3">
        <span className="text-base font-semibold tracking-tight">
          {category.label}
        </span>
        <span className="text-muted-foreground font-mono text-sm">
          {value ?? "–"} / {RUBRIC_MAX_POINTS}
        </span>
      </legend>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {RUBRIC_POINTS.map((points) => {
          const id = `${category.key}-${String(points)}`;
          const checked = value === points;
          return (
            <label
              key={points}
              htmlFor={id}
              className={cn(
                "border-border hover:bg-muted/60 has-focus-visible:ring-ring/40 flex h-10 cursor-pointer items-center justify-center rounded-md border font-mono text-sm transition-colors has-focus-visible:ring-2",
                checked &&
                  "border-primary bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              <input
                id={id}
                type="radio"
                name={category.key}
                value={points}
                required
                checked={checked}
                onChange={() => {
                  onChange(points);
                }}
                className="sr-only"
              />
              {points}
            </label>
          );
        })}
      </div>
      <ul className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {RUBRIC_BANDS.map((band) => (
          <li
            key={band.key}
            className={cn(
              "flex gap-2 leading-snug",
              active?.key === band.key
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            <span className="w-10 shrink-0 font-mono text-xs leading-5">
              {band.min}–{band.max}
            </span>
            <span>
              <span className="font-medium">{band.label}.</span>{" "}
              {category.descriptions[band.key]}
            </span>
          </li>
        ))}
      </ul>
    </fieldset>
  );
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
  const setScore = (key: string, points: number) => {
    setScores((prev) => ({ ...prev, [key]: points }));
  };

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
                {[r.name, r.cuisine, r.neighbourhood]
                  .filter(Boolean)
                  .join(" · ")}
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
          <div>
            <p className={labelClass}>3 · Score {restaurant.name}</p>
            <RestaurantMeta restaurant={restaurant} />
          </div>
          {RUBRIC_CATEGORIES.map((category) => (
            <ScoreField
              key={category.key}
              category={category}
              value={scores[category.key]}
              onChange={(points) => {
                setScore(category.key, points);
              }}
            />
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
