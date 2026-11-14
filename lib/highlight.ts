/**
 * Very small syntax highlighter for snippets: comments, strings, numbers and
 * keywords only. Returns tokens that the page renders as plain spans, so no
 * HTML is ever built from snippet text.
 */

export const SNIPPET_LANGUAGES = [
  { value: "bash", label: "Shell" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "text", label: "Plain text" },
] as const;

export type SnippetLanguage = (typeof SNIPPET_LANGUAGES)[number]["value"];

export function languageLabel(value: string | null | undefined): string {
  return SNIPPET_LANGUAGES.find((l) => l.value === value)?.label ?? "Code";
}

export type TokenType = "comment" | "string" | "number" | "keyword" | "plain";
export interface Token {
  type: TokenType;
  text: string;
}

interface LanguageRules {
  comments: RegExp[];
  strings: RegExp[];
  keywords: string[];
  caseInsensitive?: boolean;
}

const DOUBLE = /"(?:[^"\\\n]|\\.)*"?/y;
const SINGLE = /'(?:[^'\\\n]|\\.)*'?/y;
const BACKTICK = /`(?:[^`\\]|\\.)*`?/y;
const SLASH_LINE = /\/\/[^\n]*/y;
const SLASH_BLOCK = /\/\*[\s\S]*?(?:\*\/|$)/y;
const HASH_LINE = /#[^\n]*/y;

function words(list: string): string[] {
  return list.split(" ");
}

const JS_KEYWORDS = words(
  "as async await break case catch class const continue default delete else enum export extends false finally for from function if implements import in instanceof interface let new null of readonly return satisfies static super switch this throw true try type typeof undefined var void while yield",
);

const RULES: Record<SnippetLanguage, LanguageRules> = {
  bash: {
    comments: [HASH_LINE],
    strings: [DOUBLE, SINGLE],
    keywords: words(
      "if then else elif fi for in do done while case esac function return export local set unset echo sudo cd",
    ),
  },
  typescript: {
    comments: [SLASH_LINE, SLASH_BLOCK],
    strings: [DOUBLE, SINGLE, BACKTICK],
    keywords: JS_KEYWORDS,
  },
  javascript: {
    comments: [SLASH_LINE, SLASH_BLOCK],
    strings: [DOUBLE, SINGLE, BACKTICK],
    keywords: JS_KEYWORDS,
  },
  python: {
    comments: [HASH_LINE],
    strings: [/"""[\s\S]*?(?:"""|$)/y, /'''[\s\S]*?(?:'''|$)/y, DOUBLE, SINGLE],
    keywords: words(
      "and as assert async await break class continue def del elif else except False finally for from if import in is lambda None not or pass raise return True try while with yield",
    ),
  },
  sql: {
    comments: [/--[^\n]*/y, SLASH_BLOCK],
    strings: [SINGLE, DOUBLE],
    caseInsensitive: true,
    keywords: words(
      "select from where and or not insert into values update set delete create table index drop alter join left right inner outer on group by order limit offset as with having distinct null is in like returning begin commit rollback",
    ),
  },
  go: {
    comments: [SLASH_LINE, SLASH_BLOCK],
    strings: [DOUBLE, BACKTICK, SINGLE],
    keywords: words(
      "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var nil true false",
    ),
  },
  rust: {
    comments: [SLASH_LINE, SLASH_BLOCK],
    strings: [DOUBLE],
    keywords: words(
      "as async await break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while",
    ),
  },
  json: {
    comments: [],
    strings: [DOUBLE],
    keywords: words("true false null"),
  },
  yaml: {
    comments: [HASH_LINE],
    strings: [DOUBLE, SINGLE],
    keywords: words("true false null yes no"),
  },
  css: {
    comments: [SLASH_BLOCK],
    strings: [DOUBLE, SINGLE],
    keywords: words("@media @import @layer @supports !important"),
  },
  html: {
    comments: [/<!--[\s\S]*?(?:-->|$)/y],
    strings: [DOUBLE, SINGLE],
    keywords: [],
  },
  text: { comments: [], strings: [], keywords: [] },
};

const NUMBER = /\b\d+(?:\.\d+)?\b/y;
const WORD = /[@!]?[A-Za-z_$][\w$-]*/y;

function matchAt(pattern: RegExp, code: string, index: number): string | null {
  pattern.lastIndex = index;
  const match = pattern.exec(code);
  return match && match[0].length > 0 ? match[0] : null;
}

/** The token starting at `i` (always at least one character long). */
function nextToken(
  code: string,
  i: number,
  rules: LanguageRules,
  keywords: Set<string>,
): Token {
  for (const pattern of rules.comments) {
    const text = matchAt(pattern, code, i);
    if (text) return { type: "comment", text };
  }
  for (const pattern of rules.strings) {
    const text = matchAt(pattern, code, i);
    if (text) return { type: "string", text };
  }
  const word = matchAt(WORD, code, i);
  if (word) {
    const key = rules.caseInsensitive ? word.toLowerCase() : word;
    return { type: keywords.has(key) ? "keyword" : "plain", text: word };
  }
  const number = matchAt(NUMBER, code, i);
  if (number) return { type: "number", text: number };
  return { type: "plain", text: code.charAt(i) };
}

export function tokenize(code: string, language: string): Token[] {
  const rules =
    language in RULES ? RULES[language as SnippetLanguage] : RULES.text;
  if (rules === RULES.text) return [{ type: "plain", text: code }];

  const keywords = new Set(
    rules.caseInsensitive
      ? rules.keywords.map((k) => k.toLowerCase())
      : rules.keywords,
  );
  const tokens: Token[] = [];
  let i = 0;
  while (i < code.length) {
    const token = nextToken(code, i, rules, keywords);
    const last = tokens.at(-1);
    // Merge runs of plain text into one string.
    if (token.type === "plain" && last?.type === "plain")
      last.text += token.text;
    else tokens.push(token);
    i += token.text.length;
  }
  return tokens;
}
