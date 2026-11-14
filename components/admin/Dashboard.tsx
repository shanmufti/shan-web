import { Gutter } from "@payloadcms/ui";
import Link from "next/link";
import type { CollectionSlug, Payload, TypedUser } from "payload";

import { ADMIN_GROUPS, isNotInUse } from "@/lib/admin-layout";

/**
 * /admin start page. Replaces Payload's default grid of every collection
 * with the handful of things that actually get edited, plus counts.
 * Sidebar groups and names come from lib/admin-layout.ts.
 */

interface Props {
  payload: Payload;
  user?: TypedUser | null;
}

interface Action {
  label: string;
  hint: string;
  href: string;
}

const ACTIONS = (admin: string): Action[] => [
  {
    label: "Add a journey",
    hint: "A new trip page under /travel",
    href: `${admin}/collections/travel/create`,
  },
  {
    label: "Upload photos",
    hint: "Then add them to a journey",
    href: `${admin}/collections/media/create`,
  },
  {
    label: "Log a dive",
    hint: "One entry per dive",
    href: `${admin}/collections/diving/create`,
  },
  {
    label: "Food tour",
    hint: "Restaurants, people, reveal date",
    href: `${admin}/globals/food-tour`,
  },
  {
    label: "Who can see what",
    hint: "Public, passcode or hidden, per section",
    href: `${admin}/globals/site-access`,
  },
  {
    label: "Home page",
    hint: "Intro text and links on smufti.com",
    href: `${admin}/globals/landing-page`,
  },
];

const SECTIONS: { title: string; slugs: string[] }[] = [
  {
    title: ADMIN_GROUPS.travel,
    slugs: [
      "travel",
      "destinations",
      "places",
      "visited-countries",
      "media",
      "blog",
    ],
  },
  {
    title: ADMIN_GROUPS.diving,
    slugs: ["diving", "dive-gear", "gear-configs"],
  },
  { title: ADMIN_GROUPS.foodTour, slugs: ["food-tour-photos"] },
];

async function countOf(payload: Payload, slug: string): Promise<number | null> {
  try {
    const { totalDocs } = await payload.count({
      collection: slug as CollectionSlug,
      overrideAccess: true,
    });
    return totalDocs;
  } catch {
    return null;
  }
}

function pluralLabel(payload: Payload, slug: string): string {
  const config = payload.config.collections.find((c) => c.slug === slug);
  const plural = config?.labels.plural;
  return typeof plural === "string" ? plural : slug;
}

export async function Dashboard({ payload, user }: Readonly<Props>) {
  const admin = payload.config.routes.admin;
  const exists = (slug: string) =>
    payload.config.collections.some((c) => c.slug === slug);

  const sections = await Promise.all(
    SECTIONS.map(async (section) => ({
      title: section.title,
      rows: await Promise.all(
        section.slugs.filter(exists).map(async (slug) => ({
          slug,
          label: pluralLabel(payload, slug),
          count: await countOf(payload, slug),
        })),
      ),
    })),
  );

  const notInUse: { slug: string; type: string; label: string }[] = [
    ...payload.config.collections
      .filter((c) => isNotInUse(c.slug))
      .map((c) => ({
        slug: c.slug,
        type: "collections",
        label: pluralLabel(payload, c.slug),
      })),
    ...payload.config.globals
      .filter((g) => isNotInUse(g.slug))
      .map((g) => ({
        slug: g.slug,
        type: "globals",
        label: typeof g.label === "string" ? g.label : g.slug,
      })),
  ];

  return (
    <Gutter className="sm-dash">
      <style>{CSS}</style>
      <h1 className="sm-dash__title">Home</h1>
      <p className="sm-dash__lead">
        The things you usually edit are below. Everything else is in the sidebar
        on the left, grouped the same way.
      </p>

      <h2 className="sm-dash__h2">Quick actions</h2>
      <div className="sm-dash__grid">
        {ACTIONS(admin).map((a) => (
          <a key={a.href} href={a.href} className="sm-dash__card">
            <span className="sm-dash__card-label">{a.label}</span>
            <span className="sm-dash__card-hint">{a.hint}</span>
          </a>
        ))}
      </div>

      <h2 className="sm-dash__h2">What&apos;s on the site</h2>
      <div className="sm-dash__cols">
        {sections.map((s) => (
          <section key={s.title} className="sm-dash__box">
            <h3 className="sm-dash__h3">{s.title}</h3>
            <ul className="sm-dash__list">
              {s.rows.map((r) => (
                <li key={r.slug}>
                  <a href={`${admin}/collections/${r.slug}`}>{r.label}</a>
                  <span className="sm-dash__count">{r.count ?? "–"}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {notInUse.length > 0 && (
        <details className="sm-dash__more">
          <summary>
            Not in use yet ({notInUse.length}): empty features kept for later
          </summary>
          <p>
            Nothing is saved in these and they aren&apos;t shown on the site.
            Open one to start using it.
          </p>
          <ul className="sm-dash__inline">
            {notInUse.map((n) => (
              <li key={n.slug}>
                <a href={`${admin}/${n.type}/${n.slug}`}>{n.label}</a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="sm-dash__foot">
        {user?.email ? <>Signed in as {user.email}. </> : null}
        <a href={`${admin}/account`}>Your account</a> ·{" "}
        <Link href="/">View site</Link>
      </p>
    </Gutter>
  );
}

export default Dashboard;

const CSS = `
.sm-dash { padding-top: 1.5rem; padding-bottom: 3rem; max-width: 64rem; }
.sm-dash__title { margin: 0 0 .25rem; }
.sm-dash__lead { color: var(--theme-elevation-600); margin: 0 0 2rem; }
.sm-dash__h2 { font-size: 1.1rem; margin: 2rem 0 .75rem; }
.sm-dash__h3 { font-size: 1rem; margin: 0 0 .5rem; }
.sm-dash__grid { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); }
.sm-dash__card { display: flex; flex-direction: column; gap: .25rem; padding: 1rem; border: 1px solid var(--theme-elevation-150); border-radius: 6px; background: var(--theme-elevation-0); text-decoration: none; color: inherit; transition: border-color .15s, background .15s; }
.sm-dash__card:hover { border-color: var(--theme-elevation-400); background: var(--theme-elevation-50); }
.sm-dash__card-label { font-weight: 600; }
.sm-dash__card-hint { font-size: .85rem; color: var(--theme-elevation-600); }
.sm-dash__cols { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); }
.sm-dash__box { padding: 1rem; border: 1px solid var(--theme-elevation-150); border-radius: 6px; }
.sm-dash__list { list-style: none; margin: 0; padding: 0; }
.sm-dash__list li { display: flex; justify-content: space-between; padding: .35rem 0; border-top: 1px solid var(--theme-elevation-100); }
.sm-dash__list li:first-child { border-top: 0; }
.sm-dash__list a { text-decoration: none; }
.sm-dash__count { color: var(--theme-elevation-600); font-variant-numeric: tabular-nums; }
.sm-dash__more { margin-top: 2rem; padding: .75rem 1rem; border: 1px dashed var(--theme-elevation-200); border-radius: 6px; color: var(--theme-elevation-700); }
.sm-dash__more summary { cursor: pointer; font-weight: 500; }
.sm-dash__more p { margin: .5rem 0; font-size: .9rem; }
.sm-dash__inline { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .25rem 1rem; font-size: .9rem; }
.sm-dash__foot { margin-top: 2.5rem; font-size: .85rem; color: var(--theme-elevation-600); }
`;
