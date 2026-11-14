import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { DetailPager, type PagerItem } from "@/components/detail-pager";
import { ArticleBody } from "@/components/rich-text";
import {
  getPublishedBySlug,
  listPublished,
  staticSlugParams,
} from "@/lib/content";
import { formatDate } from "@/lib/format-date";

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

/** Published posts prerender at build; new ones render on first visit. */
export async function generateStaticParams() {
  return staticSlugParams(await listPublished("tech", { limit: 1000 }));
}

// A slug that isn't prerendered renders (and 404s) at request time.
export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedBySlug("tech", slug);
  return project ? { title: project.title, description: project.summary } : {};
}

type TechDoc = Awaited<ReturnType<typeof listPublished<"tech">>>[number];

function noteLink(doc: TechDoc | undefined): PagerItem | undefined {
  return doc
    ? {
        href: `/tech/${doc.slug}`,
        title: doc.title,
        meta: formatDate(doc.date),
      }
    : undefined;
}

function ExternalButton({
  href,
  label,
}: Readonly<{ href: string; label: string }>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border bg-card hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium"
    >
      {label}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export default async function TechPost({ params }: Props) {
  const { slug } = await params;
  const [project, all] = await Promise.all([
    getPublishedBySlug("tech", slug),
    listPublished("tech"),
  ]);
  if (!project) notFound();

  // Listed newest first.
  const index = all.findIndex((n) => n.id === project.id);
  const older = index >= 0 ? all[index + 1] : undefined;
  const newer = index > 0 ? all[index - 1] : undefined;

  return (
    <article className="px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <header className="mx-auto max-w-[680px]">
        <Breadcrumbs
          items={[{ label: "Tech", href: "/tech" }, { label: project.title }]}
        />
        <p className="meta-label text-muted-foreground mt-8">
          {formatDate(project.date)}
          {(project.tags ?? []).map((tag) => ` · #${tag}`).join("")}
        </p>
        <h1 className="font-heading mt-3 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.04em]">
          {project.title}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">{project.summary}</p>
        {project.repoUrl || project.demoUrl ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {project.repoUrl ? (
              <ExternalButton href={project.repoUrl} label="Repo" />
            ) : null}
            {project.demoUrl ? (
              <ExternalButton href={project.demoUrl} label="Demo" />
            ) : null}
          </div>
        ) : null}
      </header>
      <div className="article-breakout mx-auto mt-10 max-w-[680px]">
        <ArticleBody data={project.body} />
      </div>
      <div className="mx-auto max-w-[680px]">
        <DetailPager
          label="More notes"
          prev={noteLink(older)}
          next={noteLink(newer)}
          prevLabel="Older note"
          nextLabel="Newer note"
        />
      </div>
    </article>
  );
}
