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
