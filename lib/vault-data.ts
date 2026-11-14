import config from "@payload-config";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPayload, type DataFromCollectionSlug, type Payload } from "payload";
import { cache } from "react";

import { newToken } from "@/lib/tokens";

/**
 * Vault reads for pages. Every call passes the logged-in user with
 * overrideAccess: false, so the collections' own access rules (login
 * required) apply even if a page forgets its owner check.
 */

export type VaultRecord = DataFromCollectionSlug<"vault-records">;
export type VaultFile = DataFromCollectionSlug<"vault-files">;
export type FileDrop = DataFromCollectionSlug<"file-drops">;
export type Snippet = DataFromCollectionSlug<"snippets">;

type User = NonNullable<Awaited<ReturnType<Payload["auth"]>>["user"]>;

/** Payload + the owner. 404s for anyone else. */
export const ownerContext = cache(
  async (): Promise<{ payload: Payload; user: User }> => {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: await headers() });
    if (!user) notFound();
    return { payload, user };
  },
);

export async function listVaultRecords(): Promise<VaultRecord[]> {
  const { payload, user } = await ownerContext();
  const { docs } = await payload.find({
    collection: "vault-records",
    sort: "title",
    limit: 1000,
    depth: 0,
    user,
    overrideAccess: false,
  });
  return docs;
}

export async function getVaultRecord(id: string): Promise<VaultRecord | null> {
  const { payload, user } = await ownerContext();
  if (!/^\d+$/.test(id)) return null;
  try {
    return await payload.findByID({
      collection: "vault-records",
      id,
      depth: 1,
      user,
      overrideAccess: false,
    });
  } catch {
    return null;
  }
}

export async function listVaultFiles(): Promise<VaultFile[]> {
  const { payload, user } = await ownerContext();
  const { docs } = await payload.find({
    collection: "vault-files",
    sort: "-createdAt",
    limit: 500,
    depth: 0,
    user,
    overrideAccess: false,
  });
  return docs;
}

export async function listFileDrops(): Promise<FileDrop[]> {
  const { payload, user } = await ownerContext();
  const { docs } = await payload.find({
    collection: "file-drops",
    sort: "-createdAt",
    limit: 200,
    depth: 1,
    user,
    overrideAccess: false,
  });
  return docs;
}

export async function listSnippets(): Promise<Snippet[]> {
  const { payload, user } = await ownerContext();
  const { docs } = await payload.find({
    collection: "snippets",
    sort: "title",
    limit: 1000,
    depth: 0,
    user,
    overrideAccess: false,
  });
  return docs;
}

/** Public snippets for /tools/snippets. Selects only display fields. */
export async function listPublicSnippets() {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "snippets",
    where: { public: { equals: true } },
    sort: "title",
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    select: {
      title: true,
      language: true,
      code: true,
      tags: true,
      notes: true,
    },
  });
  return docs;
}

/** Calendar token, created on first use. */
export async function calendarToken(payload: Payload): Promise<string> {
  const settings = await payload.findGlobal({
    slug: "vault-settings",
    overrideAccess: true,
    depth: 0,
  });
  if (settings.calendarToken) return settings.calendarToken;
  // The global's hook makes a token when it's empty; pass one anyway.
  const updated = await payload.updateGlobal({
    slug: "vault-settings",
    data: { calendarToken: newToken() },
    overrideAccess: true,
  });
  return updated.calendarToken ?? "";
}

/** Every record, for the calendar feed (the route checks the token). */
export async function allVaultRecordsForFeed(
  payload: Payload,
): Promise<VaultRecord[]> {
  const { docs } = await payload.find({
    collection: "vault-records",
    where: { archived: { not_equals: true } },
    limit: 2000,
    depth: 0,
    overrideAccess: true,
  });
  return docs;
}
