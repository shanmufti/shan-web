"use client";

import { Lock, Star } from "lucide-react";
import { useState } from "react";

import {
  DATE_ANSWERS,
  RSVP_STATUSES,
  type DateAnswer,
  type RsvpStatus,
} from "@/lib/plan-tally";
import type {
  ChoiceVoteView,
  DatePollView,
  NotesView,
  RsvpView,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

import {
  ChoicePill,
  fieldClass,
  formatDay,
  labelClass,
  names,
  PlanCard,
  SaveRow,
  useSaveResponse,
} from "./plan-ui";

/** State updater that adds or removes one id. */
const toggled = (id: string) => (list: string[]) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export interface BlockProps<T> {
  block: T;
  slug: string;
  /** Picked participant id, or "" when nobody is picked yet. */
  me: string;
  closed: boolean;
  people: Map<string, string>;
}

const ANSWER_LABELS: Record<DateAnswer, string> = {
  yes: "Yes",
  maybe: "Maybe",
  no: "No",
};

export function DatePollBlock({
  block,
  slug,
  me,
  closed,
  people,
}: Readonly<BlockProps<DatePollView>>) {
  const [marks, setMarks] = useState<Record<string, DateAnswer>>(
    () => block.answers[me] ?? {},
  );
  const { pending, message, save } = useSaveResponse({
    slug,
    participantId: me,
    blockId: block.id,
  });
  const mark = (dateId: string, answer: DateAnswer) => {
    setMarks((prev) => ({ ...prev, [dateId]: answer }));
  };
  const canAnswer = Boolean(me) && !closed;
  const answered = Object.keys(block.answers).length;
  const hasAnswered = me in block.answers;

  return (
    <PlanCard eyebrow="Date poll" title={block.question} id={block.id}>
      <p className="text-muted-foreground text-sm">
        {answered === 0
          ? "No answers yet."
          : `${String(answered)} of ${String(people.size)} answered.`}{" "}
        Best date is the most yeses, with maybes counting half.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save({ marks }, "Saved your dates.");
        }}
      >
        <ul className="mt-4 space-y-3">
          {block.dates.map((date) => {
            const tally = block.tally.find((t) => t.dateId === date.id);
            const best = block.best === date.id;
            const label = [formatDay(date.date), date.label]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={date.id}
                className={cn(
                  "border-border rounded-lg border p-4",
                  best && "border-success bg-success/5 border-2",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {label}
                      {best ? (
                        <span className="bg-success dark:text-background inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white">
                          <Star className="size-3" aria-hidden="true" />
                          Best date
                        </span>
                      ) : null}
                    </p>
                    {tally ? (
                      <p className="text-muted-foreground mt-1 text-sm">
                        {DATE_ANSWERS.map((a) =>
                          tally[a].length > 0
                            ? `${ANSWER_LABELS[a]}: ${names(tally[a], people)}`
                            : null,
                        )
                          .filter(Boolean)
                          .join(" · ") || "Nobody has answered yet."}
                      </p>
                    ) : null}
                  </div>
                  {canAnswer ? (
                    <fieldset className="flex gap-1.5">
                      <legend className="sr-only">
                        Your answer for {label}
                      </legend>
                      {DATE_ANSWERS.map((answer) => (
                        <ChoicePill
                          key={answer}
                          name={`${block.id}-${date.id}`}
                          value={answer}
                          checked={marks[date.id] === answer}
                          onChange={() => {
                            mark(date.id, answer);
                          }}
                        >
                          {ANSWER_LABELS[answer]}
                        </ChoicePill>
                      ))}
                    </fieldset>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        {canAnswer ? (
          <SaveRow
            label={hasAnswered ? "Update my dates" : "Save my dates"}
            pending={pending}
            message={message}
            disabled={Object.keys(marks).length === 0}
          />
        ) : null}
      </form>
    </PlanCard>
  );
}

function VoteResults({
  block,
  people,
}: Readonly<{ block: ChoiceVoteView; people: Map<string, string> }>) {
  if (!block.tally || !block.ballots) return null;
  const ballots = block.ballots;
  const max = Math.max(1, ...block.tally.map((t) => t.points));
  const label = new Map(block.options.map((o) => [o.id, o.label]));
  const unit = block.mode === "ranked" ? "pts" : "votes";
  return (
    <div className="mt-2">
      <h3 className={labelClass}>Results</h3>
      <ol className="mt-3 space-y-3">
        {block.tally.map((t, index) => {
          const supporters = Object.entries(ballots)
            .filter(([, ballot]) => ballot[0] === t.optionId)
            .map(([pid]) => pid);
          return (
            <li key={t.optionId}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span
                  className={cn(index === 0 && t.points > 0 && "font-semibold")}
                >
                  {label.get(t.optionId)}
                </span>
                <span className="text-muted-foreground font-mono">
                  {t.points} {t.points === 1 ? unit.replace(/s$/, "") : unit}
                </span>
              </div>
              <div
                className="bg-muted mt-1 h-2 overflow-hidden rounded-full"
                aria-hidden="true"
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    index === 0 && t.points > 0
                      ? "bg-primary"
                      : "bg-primary/45",
                  )}
                  style={{ width: `${String((t.points / max) * 100)}%` }}
                />
              </div>
              {supporters.length > 0 ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {block.mode === "ranked" ? "First choice of " : ""}
                  {names(supporters, people)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      {block.mode === "ranked" && Object.keys(ballots).length > 0 ? (
        <details className="mt-4 text-sm">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer">
            Everyone&apos;s rankings
          </summary>
          <ul className="mt-2 space-y-1">
            {Object.entries(ballots).map(([pid, ballot]) => (
              <li key={pid}>
                <span className="font-medium">
                  {people.get(pid) ?? "Someone"}:
                </span>{" "}
                {ballot
                  .map((id, i) => `${String(i + 1)}. ${label.get(id) ?? "?"}`)
                  .join("  ")}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

const PLACES = ["1st choice", "2nd choice", "3rd choice"];

function SealedNotice({
  block,
  people,
}: Readonly<{ block: ChoiceVoteView; people: Map<string, string> }>) {
  return (
    <div className="bg-tint-sand border-border flex gap-3 rounded-lg border p-4 text-sm">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium">
          Sealed until {block.revealLabel ?? "a reveal time is set"}.
        </p>
        <p className="text-muted-foreground mt-1">
          Nobody can see the votes before then, the host included. You can
          change your vote until the reveal.
        </p>
        <p className="mt-2">
          {block.voters.length === 0
            ? "No votes yet."
            : `${String(block.voters.length)} of ${String(people.size)} voted: ${names(block.voters, people)}.`}
        </p>
      </div>
    </div>
  );
}

function RankedPicker({
  block,
  slots,
  ballot,
  onPick,
}: Readonly<{
  block: ChoiceVoteView;
  slots: number;
  ballot: string[];
  onPick: (index: number, optionId: string) => void;
}>) {
  return (
    <fieldset>
      <legend className={labelClass}>Your top {slots}</legend>
      <div className="mt-1 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: slots }, (_, i) => (
          <div key={PLACES[i]}>
            <label
              htmlFor={`${block.id}-rank-${String(i)}`}
              className="text-sm"
            >
              {PLACES[i]} ({3 - i} pts)
            </label>
            <select
              id={`${block.id}-rank-${String(i)}`}
              value={ballot[i] ?? ""}
              onChange={(e) => {
                onPick(i, e.target.value);
              }}
              className={fieldClass}
            >
              <option value="">{i === 0 ? "Pick one…" : "None"}</option>
              {block.options.map((o) => (
                <option
                  key={o.id}
                  value={o.id}
                  disabled={ballot.includes(o.id) && ballot[i] !== o.id}
                >
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function VoteForm({
  block,
  slug,
  me,
  className,
}: Readonly<{
  block: ChoiceVoteView;
  slug: string;
  me: string;
  className?: string | undefined;
}>) {
  const slots = block.mode === "ranked" ? Math.min(3, block.options.length) : 1;
  // While sealed, the server never sends anyone's ballot, so the form starts empty.
  const [ballot, setBallot] = useState<string[]>(
    () => block.ballots?.[me] ?? [],
  );
  const { pending, message, save } = useSaveResponse({
    slug,
    participantId: me,
    blockId: block.id,
  });
  const voted = block.voters.includes(me);
  const sealedNow = block.sealed && !block.revealed;

  const setSlot = (index: number, optionId: string) => {
    setBallot((prev) => {
      const next = [...prev];
      next[index] = optionId;
      return next.slice(0, slots);
    });
  };
  const filled = ballot.filter(Boolean);
  const ready =
    block.mode === "ranked"
      ? filled.length >= 1 && new Set(filled).size === filled.length
      : filled.length === 1;

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        save(
          { ballot: filled },
          block.sealed
            ? "Vote sealed. It stays hidden until the reveal."
            : "Vote saved.",
        );
      }}
    >
      {block.mode === "single" ? (
        <fieldset>
          <legend className={labelClass}>Your vote</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {block.options.map((option) => (
              <ChoicePill
                key={option.id}
                name={`${block.id}-vote`}
                value={option.id}
                checked={ballot[0] === option.id}
                onChange={() => {
                  setBallot([option.id]);
                }}
                className="justify-start rounded-lg px-4 py-2.5 text-left"
              >
                <span>
                  {option.label}
                  {option.detail ? (
                    <span className="block text-xs opacity-80">
                      {option.detail}
                    </span>
                  ) : null}
                </span>
              </ChoicePill>
            ))}
          </div>
        </fieldset>
      ) : (
        <RankedPicker
          block={block}
          slots={slots}
          ballot={ballot}
          onPick={setSlot}
        />
      )}
      <SaveRow
        label={voted ? "Change my vote" : "Cast my vote"}
        pending={pending}
        message={message}
        disabled={!ready}
      />
      {voted && sealedNow ? (
        <p className="text-muted-foreground mt-2 text-sm">
          You&apos;ve voted. Your earlier choice is sealed too, so the form
          starts empty; voting again replaces it.
        </p>
      ) : null}
    </form>
  );
}

export function ChoiceVoteBlock({
  block,
  slug,
  me,
  people,
}: Readonly<BlockProps<ChoiceVoteView>>) {
  const canVote = Boolean(me) && block.open;
  const sealedNow = block.sealed && !block.revealed;
  let eyebrow = block.mode === "ranked" ? "Ranked vote" : "Vote";
  if (block.sealed) eyebrow += " · sealed";

  return (
    <PlanCard eyebrow={eyebrow} title={block.question} id={block.id}>
      {sealedNow ? <SealedNotice block={block} people={people} /> : null}
      {block.revealed && block.sealed && block.revealLabel ? (
        <p className="text-muted-foreground mb-4 text-sm">
          Revealed {block.revealLabel}. Voting is closed.
        </p>
      ) : null}
      {canVote ? (
        <VoteForm
          block={block}
          slug={slug}
          me={me}
          className={sealedNow ? "mt-5" : undefined}
        />
      ) : null}
      {!block.open && !block.tally && !sealedNow ? (
        <p className="text-muted-foreground text-sm">Voting is closed.</p>
      ) : null}
      {block.tally ? (
        <div className={cn(canVote && "border-border mt-6 border-t pt-5")}>
          <VoteResults block={block} people={people} />
        </div>
      ) : null}
    </PlanCard>
  );
}

const STATUS_LABELS: Record<RsvpStatus, string> = {
  yes: "Coming",
  maybe: "Maybe",
  no: "Can't make it",
};

export function RsvpBlock({
  block,
  slug,
  me,
  closed,
  people,
}: Readonly<BlockProps<RsvpView>>) {
  const mine = block.answers[me];
  const [status, setStatus] = useState<RsvpStatus | "">(mine?.status ?? "");
  const [note, setNote] = useState(mine?.note ?? "");
  const [claims, setClaims] = useState<string[]>(mine?.claims ?? []);
  const { pending, message, save } = useSaveResponse({
    slug,
    participantId: me,
    blockId: block.id,
  });
  const canAnswer = Boolean(me) && !closed;

  const claimedBy = new Map<string, string>();
  for (const [pid, answer] of Object.entries(block.answers)) {
    for (const item of answer.claims) claimedBy.set(item, pid);
  }
  const byStatus = (s: RsvpStatus) =>
    Object.entries(block.answers)
      .filter(([, a]) => a.status === s)
      .map(([pid]) => pid);
  const waiting = [...people.keys()].filter((pid) => !(pid in block.answers));

  return (
    <PlanCard eyebrow="RSVP" title={block.question} id={block.id}>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {RSVP_STATUSES.map((s) => {
          const ids = byStatus(s);
          return (
            <div key={s}>
              <dt className={labelClass}>
                {STATUS_LABELS[s]} · {ids.length}
              </dt>
              <dd className="mt-1">
                {ids.length > 0 ? names(ids, people) : "—"}
              </dd>
            </div>
          );
        })}
        <div>
          <dt className={labelClass}>No answer · {waiting.length}</dt>
          <dd className="mt-1">
            {waiting.length > 0 ? names(waiting, people) : "—"}
          </dd>
        </div>
      </dl>

      <form
        className="border-border mt-5 border-t pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          save({ status, note, claims }, "Saved.");
        }}
      >
        {canAnswer ? (
          <>
            <fieldset>
              <legend className={labelClass}>Your answer</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {RSVP_STATUSES.map((s) => (
                  <ChoicePill
                    key={s}
                    name={`${block.id}-status`}
                    value={s}
                    checked={status === s}
                    onChange={() => {
                      setStatus(s);
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </ChoicePill>
                ))}
              </div>
            </fieldset>
            <div className="mt-4">
              <label htmlFor={`${block.id}-note`} className={labelClass}>
                Note (optional)
              </label>
              <input
                id={`${block.id}-note`}
                type="text"
                maxLength={300}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                }}
                className={fieldClass}
                placeholder="e.g. arriving late, +1"
              />
            </div>
          </>
        ) : null}

        {block.items.length > 0 ? (
          <fieldset className={cn(canAnswer && "mt-5")}>
            <legend className={labelClass}>Who&apos;s bringing what</legend>
            <ul className="divide-border mt-2 divide-y">
              {block.items.map((item) => {
                const owner = claimedBy.get(item.id);
                const takenByOther = Boolean(owner) && owner !== me;
                const checked = claims.includes(item.id);
                const inputId = `${block.id}-item-${item.id}`;
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {canAnswer ? (
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          disabled={takenByOther || status === "no"}
                          onChange={() => {
                            setClaims(toggled(item.id));
                          }}
                          className="accent-primary size-4 shrink-0"
                        />
                      ) : null}
                      <label
                        htmlFor={canAnswer ? inputId : undefined}
                        className="min-w-0"
                      >
                        <span className="text-sm font-medium">{item.name}</span>
                        {item.note ? (
                          <span className="text-muted-foreground block text-xs">
                            {item.note}
                          </span>
                        ) : null}
                      </label>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm",
                        owner ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {owner ? (people.get(owner) ?? "Someone") : "Unclaimed"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : null}

        {canAnswer ? (
          <SaveRow
            label={mine ? "Update my RSVP" : "Save my RSVP"}
            pending={pending}
            message={message}
            disabled={status === ""}
          />
        ) : null}
      </form>

      {Object.values(block.answers).some((a) => a.note) ? (
        <ul className="text-muted-foreground mt-4 space-y-1 text-sm">
          {Object.entries(block.answers)
            .filter(([, a]) => a.note)
            .map(([pid, a]) => (
              <li key={pid}>
                <span className="text-foreground font-medium">
                  {people.get(pid) ?? "Someone"}:
                </span>{" "}
                {a.note}
              </li>
            ))}
        </ul>
      ) : null}
    </PlanCard>
  );
}

export function NotesBlock({ block }: Readonly<{ block: NotesView }>) {
  return (
    <PlanCard eyebrow="Notes" title={block.heading ?? "Notes"} id={block.id}>
      <p className="text-[0.95rem] leading-relaxed whitespace-pre-line">
        {block.body}
      </p>
    </PlanCard>
  );
}
