import { notFound } from "next/navigation";

import { tech } from "#velite";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MDXContent } from "@/components/mdx-content";

export function generateStaticParams() {
  return tech.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = tech.find((p) => p.slug === slug);
  return project ? { title: project.title, description: project.summary } : {};
}

export default async function TechPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = tech.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <article className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-16">
      <h1>{project.title}</h1>
      <div className="not-prose flex flex-wrap items-center gap-2">
        {project.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
        {project.repoUrl ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Repo
          </Button>
        ) : null}
        {project.demoUrl ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Demo
          </Button>
        ) : null}
      </div>
      <MDXContent code={project.body} />
    </article>
  );
}
