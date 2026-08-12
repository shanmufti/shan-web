import { RichText } from "@payloadcms/richtext-lexical/react";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

async function getProject(slug: string) {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "tech",
    where: {
      and: [{ slug: { equals: slug } }, { draft: { equals: false } }],
    },
    limit: 1,
    overrideAccess: false,
  });
  return docs[0];
}

export async function generateStaticParams() {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "tech",
    where: { draft: { equals: false } },
    limit: 0,
  });
  return docs.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  return project ? { title: project.title, description: project.summary } : {};
}

export default async function TechPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  return (
    <article className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-16">
      <h1>{project.title}</h1>
      <div className="not-prose flex flex-wrap items-center gap-2">
        {(project.tags ?? []).map((tag: string) => (
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
      <RichText data={project.body} />
    </article>
  );
}
