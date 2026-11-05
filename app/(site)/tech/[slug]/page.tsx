import { RichText } from "@payloadcms/richtext-lexical/react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getPublishedBySlug } from "@/lib/content";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getPublishedBySlug("tech", slug);
  return project ? { title: project.title, description: project.summary } : {};
}

export default async function TechPost({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const project = await getPublishedBySlug("tech", slug);
  if (!project) notFound();

  return (
    <article className="prose prose-neutral dark:prose-invert mx-auto max-w-[680px] px-6 pt-16 pb-8 sm:pt-24">
      <h1>{project.title}</h1>
      <div className="not-prose flex flex-wrap items-center gap-2">
        {(project.tags ?? []).map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
        {project.repoUrl ? (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Repo
          </a>
        ) : null}
        {project.demoUrl ? (
          <a
            href={project.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Demo
          </a>
        ) : null}
      </div>
      <RichText data={project.body} />
    </article>
  );
}
