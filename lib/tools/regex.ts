/** Regex testing with JavaScript's own RegExp engine. Runs in the browser. */

export interface RegexGroup {
  name: string;
  value: string | undefined;
}

export interface RegexMatch {
  index: number;
  end: number;
  text: string;
  groups: RegexGroup[];
}

export type RegexResult =
  | { ok: true; matches: RegexMatch[]; truncated: boolean }
  | { ok: false; error: string };

export const MAX_MATCHES = 1000;
const VALID_FLAGS = /^[dgimsuvy]*$/;

export function buildRegex(
  pattern: string,
  flags: string,
): { ok: true; regex: RegExp } | { ok: false; error: string } {
  if (!VALID_FLAGS.test(flags)) {
    return {
      ok: false,
      error: `Unknown flag in "${flags}". Use d, g, i, m, s, u, v or y.`,
    };
  }
  if (new Set(flags).size !== flags.length) {
    return { ok: false, error: "Each flag can be used only once." };
  }
  if (flags.includes("u") && flags.includes("v")) {
    return { ok: false, error: "The u and v flags can't be used together." };
  }
  try {
    return { ok: true, regex: new RegExp(pattern, flags) };
  } catch (error) {
    // V8 prefixes "Invalid regular expression: /pattern/flags: "; keep the reason.
    const raw = error instanceof Error ? error.message : String(error);
    const reason = raw.slice(raw.lastIndexOf(": ") + 2) || raw;
    return { ok: false, error: `Invalid regular expression: ${reason}` };
  }
}

function groupsOf(match: RegExpExecArray): RegexGroup[] {
  // Numbered groups first ($1, $2 …), then named groups (which also have a
  // number, so they appear in both lists, as in the JS API).
  const groups: RegexGroup[] = [];
  for (let i = 1; i < match.length; i++) {
    groups.push({ name: `$${String(i)}`, value: match[i] });
  }
  for (const [name, value] of Object.entries(match.groups ?? {})) {
    groups.push({ name, value });
  }
  return groups;
}

function toMatch(m: RegExpExecArray): RegexMatch {
  return {
    index: m.index,
    end: m.index + m[0].length,
    text: m[0],
    groups: groupsOf(m),
  };
}

/** After an empty match, step past one character (a whole code point with u/v). */
function stepOverEmpty(regex: RegExp, text: string): void {
  const unicode = regex.unicode || regex.unicodeSets;
  const code = text.codePointAt(regex.lastIndex) ?? 0;
  regex.lastIndex += unicode && code > 0xffff ? 2 : 1;
}

export function runRegex(
  pattern: string,
  flags: string,
  text: string,
): RegexResult {
  if (pattern === "") return { ok: true, matches: [], truncated: false };
  const built = buildRegex(pattern, flags);
  if (!built.ok) return built;
  const { regex } = built;

  if (!regex.global) {
    const m = regex.exec(text);
    return { ok: true, matches: m ? [toMatch(m)] : [], truncated: false };
  }

  const matches: RegexMatch[] = [];
  regex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    matches.push(toMatch(m));
    if (m[0] === "") stepOverEmpty(regex, text);
    if (matches.length >= MAX_MATCHES) {
      return { ok: true, matches, truncated: true };
    }
  }
  return { ok: true, matches, truncated: false };
}

export interface Segment {
  text: string;
  /** Index into matches, or null for unmatched text. */
  match: number | null;
}

/** Splits text into plain and matched segments for highlighting. */
export function segmentText(text: string, matches: RegexMatch[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.end === m.index) return;
    if (m.index > cursor)
      segments.push({ text: text.slice(cursor, m.index), match: null });
    segments.push({ text: text.slice(m.index, m.end), match: i });
    cursor = m.end;
  });
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), match: null });
  return segments;
}
