import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Disclosure } from "@/components/disclosure";
import { HobbyFilters, type FilterField } from "@/components/hobby-filters";
import { AddReferenceForm } from "@/components/hobbies/hobby-forms";
import { HobbyIcon } from "@/components/hobbies/hobby-icon";
import { HobbyReferenceCard } from "@/components/hobbies/hobby-reference-card";
import { HUB_DETAIL, PageTransition } from "@/components/page-transition";
import { getHobbyPage, type HobbyReference } from "@/lib/hobbies";
import {
  hobbyDescription,
  REFERENCE_KINDS,
  REFERENCE_STATUSES,
  SKILL_LEVELS,
} from "@/lib/hobby-options";
import { visibleSections } from "@/lib/site-access";
import { sectionForPath } from "@/lib/site-sections";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}>;

const NO_TOPIC = "General";

// Filters (searchParams) and the owner's view are per request.
// Anonymous visitors get the cached public read (lib/hobbies.ts); the
// owner's private data is never cached.
export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getHobbyPage(slug);
  if (!data) return {};
  return {
    title: data.hobby.name,
    ...(data.hobby.public === false
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}

function param(searchParams: SearchParams, key: string): string {
  const value = searchParams[key];
  return typeof value === "string" ? value : "";
}

interface Filters {
  topic: string;
  kind: string;
  level: string;
  status: string;
}

function applyFilters(refs: HobbyReference[], f: Filters) {
  return refs.filter(
    (r) =>
      (!f.topic || (r.topic?.trim() ?? "") === f.topic) &&
      (!f.kind || r.kind === f.kind) &&
      (!f.level || r.skillLevel === f.level) &&
      (!f.status || r.status === f.status),
  );
}

function groupByTopic(refs: HobbyReference[]) {
  const groups = new Map<string, HobbyReference[]>();
  for (const ref of refs) {
    const topic = ref.topic?.trim() ?? "";
    const list = groups.get(topic) ?? [];
    list.push(ref);
    groups.set(topic, list);
  }
  // Named topics alphabetically, untitled ones last.
  return [...groups.entries()].sort(([a], [b]) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  });
}

