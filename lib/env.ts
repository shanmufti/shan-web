/** Typed accessors for process.env under noPropertyAccessFromIndexSignature. */

export function env(name: string): string | undefined {
  return process.env[name];
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function envOr(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}
