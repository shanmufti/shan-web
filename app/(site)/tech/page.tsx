import type { Metadata } from "next";
import { getPayload } from "payload";

import config from "@payload-config";
import { ProjectCard } from "@/components/project-card";

export const metadata: Metadata = { title: "Tech" };

export default async function TechIndex() {
  const payload = await getPayload({ config });
  const { docs: projects } = await payload.find({
    collection: "tech",
    where: { draft: { equals: false } },
    sort: "-date",
    limit: 100,
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-2xl font-semibold">Tech</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard
            key={project.slug}
            href={`/tech/${project.slug}`}
            title={project.title}
            summary={project.summary}
            tags={project.tags ?? []}
            repoUrl={project.repoUrl ?? undefined}
            demoUrl={project.demoUrl ?? undefined}
          />
        ))}
        {projects.length === 0 ? (
          <p className="text-muted-foreground text-sm">No projects yet.</p>
        ) : null}
      </div>
    </div>
  );
}
