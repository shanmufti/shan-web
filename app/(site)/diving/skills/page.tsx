import type { Metadata } from "next";
import Link from "next/link";

import { DivingSubnav } from "@/components/section-subnav";
import { getCurrentUser, listDiveSkills, listPublished } from "@/lib/content";

export const metadata: Metadata = { title: "Dive skills" };

const categoryLabels: Record<string, string> = {
  buoyancy: "Buoyancy",
  rescue: "Rescue",
  propulsion: "Propulsion",
  equipment: "Equipment",
  other: "Other",
};

const levelLabels: Record<string, string> = {
  learning: "Learning",
  practicing: "Practicing",
  solid: "Solid",
};

export default async function DiveSkillsPage() {
  const [skills, dives, user] = await Promise.all([
    listDiveSkills(),
    listPublished("diving", { depth: 1 }),
    getCurrentUser(),
  ]);

  const practiceCounts = new Map<number, number>();
  for (const dive of dives) {
    if (!Array.isArray(dive.skills)) continue;
    for (const skill of dive.skills) {
      const id = typeof skill === "object" ? skill.id : skill;
      if (typeof id === "number") {
        practiceCounts.set(id, (practiceCounts.get(id) ?? 0) + 1);
      }
    }
  }

  const byCategory = new Map<string, typeof skills>();
  for (const skill of skills) {
    const key = skill.category;
    const list = byCategory.get(key) ?? [];
    list.push(skill);
    byCategory.set(key, list);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 pt-16 pb-8 sm:pt-24 lg:px-10">
      <header>
        <h1 className="font-heading text-4xl sm:text-5xl">Skills</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Progression across buoyancy, navigation, rescue, and more.
        </p>
        <DivingSubnav current="/diving/skills" />
      </header>

      {user ? (
        <p className="mt-6 text-sm">
          <Link
            href="/admin/collections/dive-skills"
            className="font-medium underline-offset-4 hover:underline"
          >
            Update checklist in admin
          </Link>
        </p>
      ) : null}

      <div className="mt-10 space-y-10">
        {[...byCategory.entries()].map(([category, items]) => (
          <section key={category}>
            <h2 className="text-lg font-semibold tracking-tight">
              {categoryLabels[category] ?? category}
            </h2>
            <ul className="mt-4 space-y-3">
              {items.map((skill) => {
                const count = practiceCounts.get(skill.id) ?? 0;
                return (
                  <li
                    key={skill.id}
                    className="border-border flex flex-wrap items-baseline justify-between gap-2 border-b pb-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{skill.name}</p>
                      {skill.description ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {skill.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-muted-foreground shrink-0 text-xs">
                      <span className="text-foreground">
                        {levelLabels[skill.level] ?? skill.level}
                      </span>
                      {" · "}
                      practiced on {count} {count === 1 ? "dive" : "dives"}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {skills.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No skills tracked yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
