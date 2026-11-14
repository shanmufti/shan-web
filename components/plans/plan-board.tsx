"use client";

import { UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PlanView } from "@/lib/plans";
import { useRememberedChoice } from "@/lib/remembered-choice";

import {
  ChoiceVoteBlock,
  DatePollBlock,
  NotesBlock,
  RsvpBlock,
} from "./plan-blocks";
import { ChoicePill } from "./plan-ui";

/** The interactive part of /plans/[shareSlug]: name picker plus sections. */
export function PlanBoard({ plan }: Readonly<{ plan: PlanView }>) {
  const [stored, setStored] = useRememberedChoice(`plan-person:${plan.slug}`);
  const me = plan.people.some((p) => p.id === stored) ? stored : "";
  const person = plan.people.find((p) => p.id === me);
  const people = new Map(plan.people.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="who-heading"
        className="rounded-tile border-border bg-tint-water border p-5 sm:p-6"
      >
        {person ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="who-heading" className="flex items-center gap-2">
              <UserRound className="size-4" aria-hidden="true" />
              Answering as{" "}
              <strong className="font-semibold">{person.name}</strong>
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setStored("");
              }}
            >
              Not you? Change
            </Button>
          </div>
        ) : (
          <fieldset>
            <legend id="who-heading" className="text-lg font-medium">
              Who are you?
            </legend>
            <p className="text-muted-foreground mt-1 text-sm">
              Pick your name to answer. This device remembers it.
            </p>
            {plan.people.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {plan.people.map((p) => (
                  <ChoicePill
                    key={p.id}
                    name="plan-person"
                    value={p.id}
                    checked={false}
                    onChange={() => {
                      setStored(p.id);
                    }}
                    className="bg-card"
                  >
                    {p.name}
                  </ChoicePill>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm">Nobody has been added yet.</p>
            )}
          </fieldset>
        )}
        {plan.closed ? (
          <p className="text-muted-foreground mt-3 text-sm">
            This plan is closed, so answers can&apos;t change.
          </p>
        ) : null}
      </section>

      {plan.blocks.map((block) => {
        const props = {
          slug: plan.slug,
          me,
          closed: plan.closed,
          people,
        };
        // key includes `me` so each form resets to that person's answers.
        switch (block.type) {
          case "datePoll":
            return (
              <DatePollBlock
                key={`${block.id}:${me}`}
                block={block}
                {...props}
              />
            );
          case "choiceVote":
            return (
              <ChoiceVoteBlock
                key={`${block.id}:${me}`}
                block={block}
                {...props}
              />
            );
          case "rsvp":
            return (
              <RsvpBlock key={`${block.id}:${me}`} block={block} {...props} />
            );
          case "notes":
            return <NotesBlock key={block.id} block={block} />;
        }
      })}
    </div>
  );
}
