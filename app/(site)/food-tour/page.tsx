import type { Metadata } from "next";

import { FoodPhotosSection } from "@/components/food-photos-section";
import { FoodRatingForm } from "@/components/food-rating-form";
import { FoodRubricTable } from "@/components/food-rubric-table";
import { FoodTourBackdrop, RubricSticker } from "@/components/food-tour-fun";
import { PageHeader } from "@/components/page-header";
import { RUBRIC_CATEGORIES, RUBRIC_MAX_TOTAL } from "@/lib/food-rubric";
import {
  getFoodTour,
  getRevealedResults,
  isRevealed,
  listFoodPhotos,
  listSubmissions,
  tourParticipants,
  tourRestaurants,
  type RestaurantResult,
  type Submission,
  type TourParticipant,
  type TourRestaurant,
} from "@/lib/food-tour";

const description = "Score each stop on the food tour rubric.";

export const metadata: Metadata = {
  title: "Food tour",
  description,
  openGraph: { title: "Food tour", description, images: ["/opengraph-image"] },
  twitter: { title: "Food tour", description },
  robots: { index: false, follow: false },
};

function formatReveal(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Vancouver",
    timeZoneName: "short",
  });
}

function fixed(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

export default async function FoodTourPage() {
  const tour = await getFoodTour();
  const revealed = isRevealed(tour);
  const title = tour.title ?? "Food tour";

  const participants = tourParticipants(tour);
  const restaurants = tourRestaurants(tour);
  const [submissions, photos] = await Promise.all([
    listSubmissions(),
    listFoodPhotos(),
  ]);
  const photoSection = (
    <FoodPhotosSection
      photos={photos}
      participants={participants}
      restaurants={restaurants}
    />
  );

  if (revealed) {
    const results = await getRevealedResults(tour);
    return (
      <div className="mx-auto max-w-5xl px-6 pb-16 lg:px-10">
        <FoodTourBackdrop />
        <RubricSticker />
        <PageHeader
          eyebrow="Results"
          title={title}
          lede={`Revealed ${tour.revealAt ? formatReveal(tour.revealAt) : ""}. Ranked by average total out of ${String(RUBRIC_MAX_TOTAL)}.`}
        />
        <FoodRubricTable />
        {results.length === 0 ? (
          <p className="text-muted-foreground">No rubrics were submitted.</p>
        ) : (
          <ol className="space-y-6">
            {results.map((result, index) => (
              <ResultCard
                key={result.restaurantId}
                rank={index + 1}
                result={result}
              />
            ))}
          </ol>
        )}
        {photoSection}
        <SubmissionGrid
          participants={participants}
          restaurants={restaurants}
          submissions={submissions}
        />
      </div>
    );
  }

  const open =
    Boolean(tour.revealAt) &&
    tour.acceptingRatings !== false &&
    restaurants.length > 0 &&
    participants.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-6 pb-16 lg:px-10">
      <FoodTourBackdrop />
      <RubricSticker />
      <PageHeader
        eyebrow="Food tour"
        title={title}
        lede={
          tour.intro?.trim()
            ? tour.intro
            : "Score each stop on the rubric. Every rubric is sealed until the reveal, nobody can see results early, not even the host."
        }
      >
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
          <div>
            <dt className="meta-label text-muted-foreground">Reveal</dt>
            <dd className="mt-1 font-medium">
              {tour.revealAt ? formatReveal(tour.revealAt) : "Not set yet"}
            </dd>
          </div>
          <div>
            <dt className="meta-label text-muted-foreground">Rubrics in</dt>
            <dd className="mt-1 font-mono font-medium">
              {submissions.length}
              {participants.length > 0 && restaurants.length > 0
                ? ` / ${String(participants.length * restaurants.length)}`
                : ""}
            </dd>
          </div>
        </dl>
      </PageHeader>

      <FoodRubricTable />

      {open ? (
        <>
          <FoodRatingForm
            participants={participants}
            restaurants={restaurants.map((r) => ({
              id: r.id,
              name: r.name,
              neighbourhood: r.neighbourhood,
              cuisine: r.cuisine,
              chosenBy: r.chosenBy,
            }))}
            submitted={submissions.map(
              (x) => `${x.participantId}:${x.restaurantId}`,
            )}
          />
          {photoSection}
          <SubmissionGrid
            participants={participants}
            restaurants={restaurants}
            submissions={submissions}
          />
        </>
      ) : (
        <p className="text-muted-foreground">
          {restaurants.length === 0 ||
          participants.length === 0 ||
          !tour.revealAt
            ? "The tour isn't set up yet. Check back soon."
            : "Rubrics are paused right now."}
        </p>
      )}
      {open ? null : photoSection}
    </div>
  );
}

