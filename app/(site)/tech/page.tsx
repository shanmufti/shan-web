import type { Metadata } from "next";

import { tech } from "#velite";
import { ProjectCard } from "@/components/project-card";

export const metadata: Metadata = { title: "Tech" };

export default function TechIndex() {
  const projects = [...tech].sort(
    (a, b) => +new Date(b.date) - +new Date(a.date),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-2xl font-semibold">Tech</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard
            key={project.slug}
            href={project.permalink}
            title={project.title}
            summary={project.summary}
            tags={project.tags}
            repoUrl={project.repoUrl}
            demoUrl={project.demoUrl}
          />
        ))}
        {projects.length === 0 ? (
          <p className="text-muted-foreground text-sm">No projects yet.</p>
        ) : null}
      </div>
    </div>
  );
}
