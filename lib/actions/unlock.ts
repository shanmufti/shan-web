"use server";

import { createHash } from "node:crypto";

import config from "@payload-config";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload, type Payload } from "payload";

import { requireEnv } from "@/lib/env";
import {
  accessTokenFor,
  getPasscodeHash,
  PRIVATE_ACCESS_COOKIE,
  PRIVATE_ACCESS_MAX_AGE,
  verifyPasscode,
} from "@/lib/private-access";

export interface UnlockState {
  error?: string;
}

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

/** Only allow redirects back into this site. */
function safeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

async function visitorKey(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  // Store a keyed hash, never the raw IP.
  return createHash("sha256")
    .update(`${requireEnv("PAYLOAD_SECRET")}:${ip}`)
    .digest("hex");
}

async function isRateLimited(payload: Payload, key: string) {
  const { docs } = await payload.find({
    collection: "unlock-attempts",
    where: { key: { equals: key } },
    limit: 1,
    overrideAccess: true,
  });
  const entry = docs[0];
  if (!entry) return false;
  const fresh = Date.now() - new Date(entry.windowStart).getTime() < WINDOW_MS;
  return fresh && entry.count >= MAX_ATTEMPTS;
}

async function recordFailure(payload: Payload, key: string) {
  const { docs } = await payload.find({
    collection: "unlock-attempts",
    where: { key: { equals: key } },
    limit: 1,
    overrideAccess: true,
  });
  const entry = docs[0];
  const now = new Date();
  if (!entry) {
    await payload.create({
      collection: "unlock-attempts",
      data: { key, count: 1, windowStart: now.toISOString() },
      overrideAccess: true,
    });
    return;
  }
  const expired =
    now.getTime() - new Date(entry.windowStart).getTime() >= WINDOW_MS;
  await payload.update({
    collection: "unlock-attempts",
    id: entry.id,
    data: expired
      ? { count: 1, windowStart: now.toISOString() }
      : { count: entry.count + 1 },
    overrideAccess: true,
  });
}

export async function unlockPrivateContent(
  _prev: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const next = safeNext(formData.get("next"));
  const passcode = formData.get("passcode");
  if (typeof passcode !== "string" || passcode.trim() === "") {
    return { error: "Enter the passcode." };
  }

  const payload = await getPayload({ config });
  const key = await visitorKey();

  if (await isRateLimited(payload, key)) {
    return { error: "Too many tries. Wait 15 minutes and try again." };
  }

  const hash = await getPasscodeHash(payload);
  const ok = hash ? await verifyPasscode(passcode.trim(), hash) : false;
  if (!hash || !ok) {
    await recordFailure(payload, key);
    return { error: "That passcode isn't right." };
  }

  const jar = await cookies();
  jar.set(PRIVATE_ACCESS_COOKIE, accessTokenFor(hash), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PRIVATE_ACCESS_MAX_AGE,
  });

  redirect(next);
}

export async function lockPrivateContent(): Promise<void> {
  const jar = await cookies();
  jar.delete(PRIVATE_ACCESS_COOKIE);
  redirect("/");
}