function ResultCard({
  rank,
  result,
}: Readonly<{ rank: number; result: RestaurantResult }>) {
  return (
    <li className="ring-foreground/10 bg-card rounded-xl p-5 ring-1 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-heading text-2xl">
          <span className="text-muted-foreground mr-3 font-mono text-base">
            #{rank}
          </span>
          {result.restaurantName}
        </h2>
        <p className="font-mono text-lg font-medium">
          {fixed(result.averageTotal)}
          <span className="text-muted-foreground text-sm">
            {" "}
            / {RUBRIC_MAX_TOTAL}
          </span>
        </p>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        {[
          result.cuisine,
          result.chosenBy ? `Chosen by ${result.chosenBy}` : null,
          `${String(result.count)} ${result.count === 1 ? "rubric" : "rubrics"}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RUBRIC_CATEGORIES.map((c) => (
          <div key={c.key} className="bg-muted/50 rounded-lg px-3 py-2">
            <dt className="text-muted-foreground text-xs">{c.label}</dt>
            <dd className="font-mono text-base font-medium">
              {fixed(result.averages[c.key])}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="text-muted-foreground text-xs">
            <tr>
              <th scope="col" className="py-2 pr-3 font-normal">
                Name
              </th>
              {RUBRIC_CATEGORIES.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="px-2 py-2 text-right font-normal"
                >
                  {c.label}
                </th>
              ))}
              <th scope="col" className="py-2 pl-2 text-right font-normal">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {result.ratings.map((r) => (
              <tr key={r.id} className="border-border border-t align-top">
                <th scope="row" className="py-2 pr-3 font-medium">
                  {r.name}
                  {r.comment ? (
                    <p className="text-muted-foreground mt-1 max-w-xs font-normal">
                      {r.comment}
                    </p>
                  ) : null}
                </th>
                {RUBRIC_CATEGORIES.map((c) => (
                  <td key={c.key} className="px-2 py-2 text-right font-mono">
                    {r[c.key]}
                  </td>
                ))}
                <td className="py-2 pl-2 text-right font-mono font-medium">
                  {r.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </li>
  );
}

function formatSubmitted(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Vancouver",
  });
}

/** Who has submitted for which stop. Shows timing only, never scores. */
function SubmissionGrid({
  participants,
  restaurants,
  submissions,
}: Readonly<{
  participants: TourParticipant[];
  restaurants: TourRestaurant[];
  submissions: Submission[];
}>) {
  if (participants.length === 0 || restaurants.length === 0) return null;

  const byKey = new Map(
    submissions.map((x) => [`${x.participantId}:${x.restaurantId}`, x]),
  );

  return (
    <section className="mt-16" aria-labelledby="who-submitted">
      <h2 id="who-submitted" className="font-heading text-2xl">
        Who&apos;s submitted
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Scores stay sealed until the reveal. This only shows who has sent a
        rubric for each stop, and when.
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground text-xs">
            <tr>
              <th
                scope="col"
                className="bg-background sticky left-0 py-2 pr-3 font-normal sm:pr-4"
              >
                Person
              </th>
              {restaurants.map((r) => (
                <th
                  key={r.id}
                  scope="col"
                  className="px-2 py-2 font-normal sm:min-w-[7rem]"
                >
                  {r.name}
                </th>
              ))}
              <th scope="col" className="py-2 pl-2 text-right font-normal">
                Done
              </th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => {
              const doneCount = restaurants.filter((r) =>
                byKey.has(`${p.id}:${r.id}`),
              ).length;
              return (
                <tr key={p.id} className="border-border border-t">
                  <th
                    scope="row"
                    className="bg-background sticky left-0 py-2 pr-3 font-medium whitespace-nowrap sm:pr-4"
                  >
                    {p.name}
                  </th>
                  {restaurants.map((r) => {
                    const sub = byKey.get(`${p.id}:${r.id}`);
                    return (
                      <td key={r.id} className="px-2 py-2">
                        {sub ? (
                          <span className="text-primary">
                            <span aria-hidden="true">✓ </span>
                            <span className="text-muted-foreground hidden text-xs sm:inline">
                              {formatSubmitted(sub.submittedAt)}
                            </span>
                            <span className="sr-only">submitted</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            <span aria-hidden="true">–</span>
                            <span className="sr-only">not yet</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 pl-2 text-right font-mono">
                    {doneCount}/{restaurants.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
