"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getPayload } from "payload";

import { DROP_EXPIRY_DAYS } from "@/lib/drop-options";
import { siteUrl } from "@/lib/site-url";

export interface CreateDropState {
  error?: string;
  link?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Server action body limit is 4MB (next.config.ts); bigger files go via admin. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 - 64 * 1024;

async function owner() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  return user ? { payload, user } : null;
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createFileDrop(
  _prev: CreateDropState,
  formData: FormData,
): Promise<CreateDropState> {
  const ctx = await owner();
  if (!ctx) return { error: "Log in first." };
  const { payload, user } = ctx;

  const days = Number(text(formData, "expiresInDays"));
  if (!(DROP_EXPIRY_DAYS as readonly number[]).includes(days)) {
    return { error: "Pick when the link should expire." };
  }
  const maxRaw = text(formData, "maxDownloads");
  const maxDownloads = maxRaw === "" ? null : Number(maxRaw);
  if (
    maxDownloads !== null &&
    (!Number.isInteger(maxDownloads) || maxDownloads < 1 || maxDownloads > 1000)
  ) {
    return { error: "Max downloads must be a whole number from 1 to 1000." };
  }
  const note = text(formData, "note").slice(0, 500);

  try {
    let fileId: number | null = null;
    const upload = formData.get("upload");
    if (upload instanceof File && upload.size > 0) {
      if (upload.size > MAX_UPLOAD_BYTES) {
        return {
          error:
            "That file is over 4 MB. Upload it in admin first, then pick it here.",
        };
      }
      const created = await payload.create({
        collection: "vault-files",
        data: {},
        file: {
          data: Buffer.from(await upload.arrayBuffer()),
          mimetype: upload.type || "application/octet-stream",
          name: upload.name || "file",
          size: upload.size,
        },
        user,
        overrideAccess: false,
      });
      fileId = created.id;
    } else {
      const picked = Number(text(formData, "fileId"));
      if (Number.isInteger(picked) && picked > 0) fileId = picked;
    }
    if (fileId === null) return { error: "Pick a file or upload one." };

    const drop = await payload.create({
      collection: "file-drops",
      data: {
        file: fileId,
        expiresAt: new Date(Date.now() + days * DAY_MS).toISOString(),
        maxDownloads,
        note: note || null,
        downloadCount: 0,
      },
      user,
      overrideAccess: false,
    });
    revalidatePath("/vault/drops");
    return { link: `${siteUrl()}/drop/${drop.token ?? ""}` };
  } catch (err) {
    console.error(err);
    return { error: "Couldn't create the drop. Try again." };
  }
}

/** Ends a drop now by moving its expiry to the current time. */
export async function expireFileDrop(formData: FormData): Promise<void> {
  const ctx = await owner();
  if (!ctx) return;
  const id = Number(text(formData, "id"));
  if (!Number.isInteger(id) || id < 1) return;
  await ctx.payload.update({
    collection: "file-drops",
    id,
    data: { expiresAt: new Date().toISOString() },
    user: ctx.user,
    overrideAccess: false,
  });
  revalidatePath("/vault/drops");
}
