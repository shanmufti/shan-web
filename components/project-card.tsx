import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { HUB_DETAIL } from "./page-transition";

interface ProjectCardProps {
  href: string;
  title: string;
  summary: string;
  tags: string[];
  /** Mono line above the title, e.g. the date. */
  meta?: string | undefined;
  repoUrl?: string | undefined;
  demoUrl?: string | undefined;
}

function ExternalLink({
  href,
  label,
  title,
}: Readonly<{ href: string; label: string; title: string }>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} for ${title} (opens in a new tab)`}
      className="border-border text-muted-foreground hover:text-foreground relative z-10 inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium"
    >
      {label}
      <ArrowUpRight className="size-3" aria-hidden="true" />
    </a>
  );
}

/**
 * Tech note card in the tile style: mono meta, title, summary, tags and
 * optional repo / demo links. The whole card links to the note through a
 * stretched link on the title; the external links sit above it.
 */
export function ProjectCard({
  href,
  title,
  summary,
  tags,
  meta,
  repoUrl,
  demoUrl,
}: Readonly<ProjectCardProps>) {
  return (
    <article className="group bg-card border-border lift relative flex h-full flex-col gap-3 rounded-2xl border p-6 has-[a[data-card-link]:focus-visible]:outline-2 has-[a[data-card-link]:focus-visible]:outline-offset-2">
      {meta ? <p className="meta-label text-muted-foreground">{meta}</p> : null}
      <h3 className="text-lg leading-snug font-medium tracking-[-0.015em]">
        <Link
          transitionTypes={HUB_DETAIL}
          href={href}
          data-card-link
          className="underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-[inherit] after:content-['']"
        >
          {title}
        </Link>
      </h3>
      <p className="text-muted-foreground text-[0.95rem]">{summary}</p>
      {(tags.length > 0 || Boolean(repoUrl ?? demoUrl)) && (
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {tags.map((tag) => (
            <span key={tag} className="meta-label text-accent-foreground">
              #{tag}
            </span>
          ))}
          <span className="ml-auto flex gap-2">
            {repoUrl ? (
              <ExternalLink href={repoUrl} label="Repo" title={title} />
            ) : null}
            {demoUrl ? (
              <ExternalLink href={demoUrl} label="Demo" title={title} />
            ) : null}
          </span>
        </div>
      )}
    </article>
  );
}
