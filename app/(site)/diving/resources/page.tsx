import type { Metadata } from "next";
import Link from "next/link";

import { DivingSubnav } from "@/components/diving-subnav";
import { listDiveResources } from "@/lib/content";

export const metadata: Metadata = { title: "Dive resources" };

const typeLabels: Record<string, string> = {
  youtube: "YouTube",
  article: "Article",
  other: "Other",
};

export default async function DiveResourcesPage() {
  const resources = await listDiveResources();

  const byType = new Map<string, typeof resources>();
  for (const resource of resources) {
    const list = byType.get(resource.type) ?? [];
    list.push(resource);
    byType.set(resource.type, list);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Resources</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Curated links for dive learning — videos, articles, and more.
        </p>
        <DivingSubnav current="/diving/resources" />
      </header>

      <div className="mt-10 space-y-10">
        {[...byType.entries()].map(([type, items]) => (
          <section key={type}>
            <h2 className="font-heading text-lg font-semibold">
              {typeLabels[type] ?? type}
            </h2>
            <ul className="mt-4 space-y-4">
              {items.map((resource) => (
                <li key={resource.id} className="border-border border-b pb-4">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {resource.title}
                  </a>
                  {resource.summary ? (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {resource.summary}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {resources.length === 0 ? (
          <p className="text-muted-foreground text-sm">No resources yet.</p>
        ) : null}
      </div>

      <p className="text-muted-foreground mt-10 text-xs">
        Prefer something else?{" "}
        <Link href="/diving" className="underline-offset-4 hover:underline">
          Back to diving hub
        </Link>
      </p>
    </div>
  );
}
