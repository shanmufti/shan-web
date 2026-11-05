import type { Metadata } from "next";

import { ProjectCard } from "@/components/project-card";
import { listPublished } from "@/lib/content";

export const metadata: Metadata = { title: "Tech" };

export default async function TechIndex() {
  const projects = await listPublished("tech");

  return (
    <div className="mx-auto max-w-4xl px-6 pt-16 pb-8 sm:pt-24 lg:px-10">
      <h1 className="font-heading text-4xl sm:text-5xl">Tech</h1>
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
