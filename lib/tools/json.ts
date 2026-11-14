/** JSON formatting, validation and structural diff. Runs in the browser. */

export type JsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string; line?: number; column?: number };

/** Line and column (1-based) of a character offset. */
export function lineColumn(
  text: string,
  offset: number,
): { line: number; column: number } {
  const before = text.slice(0, offset);
  const lines = before.split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

class ScanError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(message);
  }
}

function describeChar(ch: string | undefined): string {
  if (ch === undefined) return "end of input";
  if (ch === "\n") return "a line break";
  return `"${ch}"`;
}

/**
 * Small JSON scanner used only to explain *where* JSON.parse failed, since
 * browsers word (and position) their errors differently.
 */
class JsonScanner {
  private i = 0;

  constructor(private readonly text: string) {}

  scan(): void {
    this.value();
    this.ws();
    if (this.i < this.text.length) {
      throw new ScanError(
        `Unexpected ${describeChar(this.peek())} after the JSON value.`,
        this.i,
      );
    }
  }

  private peek(): string | undefined {
    return this.text[this.i];
  }

  private ws(): void {
    while (" \t\n\r".includes(this.peek() ?? "x")) this.i++;
  }

  private fail(expected: string): never {
    throw new ScanError(
      `Expected ${expected} but found ${describeChar(this.peek())}.`,
      this.i,
    );
  }

  private literal(word: string): void {
    if (!this.text.startsWith(word, this.i)) this.fail("a value");
    this.i += word.length;
  }

  private escape(): void {
    const esc = this.text[this.i + 1] ?? "";
    if (esc === "u") {
      if (!/^[0-9a-fA-F]{4}$/.test(this.text.slice(this.i + 2, this.i + 6))) {
        throw new ScanError("Invalid \\u escape in string.", this.i);
      }
      this.i += 6;
      return;
    }
    if (esc === "" || !'"\\/bfnrt'.includes(esc)) {
      throw new ScanError(`Invalid escape "\\${esc}" in string.`, this.i);
    }
    this.i += 2;
  }

  private string(): void {
    this.i++; // opening quote
    while (this.i < this.text.length) {
      const ch = this.peek() ?? "";
      if (ch === '"') {
        this.i++;
        return;
      }
      if (ch === "\\") {
        this.escape();
        continue;
      }
      if (ch < " ") {
        throw new ScanError(
          "Unescaped control character (like a line break) in string.",
          this.i,
        );
      }
      this.i++;
    }
    throw new ScanError("Unterminated string.", this.i);
  }

  private number(): void {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      this.text.slice(this.i, this.i + 400),
    );
    if (!match) this.fail("a value");
    this.i += match[0].length;
  }

  private value(): void {
    this.ws();
    const ch = this.peek();
    if (ch === "{") this.container("}");
    else if (ch === "[") this.container("]");
    else if (ch === '"') this.string();
    else if (ch === "t") this.literal("true");
    else if (ch === "f") this.literal("false");
    else if (ch === "n") this.literal("null");
    else if (ch === "-" || (ch !== undefined && ch >= "0" && ch <= "9"))
      this.number();
    else if (ch === "'")
      throw new ScanError("Strings must use double quotes.", this.i);
    else this.fail("a value");
  }

  private member(close: "}" | "]"): void {
    if (close === "]") {
      this.value();
      return;
    }
    if (this.peek() !== '"') this.fail("a property name in double quotes");
    this.string();
    this.ws();
    if (this.peek() !== ":") this.fail('":"');
    this.i++;
    this.value();
  }

  private container(close: "}" | "]"): void {
    this.i++;
    this.ws();
    if (this.peek() === close) {
      this.i++;
      return;
    }
    for (;;) {
      this.ws();
      if (this.peek() === close) {
        throw new ScanError(`Trailing comma before ${close}.`, this.i);
      }
      this.member(close);
      this.ws();
      const next = this.peek();
      this.i++;
      if (next === close) return;
      if (next !== ",") {
        this.i--;
        this.fail(`"," or "${close}"`);
      }
    }
  }
}

export function parseJson(text: string): JsonResult {
  if (text.trim() === "") return { ok: false, error: "Input is empty." };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    try {
      new JsonScanner(text).scan();
    } catch (scanError) {
      if (scanError instanceof ScanError) {
        const { line, column } = lineColumn(text, scanError.offset);
        return {
          ok: false,
          error: `Invalid JSON at line ${String(line)}, column ${String(column)}: ${scanError.message}`,
          line,
          column,
        };
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Invalid JSON: ${message}` };
  }
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, sortKeysDeep(record[key])]),
    );
  }
  return value;
}

export function formatJson(
  text: string,
  options: { indent?: number | "\t"; sortKeys?: boolean } = {},
): { ok: true; output: string } | { ok: false; error: string } {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const value = options.sortKeys ? sortKeysDeep(parsed.value) : parsed.value;
  return { ok: true, output: JSON.stringify(value, null, options.indent ?? 2) };
}

export function minifyJson(
  text: string,
): { ok: true; output: string } | { ok: false; error: string } {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  return { ok: true, output: JSON.stringify(parsed.value) };
}

export type DiffKind = "added" | "removed" | "changed";
export interface DiffEntry {
  path: string;
  kind: DiffKind;
  before?: unknown;
  after?: unknown;
}

function pathKey(parent: string, key: string | number): string {
  if (typeof key === "number") return `${parent}[${String(key)}]`;
  return /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${parent}.${key}`
    : `${parent}[${JSON.stringify(key)}]`;
}

function kindOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function diffArrays(
  a: unknown[],
  b: unknown[],
  path: string,
  out: DiffEntry[],
): void {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const p = pathKey(path, i);
    if (i >= a.length) out.push({ path: p, kind: "added", after: b[i] });
    else if (i >= b.length)
      out.push({ path: p, kind: "removed", before: a[i] });
    else diffJson(a[i], b[i], p, out);
  }
}

function diffObjects(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  path: string,
  out: DiffEntry[],
): void {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const p = pathKey(path, key);
    if (!Object.hasOwn(a, key))
      out.push({ path: p, kind: "added", after: b[key] });
    else if (!Object.hasOwn(b, key))
      out.push({ path: p, kind: "removed", before: a[key] });
    else diffJson(a[key], b[key], p, out);
  }
}

/** Structural diff. Arrays compare by index; object key order is ignored. */
export function diffJson(
  before: unknown,
  after: unknown,
  path = "$",
  out: DiffEntry[] = [],
): DiffEntry[] {
  const kind = kindOf(before);
  if (kind !== kindOf(after)) {
    out.push({ path, kind: "changed", before, after });
  } else if (kind === "array") {
    diffArrays(before as unknown[], after as unknown[], path, out);
  } else if (kind === "object") {
    diffObjects(
      before as Record<string, unknown>,
      after as Record<string, unknown>,
      path,
      out,
    );
  } else if (before !== after) {
    out.push({ path, kind: "changed", before, after });
  }
  return out;
}
