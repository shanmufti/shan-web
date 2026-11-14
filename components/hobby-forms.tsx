"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
} from "react";

import {
  addHobbyReference,
  addPracticeSession,
  type HobbyFormState,
} from "@/lib/actions/hobbies";
import {
  REFERENCE_KINDS,
  REFERENCE_STATUSES,
  SKILL_LEVELS,
} from "@/lib/hobby-options";

const inputClass =
  "border-input bg-background focus-visible:ring-ring/50 focus-visible:border-ring mt-1 h-10 w-full min-w-0 rounded-md border px-3 text-base outline-none focus-visible:ring-3 sm:text-sm";
const labelClass = "text-sm font-medium";
const buttonClass =
  "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 h-10 rounded-md px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-3 disabled:opacity-60";

/**
 * Submits through onSubmit (not the form `action` prop) so React doesn't
 * clear the fields when the server returns an error; clears them on save.
 */
function useResetOnSave(
  state: HobbyFormState,
  action: (formData: FormData) => void,
) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.savedAt) ref.current?.reset();
  }, [state.savedAt]);
  const onSubmit = (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      action(formData);
    });
  };
  return { ref, onSubmit };
}

function Status({
  state,
  id,
}: Readonly<{ state: HobbyFormState; id: string }>) {
  if (state.error) {
    return (
      <p id={id} role="alert" className="text-destructive text-sm">
        {state.error}
      </p>
    );
  }
  return (
    <p id={id} role="status" className="text-muted-foreground text-sm">
      {state.message ?? ""}
    </p>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: Readonly<{
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {hint ? (
          <span className="text-muted-foreground font-normal"> ({hint})</span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

export function AddReferenceForm({
  hobbyId,
  topics,
}: Readonly<{ hobbyId: number; topics: string[] }>) {
  const [state, action, pending] = useActionState(addHobbyReference, {});
  const { ref: formRef, onSubmit } = useResetOnSave(state, action);
  const id = useId();

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid gap-4 sm:grid-cols-2"
      aria-describedby={`${id}-status`}
    >
      <input type="hidden" name="hobbyId" value={hobbyId} />
      <Field label="Link" htmlFor={`${id}-url`} className="sm:col-span-2">
        <input
          id={`${id}-url`}
          name="url"
          type="url"
          inputMode="url"
          required
          placeholder="https://www.youtube.com/watch?v=…"
          className={inputClass}
        />
      </Field>
      <Field label="Topic" htmlFor={`${id}-topic`} hint="e.g. Footwork">
        <input
          id={`${id}-topic`}
          name="topic"
          list={`${id}-topics`}
          maxLength={60}
          className={inputClass}
        />
        <datalist id={`${id}-topics`}>
          {topics.map((topic) => (
            <option key={topic} value={topic} />
          ))}
        </datalist>
      </Field>
      <Field label="Title" htmlFor={`${id}-title`} hint="blank: from the link">
        <input
          id={`${id}-title`}
          name="title"
          maxLength={200}
          className={inputClass}
        />
      </Field>
      <Field label="Kind" htmlFor={`${id}-kind`}>
        <select id={`${id}-kind`} name="kind" className={inputClass}>
          <option value="">Auto from link</option>
          {REFERENCE_KINDS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Level" htmlFor={`${id}-level`}>
        <select id={`${id}-level`} name="skillLevel" className={inputClass}>
          <option value="">Not set</option>
          {SKILL_LEVELS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Status" htmlFor={`${id}-status-select`}>
        <select
          id={`${id}-status-select`}
          name="status"
          defaultValue="to-watch"
          className={inputClass}
        >
          {REFERENCE_STATUSES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Start at" htmlFor={`${id}-start`} hint="videos, e.g. 1:30">
        <input
          id={`${id}-start`}
          name="start"
          inputMode="numeric"
          placeholder="From the link’s t= if blank"
          className={inputClass}
        />
      </Field>
      <Field label="My note" htmlFor={`${id}-note`} className="sm:col-span-2">
        <textarea
          id={`${id}-note`}
          name="note"
          rows={2}
          maxLength={1000}
          className={`${inputClass} h-auto py-2`}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:col-span-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="public"
            defaultChecked
            className="accent-primary size-4"
          />
          Public
        </label>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Saving…" : "Save link"}
        </button>
        <Status state={state} id={`${id}-status`} />
      </div>
    </form>
  );
}

export function AddSessionForm({
  hobbyId,
  today,
  references,
}: Readonly<{
  hobbyId: number;
  today: string;
  references: { id: number; title: string }[];
}>) {
  const [state, action, pending] = useActionState(addPracticeSession, {});
  const { ref: formRef, onSubmit } = useResetOnSave(state, action);
  const id = useId();

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      aria-describedby={`${id}-status`}
    >
      <input type="hidden" name="hobbyId" value={hobbyId} />
      <Field label="Date" htmlFor={`${id}-date`}>
        <input
          id={`${id}-date`}
          name="date"
          type="date"
          required
          defaultValue={today}
          className={inputClass}
        />
      </Field>
      <Field label="Minutes" htmlFor={`${id}-duration`}>
        <input
          id={`${id}-duration`}
          name="durationMinutes"
          type="number"
          min={0}
          max={1440}
          inputMode="numeric"
          className={inputClass}
        />
      </Field>
      <Field label="Location" htmlFor={`${id}-location`} className="col-span-2">
        <input
          id={`${id}-location`}
          name="location"
          maxLength={120}
          className={inputClass}
        />
      </Field>
      <Field
        label="What I worked on"
        htmlFor={`${id}-focus`}
        className="col-span-2 sm:col-span-3"
      >
        <input
          id={`${id}-focus`}
          name="focus"
          required
          maxLength={200}
          className={inputClass}
        />
      </Field>
      <Field label="How it felt" htmlFor={`${id}-feeling`}>
        <select id={`${id}-feeling`} name="feeling" className={inputClass}>
          <option value="">Not set</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </Field>
      {references.length > 0 ? (
        <fieldset className="col-span-2 sm:col-span-4">
          <legend className={labelClass}>References used</legend>
          <div className="mt-2 flex max-h-40 flex-col gap-1.5 overflow-y-auto">
            {references.map((ref) => (
              <label
                key={ref.id}
                className="inline-flex items-start gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="references"
                  value={ref.id}
                  className="accent-primary mt-0.5 size-4 shrink-0"
                />
                <span className="min-w-0">{ref.title}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <Field
        label="Notes"
        htmlFor={`${id}-notes`}
        className="col-span-2 sm:col-span-4"
      >
        <textarea
          id={`${id}-notes`}
          name="notes"
          rows={2}
          maxLength={2000}
          className={`${inputClass} h-auto py-2`}
        />
      </Field>
      <div className="col-span-2 flex flex-wrap items-center gap-x-6 gap-y-3 sm:col-span-4">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Saving…" : "Log session"}
        </button>
        <Status state={state} id={`${id}-status`} />
      </div>
    </form>
  );
}
