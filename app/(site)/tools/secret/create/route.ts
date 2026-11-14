import { hashedClientKey, takeRateLimit } from "@/lib/rate-limit";
import { SECRET_CREATE_LIMIT, secretExpiryMs } from "@/lib/secret-options";
import {
  createSecret,
  deleteExpiredSecrets,
  isValidSecretInput,
} from "@/lib/secrets";

const HOUR_MS = 60 * 60 * 1000;
const MAX_BODY_BYTES = 20_000;

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Stores an already-encrypted secret. The body holds ciphertext, IV, optional
 * PBKDF2 salt and the expiry choice; the key never comes here.
 */
export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) {
    return json({ error: "That secret is too long." }, 413);
  }
  const key = hashedClientKey(request, "secret");
  if (!(await takeRateLimit(key, SECRET_CREATE_LIMIT, HOUR_MS))) {
    return json(
      { error: "Too many secrets from here. Try again in an hour." },
      429,
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return json({ error: "That secret is too long." }, 413);
    }
    body = JSON.parse(text);
  } catch {
    return json({ error: "Couldn't read that." }, 400);
  }
  const expiresIn = secretExpiryMs((body as { expiresIn?: unknown }).expiresIn);
  const { ciphertext, iv, salt } = body as Record<string, unknown>;
  const input = { ciphertext, iv, salt: salt ?? null };
  if (expiresIn === null || !isValidSecretInput(input)) {
    return json({ error: "Couldn't read that." }, 400);
  }

  try {
    await deleteExpiredSecrets();
    const created = await createSecret(input, expiresIn);
    return json(created, 201);
  } catch (err) {
    console.error(err);
    return json({ error: "Couldn't save the secret. Try again." }, 500);
  }
}
