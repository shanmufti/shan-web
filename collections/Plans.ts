import { APIError, type Block, type CollectionConfig } from "payload";

import { siteUrl } from "@/lib/site-url";
import { newToken } from "@/lib/tokens";

import { privateAccess } from "./access";

const DatePollBlock: Block = {
  slug: "datePoll",
  interfaceName: "PlanDatePollBlock",
  labels: { singular: "Date poll", plural: "Date polls" },
  fields: [
    {
      name: "question",
      type: "text",
      required: true,
      defaultValue: "Which dates work for you?",
    },
    {
      name: "dates",
      label: "Candidate dates",
      type: "array",
      minRows: 1,
      maxRows: 30,
      admin: {
        description:
          "Each person marks yes, maybe or no. Don't delete a date people have answered; add a new one instead.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "date",
              type: "date",
              required: true,
              admin: { date: { pickerAppearance: "dayOnly" } },
            },
            {
              name: "label",
              type: "text",
              admin: { placeholder: "e.g. evening, 7pm" },
            },
          ],
        },
      ],
    },
  ],
};

const ChoiceVoteBlock: Block = {
  slug: "choiceVote",
  interfaceName: "PlanChoiceVoteBlock",
  labels: { singular: "Choice vote", plural: "Choice votes" },
  fields: [
    { name: "question", type: "text", required: true },
    {
      name: "options",
      type: "array",
      minRows: 2,
      maxRows: 20,
      admin: {
        description:
          "Don't delete an option that has votes; rename it instead.",
      },
      fields: [
        { name: "label", type: "text", required: true },
        { name: "detail", type: "text" },
      ],
    },
    {
      name: "mode",
      type: "select",
      required: true,
      defaultValue: "single",
      options: [
        { label: "One vote each", value: "single" },
        { label: "Ranked top 3 (3, 2, 1 points)", value: "ranked" },
      ],
    },
    {
      name: "sealed",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Hide everyone's votes (you included) until the reveal time. Voting closes then. Once someone has voted, a sealed vote can't be unsealed and the reveal can only move later.",
      },
    },
    {
      name: "revealAt",
      label: "Reveal at",
      type: "date",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
        condition: (_data, sibling: { sealed?: boolean | null }) =>
          Boolean(sibling.sealed),
      },
      validate: (
        value: Date | string | null | undefined,
        { siblingData }: { siblingData: unknown },
      ) => {
        const sealed = (siblingData as { sealed?: boolean | null }).sealed;
        return (
          !sealed || Boolean(value) || "A sealed vote needs a reveal time."
        );
      },
    },
  ],
};

const RsvpBlock: Block = {
  slug: "rsvp",
  interfaceName: "PlanRsvpBlock",
  labels: { singular: "RSVP and bring list", plural: "RSVPs" },
  fields: [
    {
      name: "question",
      type: "text",
      required: true,
      defaultValue: "Are you coming?",
    },
    {
      name: "items",
      label: "Things to bring",
      type: "array",
      maxRows: 60,
      admin: {
        description:
          "People claim items. Each item can be claimed by one person.",
      },
      fields: [
        { name: "name", type: "text", required: true },
        { name: "note", type: "text" },
      ],
    },
  ],
};

const NotesBlock: Block = {
  slug: "notes",
  interfaceName: "PlanNotesBlock",
  labels: { singular: "Notes", plural: "Notes" },
  fields: [
    { name: "heading", type: "text" },
    { name: "body", type: "textarea", required: true, maxLength: 4000 },
  ],
};

interface VoteLike {
  id?: string | null;
  blockType?: string;
  sealed?: boolean | null;
  revealAt?: string | null;
}

/**
 * Plans shared by link at /plans/<shareSlug>. Responses live in the hidden
 * `plan-responses` collection, read only by lib/plans.ts.
 */
export const Plans: CollectionConfig = {
  slug: "plans",
  labels: { singular: "Group plan", plural: "Group plans" },
  admin: {
    group: "Plans",
    useAsTitle: "title",
    defaultColumns: ["title", "link", "updatedAt"],
    description:
      "A page friends open by link: pick their name, then answer date polls, votes and RSVPs.",
  },
  access: privateAccess,
  defaultSort: "-updatedAt",
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === "create" && data && !data["shareSlug"]) {
          data["shareSlug"] = newToken();
        }
        return data;
      },
    ],
    beforeChange: [
      // A sealed vote with answers can't be unsealed or revealed early.
      async ({ data, originalDoc, req }) => {
        const prevBlocks =
          (originalDoc as { blocks?: VoteLike[] } | undefined)?.blocks ?? [];
        const nextBlocks = (data as { blocks?: VoteLike[] }).blocks ?? [];
        const planId = (originalDoc as { id?: number } | undefined)?.id;
        if (planId === undefined) return data;
        for (const prev of prevBlocks) {
          if (prev.blockType !== "choiceVote" || !prev.sealed || !prev.id) {
            continue;
          }
          const next = nextBlocks.find((b) => b.id === prev.id);
          if (!next) continue;
          const earlier =
            !next.sealed ||
            !next.revealAt ||
            (prev.revealAt &&
              new Date(next.revealAt).getTime() <
                new Date(prev.revealAt).getTime());
          if (!earlier) continue;
          const { totalDocs } = await req.payload.count({
            collection: "plan-responses",
            where: {
              and: [
                { planId: { equals: planId } },
                { blockId: { equals: prev.id } },
              ],
            },
            overrideAccess: true,
          });
          if (totalDocs > 0) {
            throw new APIError(
              "People have voted in a sealed vote, so it stays sealed and its reveal time can only move later.",
              400,
              undefined,
              true,
            );
          }
        }
        return data;
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await req.payload.delete({
          collection: "plan-responses",
          where: { planId: { equals: (doc as { id: number }).id } },
          overrideAccess: true,
          req,
        });
      },
    ],
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "intro",
      type: "textarea",
      maxLength: 2000,
      admin: { description: "Optional note shown at the top of the plan." },
    },
    {
      name: "participants",
      label: "People",
      type: "array",
      maxRows: 50,
      admin: {
        description:
          "Everyone in the plan. They pick their name from this list. Rename rather than delete someone who has answered.",
      },
      fields: [{ name: "name", type: "text", required: true }],
    },
    {
      name: "blocks",
      label: "Sections",
      type: "blocks",
      blocks: [DatePollBlock, ChoiceVoteBlock, RsvpBlock, NotesBlock],
    },
    {
      name: "closed",
      label: "Closed",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Tick to stop new answers. The page stays readable.",
      },
    },
    {
      name: "shareSlug",
      label: "Share slug",
      type: "text",
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Set automatically. Anyone with the link can answer.",
      },
    },
    {
      name: "link",
      type: "text",
      virtual: true,
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Send this link.",
      },
      hooks: {
        afterRead: [
          ({ siblingData }: { siblingData?: { shareSlug?: unknown } }) =>
            typeof siblingData?.shareSlug === "string"
              ? `${siteUrl()}/plans/${siblingData.shareSlug}`
              : undefined,
        ],
      },
    },
  ],
};
