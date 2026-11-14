"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { getPayload, type RequiredDataFromCollectionSlug } from "payload";

import { getCurrentUser } from "@/lib/content";
import {
  isOptionValue,
  REFERENCE_KINDS,
  REFERENCE_STATUSES,
  SKILL_LEVELS,
} from "@/lib/hobby-options";
import {
  fallbackTitle,
  parseHttpUrl,
  parseTimestamp,
} from "@/lib/link-metadata";

export interface HobbyFormState {
  ok?: boolean;
  message?: string;
  error?: string;
  /** Bumped on success so the client form can reset itself. */
  savedAt?: number;
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalNumber(formData: FormData, name: string): number | undefined {
  const value = text(formData, name);
  if (value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/** Owner-only: the hobby id from the form, checked against the database. */
async function ownerHobby(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to add to this page." } as const;
  const payload = await getPayload({ config });
  const id = Number(text(formData, "hobbyId"));
  if (!Number.isInteger(id)) return { error: "Unknown hobby." } as const;
  const hobby = await payload
    .findByID({
      collection: "hobbies",
      id,
      depth: 0,
      user,
      overrideAccess: false,
    })
    .catch(() => null);
  if (!hobby) return { error: "Unknown hobby." } as const;
  return { payload, user, hobby } as const;
}

export async function addHobbyReference(
  _prev: HobbyFormState,
  formData: FormData,
): Promise<HobbyFormState> {
  const context = await ownerHobby(formData);
  if ("error" in context) return { error: context.error };
  const { payload, user, hobby } = context;

  const url = text(formData, "url");
  if (!parseHttpUrl(url)) {
    return { error: "Paste a full link starting with https://" };
  }
  const kind = text(formData, "kind");
  const level = text(formData, "skillLevel");
  const status = text(formData, "status");
  const start = text(formData, "start");
  const startSeconds = start === "" ? undefined : parseTimestamp(start);
  if (start !== "" && startSeconds === undefined) {
    return { error: "Start time must look like 90, 1:30 or 1m30s." };
  }

  try {
    const created = await payload.create({
      collection: "hobby-references",
      data: {
        hobby: hobby.id,
        url,
        // Blank title/thumbnail/provider are filled by the collection hook.
        title: text(formData, "title"),
        topic: text(formData, "topic") || null,
        ...(isOptionValue(REFERENCE_KINDS, kind) ? { kind } : {}),
        skillLevel: isOptionValue(SKILL_LEVELS, level) ? level : null,
        status: isOptionValue(REFERENCE_STATUSES, status) ? status : "to-watch",
        ...(startSeconds === undefined ? {} : { startSeconds }),
        note: text(formData, "note") || null,
        public: formData.get("public") === "on",
        // kind and title may be blank here; the beforeValidate hook fills them.
      } as RequiredDataFromCollectionSlug<"hobby-references">,
      user,
      overrideAccess: false,
    });
    revalidatePath(`/hobbies/${hobby.slug}`);
    revalidatePath("/hobbies");
    const fetched = created.title !== fallbackTitle(url);
    return {
      ok: true,
      savedAt: Date.now(),
      message: fetched
        ? `Saved “${created.title}”.`
        : `Saved. Couldn’t read details from the link, so the title is “${created.title}”; edit it in admin if needed.`,
    };
  } catch (error) {
    console.error(error);
    return { error: "Could not save the link. Try again." };
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function addPracticeSession(
  _prev: HobbyFormState,
  formData: FormData,
): Promise<HobbyFormState> {
  const context = await ownerHobby(formData);
  if ("error" in context) return { error: context.error };
  const { payload, user, hobby } = context;

  const date = text(formData, "date");
  const focus = text(formData, "focus");
  if (!DATE_RE.test(date)) return { error: "Pick a date." };
  if (!focus) return { error: "Say what you worked on." };
  const duration = optionalNumber(formData, "durationMinutes");
  if (duration !== undefined && (duration < 0 || duration > 1440)) {
    return { error: "Duration must be between 0 and 1440 minutes." };
  }
  const feeling = optionalNumber(formData, "feeling");
  const references = formData
    .getAll("references")
    .map(Number)
    .filter((id) => Number.isInteger(id));

  try {
    await payload.create({
      collection: "practice-sessions",
      data: {
        hobby: hobby.id,
        date: `${date}T12:00:00.000Z`,
        focus,
        durationMinutes: duration ?? null,
        location: text(formData, "location") || null,
        feeling:
          feeling !== undefined && feeling >= 1 && feeling <= 5
            ? feeling
            : null,
        references,
        notes: text(formData, "notes") || null,
      },
      user,
      overrideAccess: false,
    });
    revalidatePath(`/hobbies/${hobby.slug}`);
    return { ok: true, savedAt: Date.now(), message: "Session logged." };
  } catch (error) {
    console.error(error);
    return { error: "Could not save the session. Try again." };
  }
}
