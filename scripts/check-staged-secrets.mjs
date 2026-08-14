#!/usr/bin/env node
/**
 * Scan staged files for likely secrets before commit.
 * Exit 1 if anything matches — does not print secret values.
 */
import { execFileSync } from "node:child_process";

const patterns = [
  {
    name: "Postgres connection string",
    regex: /postgres(?:ql)?:\/\/[^\s'"`]+/i,
  },
  {
    name: "Neon password token (npg_…)",
    regex: /\bnpg_[A-Za-z0-9]+\b/,
  },
  {
    name: "PEM private key",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "Hardcoded PAYLOAD_SECRET assignment",
    regex: /PAYLOAD_SECRET\s*=\s*['"][^'"]+['"]/,
  },
  {
    name: "Hardcoded R2_SECRET_ACCESS_KEY assignment",
    regex: /R2_SECRET_ACCESS_KEY\s*=\s*['"][^'"]+['"]/,
  },
  {
    name: "Hardcoded R2_ACCESS_KEY_ID assignment",
    regex: /R2_ACCESS_KEY_ID\s*=\s*['"][^'"]+['"]/,
  },
  {
    name: "Hardcoded DATABASE_URL assignment",
    regex: /DATABASE_URL(?:_UNPOOLED)?\s*=\s*['"][^'"]+['"]/,
  },
];

function stagedFiles() {
  return execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
    { encoding: "utf8" },
  )
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function stagedContent(file) {
  return execFileSync("git", ["show", `:${file}`], { encoding: "utf8" });
}

const hits = [];

const ALLOWED_ENV_FILES = new Set([
  ".env.example",
  ".env.sample",
  ".env.template",
]);

for (const file of stagedFiles()) {
  if (file.startsWith(".env") && !ALLOWED_ENV_FILES.has(file)) {
    hits.push({ file, name: "Env file must not be committed" });
    continue;
  }
  if (
    file.includes("node_modules/") ||
    file === "scripts/check-staged-secrets.mjs"
  ) {
    continue;
  }

  let content;
  try {
    content = stagedContent(file);
  } catch {
    continue;
  }

  for (const { name, regex } of patterns) {
    if (regex.test(content)) {
      hits.push({ file, name });
    }
  }
}

if (hits.length > 0) {
  console.error("\nCommit blocked: possible secrets in staged files:\n");
  for (const { file, name } of hits) {
    console.error(`  - ${file}: ${name}`);
  }
  console.error(
    "\nRemove the secrets (use .env.local / Vercel env vars) and try again.\n",
  );
  process.exit(1);
}
