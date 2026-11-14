"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { languageLabel, tokenize, type TokenType } from "@/lib/highlight";
import { cn } from "@/lib/utils";

export interface SnippetItem {
  id: number | string;
  title: string;
  language: string;
  code: string;
  tags?: string[] | null;
  notes?: string | null;
  isPublic?: boolean;
  editHref?: string;
}

const TOKEN_CLASS: Record<TokenType, string> = {
  comment: "text-muted-foreground italic",
  string: "text-[oklch(0.5_0.12_150)] dark:text-[oklch(0.8_0.12_150)]",
  number: "text-[oklch(0.55_0.15_45)] dark:text-[oklch(0.8_0.12_60)]",
  keyword: "text-primary font-medium",
  plain: "",
};

function Code({
  code,
  language,
}: Readonly<{ code: string; language: string }>) {
  const tokens = useMemo(() => tokenize(code, language), [code, language]);
  return (
    <pre
      // Focusable so keyboard users can scroll long lines sideways.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region
      tabIndex={0}
      aria-label={`${languageLabel(language)} code`}
      className="bg-muted overflow-x-auto rounded-md p-4 font-mono text-[0.8rem] leading-relaxed"
    >
      <code>
        {tokens.map((token, i) =>
          token.type === "plain" ? (
            token.text
          ) : (
            <span key={i} className={TOKEN_CLASS[token.type]}>
              {token.text}
            </span>
          ),
        )}
      </code>
    </pre>
  );
}

function matches(snippet: SnippetItem, query: string): boolean {
  if (!query) return true;
  const haystack = [
    snippet.title,
    snippet.language,
    languageLabel(snippet.language),
    snippet.code,
    snippet.notes ?? "",
    ...(snippet.tags ?? []),
  ]
    .join("\n")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export function SnippetList({
  snippets,
}: Readonly<{ snippets: SnippetItem[] }>) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const shown = snippets.filter((s) => matches(s, query.trim()));

  return (
    <div>
      <div className="relative max-w-md">
        <label htmlFor={searchId} className="sr-only">
          Search snippets
        </label>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Search title, tag or code"
          className="border-input bg-background focus-visible:ring-ring/40 h-10 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus-visible:ring-2"
        />
      </div>
      <p className="text-muted-foreground mt-3 text-sm" aria-live="polite">
        {shown.length === snippets.length
          ? `${String(snippets.length)} snippets`
          : `${String(shown.length)} of ${String(snippets.length)} snippets`}
      </p>

      <ul className="mt-6 space-y-8">
        {shown.map((snippet) => (
          <li key={snippet.id}>
            <article aria-labelledby={`snippet-${String(snippet.id)}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2
                    id={`snippet-${String(snippet.id)}`}
                    className="text-lg font-medium"
                  >
                    {snippet.title}
                  </h2>
                  <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span className="meta-label">
                      {languageLabel(snippet.language)}
                    </span>
                    {(snippet.tags ?? []).map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                    {snippet.isPublic === undefined ? null : (
                      <span
                        className={cn(
                          snippet.isPublic ? "text-foreground" : undefined,
                        )}
                      >
                        {snippet.isPublic ? "Public" : "Private"}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {snippet.editHref ? (
                    <a
                      href={snippet.editHref}
                      className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                    >
                      Edit
                    </a>
                  ) : null}
                  <CopyButton text={snippet.code} label={snippet.title} />
                </div>
              </div>
              <div className="mt-3">
                <Code code={snippet.code} language={snippet.language} />
              </div>
              {snippet.notes ? (
                <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">
                  {snippet.notes}
                </p>
              ) : null}
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
