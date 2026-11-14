import type { Metadata } from "next";
import { cache, Suspense } from "react";

import { HobbyFilters } from "@/components/hobby-filters";
import { FeaturedCard } from "@/components/post-card";
import { ProjectCard } from "@/components/project-card";
import {
  HubEmpty,
  HubGridSkeleton,
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
} from "@/lib/hub-filters";
import { mediaAlt, mediaUrl } from "@/lib/journeys";

export const metadata: Metadata = { title: "Tech" };

const techNotes = cache(() => listPublished("tech", { depth: 1 }));

async function TechStats() {
  const notes = await techNotes();
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

async function TechBody({
  searchParams,
}: Readonly<{ searchParams: PageProps<"/tech">["searchParams"] }>) {
  const [notes, params] = await Promise.all([techNotes(), searchParams]);
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
            image={mediaUrl(featured.cover)}
            imageAlt={mediaAlt(featured.cover)}
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

export default function TechIndex({
  searchParams,
}: Readonly<PageProps<"/tech">>) {
  return (
    <SectionHub
      tone="kelp"
      title="Tech"
      intro="[Intro: Shan to write]"
      stats={
        <Suspense fallback={null}>
          <TechStats />
        </Suspense>
      }
    >
      <Suspense fallback={<HubGridSkeleton />}>
        <TechBody searchParams={searchParams} />
      </Suspense>
    </SectionHub>
  );
}
