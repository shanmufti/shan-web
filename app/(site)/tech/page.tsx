import type { Metadata } from "next";
import { Suspense } from "react";

import { HobbyFilters } from "@/components/hobby-filters";
import { FeaturedCard } from "@/components/post-card";
import { ProjectCard } from "@/components/project-card";
import {
  HubEmpty,
  HubHeading,
  HubStats,
  SectionHub,
} from "@/components/section-hub";
import { listPublished } from "@/lib/content";
import { formatDate } from "@/lib/format-date";
import {
  hasTag,
  param,
  plural,
  tagOptions,
  yearOf,
  yearOptions,
  type SearchParamsRecord,
} from "@/lib/hub-filters";
import { mediaImage } from "@/lib/media";

export const metadata: Metadata = { title: "Tech" };

type Notes = Awaited<ReturnType<typeof listPublished<"tech">>>;

function TechStats({ notes }: Readonly<{ notes: Notes }>) {
  if (notes.length === 0) return null;
  const tags = tagOptions(notes.map((n) => n.tags)).length;
  const years = notes.map((n) => Number(yearOf(n.date)));
  const first = Math.min(...years);
  const last = Math.max(...years);
  return (
    <HubStats
      stats={[
        plural(notes.length, "note", "notes"),
        ...(tags > 0 ? [plural(tags, "tag", "tags")] : []),
        first === last ? String(first) : `${String(first)}–${String(last)}`,
      ]}
    />
  );
}

function TechBody({
  notes,
  params,
}: Readonly<{ notes: Notes; params: SearchParamsRecord }>) {
  if (notes.length === 0) {
    return (
      <div className="mt-14">
        <HubEmpty>No notes yet.</HubEmpty>
      </div>
    );
  }
  const year = param(params, "year");
  const tag = param(params, "tag").toLowerCase();
  const filtered = Boolean(year || tag);
  const shown = notes.filter(
    (n) => (!year || yearOf(n.date) === year) && (!tag || hasTag(n.tags, tag)),
  );
  const featured = filtered ? undefined : notes.find((n) => n.featured);
  const grid = shown.filter((n) => n.id !== featured?.id);

  return (
    <>
      {featured ? (
        <section aria-labelledby="featured-note" className="mt-10">
          <h2 id="featured-note" className="sr-only">
            Featured note
          </h2>
          <FeaturedCard
            href={`/tech/${featured.slug}`}
            title={featured.title}
            summary={featured.summary}
            meta={[formatDate(featured.date), ...(featured.tags ?? [])]
              .map((s, i) => (i === 0 ? s : `#${s}`))
              .join(" · ")}
            image={mediaImage(featured.cover, "card")}
            priority
            placeholder="</>"
          />
        </section>
      ) : null}
      <section aria-labelledby="all-notes">
        <HubHeading
          id="all-notes"
          title={filtered ? plural(shown.length, "note", "notes") : "All notes"}
        />
        <div className="mb-10">
          <HobbyFilters
            action="/tech"
            label="Filter notes"
            active={filtered}
            fields={[
              {
                name: "year",
                label: "Year",
                value: year,
                options: yearOptions(notes.map((n) => n.date)),
              },
              {
                name: "tag",
                label: "Tag",
                value: tag,
                options: tagOptions(notes.map((n) => n.tags)),
              },
            ]}
          />
        </div>
        {grid.length === 0 ? (
          <HubEmpty>No notes match these filters.</HubEmpty>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((note) => (
              <li key={note.id}>
                <ProjectCard
                  href={`/tech/${note.slug}`}
                  title={note.title}
                  summary={note.summary}
                  meta={formatDate(note.date)}
                  tags={note.tags ?? []}
                  repoUrl={note.repoUrl ?? undefined}
                  demoUrl={note.demoUrl ?? undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

async function FilteredNotes({
  notes,
  searchParams,
}: Readonly<{
  notes: Notes;
  searchParams: PageProps<"/tech">["searchParams"];
}>) {
  return <TechBody notes={notes} params={await searchParams} />;
}

export default async function TechIndex({
  searchParams,
}: Readonly<PageProps<"/tech">>) {
  const notes = await listPublished("tech", { depth: 1 });
  return (
    <SectionHub
      tone="kelp"
      title="Tech"
      intro="[Intro: Shan to write]"
      stats={<TechStats notes={notes} />}
    >
      {/* The shell shows every note; filters apply per request. */}
      <Suspense fallback={<TechBody notes={notes} params={{}} />}>
        <FilteredNotes notes={notes} searchParams={searchParams} />
      </Suspense>
    </SectionHub>
  );
}
