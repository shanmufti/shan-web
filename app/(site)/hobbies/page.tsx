import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { HobbyIcon } from "@/components/hobby-icon";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { listHobbies, publicHobbyCards, type HobbyCard } from "@/lib/hobbies";
import { hobbyDescription } from "@/lib/hobby-options";

export const metadata: Metadata = { title: "Hobbies" };

function countLabel(count: number) {
  if (count === 0) return "No references yet";
  return count === 1 ? "1 reference" : `${String(count)} references`;
}

/** This visitor's hobbies: adds private ones and admin links for the owner. */
async function ViewerHobbies() {
  const { hobbies, isOwner } = await listHobbies();
  return <HobbiesView hobbies={hobbies} isOwner={isOwner} />;
}

async function PublicHobbies() {
  return <HobbiesView hobbies={await publicHobbyCards()} isOwner={false} />;
}

/**
 * The static shell is the public list (cached); the owner's view streams in
 * per request, so private hobbies never enter the shell.
 */
export default function HobbiesPage() {
  return (
    <Suspense fallback={<PublicHobbies />}>
      <ViewerHobbies />
    </Suspense>
  );
}

function HobbiesView({
  hobbies,
  isOwner,
}: Readonly<{ hobbies: HobbyCard[]; isOwner: boolean }>) {
  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-10">
        <PageHeader
          eyebrow="Hobbies"
          title="Hobbies"
          lede="[Intro: Shan to write]"
        >
          {isOwner ? (
            <p className="text-muted-foreground mt-4 text-sm">
              Add or reorder hobbies in{" "}
              <Link
                href="/admin/collections/hobbies"
                prefetch={false}
                className="text-foreground underline underline-offset-4"
              >
                admin
              </Link>
              . Private hobbies are marked and only visible to you.
            </p>
          ) : null}
        </PageHeader>

        {hobbies.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing here yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hobbies.map((hobby) => {
              const isPrivate = hobby.public === false;
              return (
                <li key={hobby.id}>
                  <Link
                    href={`/hobbies/${hobby.slug}`}
                    className="group bg-card ring-foreground/10 hover:ring-foreground/25 focus-visible:ring-ring flex h-full flex-col overflow-hidden rounded-xl ring-1 transition-shadow outline-none focus-visible:ring-2 motion-reduce:transition-none"
                  >
                    {hobby.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- R2 covers, same as post cards
                      <img
                        src={hobby.coverImage.url}
                        alt=""
                        loading="lazy"
                        className="aspect-[16/9] w-full object-cover"
                      />
                    ) : null}
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <span className="bg-accent text-accent-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                          <HobbyIcon name={hobby.icon} className="size-5" />
                        </span>
                        <h2 className="text-lg font-semibold tracking-tight">
                          {hobby.name}
                        </h2>
                        {isPrivate ? (
                          <span className="border-border text-muted-foreground ml-auto inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs">
                            <Lock aria-hidden="true" className="size-3" />
                            Private
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {hobbyDescription(hobby.description)}
                      </p>
                      <p className="meta-label text-muted-foreground mt-auto pt-1">
                        {countLabel(hobby.referenceCount)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