async function canOpenPath(href: string | null | undefined) {
  if (!href) return false;
  const section = sectionForPath(href.split(/[?#]/)[0] ?? href);
  if (!section) return true;
  const visible = await visibleSections();
  return visible.some((s) => s.key === section.key);
}

function topicId(topic: string) {
  return `topic-${topic.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-") || "general"}`;
}

function readFilters(sp: SearchParams): Filters {
  const pick = (key: string, options: readonly { value: string }[]) => {
    const value = param(sp, key);
    return options.some((o) => o.value === value) ? value : "";
  };
  return {
    topic: param(sp, "topic"),
    kind: pick("kind", REFERENCE_KINDS),
    level: pick("level", SKILL_LEVELS),
    status: pick("status", REFERENCE_STATUSES),
  };
}

function topicsOf(references: HobbyReference[]) {
  const names = references
    .map((r) => r.topic?.trim() ?? "")
    .filter((t) => t !== "");
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

/** Filter selects, offering only values that occur in this hobby. */
function filterFieldsFor(
  references: HobbyReference[],
  filters: Filters,
  topics: string[],
): FilterField[] {
  const present = (key: keyof HobbyReference) =>
    new Set<unknown>(references.map((r) => r[key]));
  const kinds = present("kind");
  const levels = present("skillLevel");
  const statuses = present("status");
  return [
    {
      name: "topic",
      label: "Topic",
      value: filters.topic,
      options: topics.map((t) => ({ value: t, label: t })),
    },
    {
      name: "kind",
      label: "Kind",
      value: filters.kind,
      options: REFERENCE_KINDS.filter((o) => kinds.has(o.value)),
    },
    {
      name: "level",
      label: "Level",
      value: filters.level,
      options: SKILL_LEVELS.filter((o) => levels.has(o.value)),
    },
    {
      name: "status",
      label: "Status",
      value: filters.status,
      options: REFERENCE_STATUSES.filter((o) => statuses.has(o.value)),
    },
  ];
}

export default async function HobbyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const data = await getHobbyPage(slug);
  if (!data) notFound();
  const { hobby, references, isOwner } = data;

  const filters = readFilters(await searchParams);
  const topics = topicsOf(references);
  const showSectionLink = await canOpenPath(hobby.sectionHref);
  const href = `/hobbies/${hobby.slug}`;

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-10">
        <header className="pt-10 pb-8 sm:pt-16">
          <Link
            transitionTypes={HUB_DETAIL}
            href="/hobbies"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            All hobbies
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="bg-accent text-accent-foreground grid size-12 shrink-0 place-items-center rounded-xl">
              <HobbyIcon name={hobby.icon} className="size-6" />
            </span>
            <h1 className="font-heading text-[clamp(2.25rem,4vw,3.5rem)] leading-none">
              {hobby.name}
            </h1>
            {hobby.public === false ? (
              <span className="border-border text-muted-foreground inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs">
                <Lock aria-hidden="true" className="size-3" />
                Private
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
            {hobbyDescription(hobby.description)}
          </p>
          {showSectionLink && hobby.sectionHref ? (
            <Link
              href={hobby.sectionHref}
              className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
            >
              More in {hobby.name}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </header>

        {isOwner ? (
          <Disclosure
            summary="Add a reference"
            defaultOpen={references.length === 0}
            className="mb-10"
          >
            <p className="text-muted-foreground mb-4 text-sm">
              Paste a link. Title, thumbnail and source are filled in from
              YouTube, Vimeo or the page’s preview tags when available.
            </p>
            <AddReferenceForm hobbyId={hobby.id} topics={topics} />
          </Disclosure>
        ) : null}

        <ReferencesSection
          href={href}
          references={references}
          filters={filters}
          topics={topics}
          isOwner={isOwner}
        />
      </div>
    </PageTransition>
  );
}

function ReferencesSection({
  href,
  references,
  filters,
  topics,
  isOwner,
}: Readonly<{
  href: string;
  references: HobbyReference[];
  filters: Filters;
  topics: string[];
  isOwner: boolean;
}>) {
  const filterActive = Object.values(filters).some(Boolean);
  const shown = applyFilters(references, filters);
  const groups = groupByTopic(shown);
  const filterFields = filterFieldsFor(references, filters, topics);

  return (
    <section aria-labelledby="references-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="references-heading"
          className="text-xl font-semibold tracking-tight"
        >
          References
        </h2>
        {references.length > 0 ? (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {filterActive
              ? `${String(shown.length)} of ${String(references.length)}`
              : String(references.length)}
          </p>
        ) : null}
      </div>

      {references.length === 0 ? (
        <div className="border-border text-muted-foreground mt-4 rounded-xl border border-dashed px-4 py-10 text-center text-sm">
          No references yet.
          {isOwner ? " Add the first one above." : ""}
        </div>
      ) : (
        <>
          <div className="mt-4">
            <HobbyFilters
              key={JSON.stringify(filters)}
              action={href}
              fields={filterFields}
              active={filterActive}
            />
          </div>
          {topics.length > 1 && !filters.topic ? (
            <nav
              aria-label="Topics"
              className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm"
            >
              {groups.map(([topic]) => (
                <a
                  key={topic}
                  href={`#${topicId(topic)}`}
                  className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  {topic || NO_TOPIC}
                </a>
              ))}
            </nav>
          ) : null}
          {shown.length === 0 ? (
            <p className="text-muted-foreground mt-8 text-sm">
              Nothing matches these filters.{" "}
              <Link
                href={href}
                scroll={false}
                className="text-foreground underline underline-offset-4"
              >
                Clear filters
              </Link>
            </p>
          ) : (
            <div className="mt-8 space-y-10">
              {groups.map(([topic, refs]) => (
                <section
                  key={topic}
                  aria-labelledby={topicId(topic)}
                  className="scroll-mt-24"
                >
                  <h3
                    id={topicId(topic)}
                    className="meta-label text-muted-foreground scroll-mt-24"
                  >
                    {topic || NO_TOPIC}{" "}
                    <span className="font-normal">· {refs.length}</span>
                  </h3>
                  <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {refs.map((ref) => (
                      <li key={ref.id}>
                        <HobbyReferenceCard reference={ref} isOwner={isOwner} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
