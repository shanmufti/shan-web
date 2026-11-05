import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { HomeGlobeLoader } from "@/components/home-globe-loader";
import { Timeline } from "@/components/timeline";
import { getHomeData } from "@/lib/home";

function plural(count: number, one: string, many: string) {
  return `${String(count)} ${count === 1 ? one : many}`;
}

export default async function Home() {
  const { years, globe, stats } = await getHomeData();

  const counters = [
    plural(stats.countries, "country", "countries"),
    plural(stats.journeys, "journey", "journeys"),
    plural(stats.dives, "dive", "dives"),
  ];

  return (
    <>
      {/* Night-map band: dark in both themes, fades into the page below. */}
      <section
        aria-label="Places I've been"
        className="relative isolate -mt-px overflow-hidden bg-[var(--globe-ocean)] text-white"
      >
        <div className="relative mx-auto h-[min(85svh,52rem)] min-h-[34rem] max-w-7xl">
          <div className="absolute inset-x-0 top-0 bottom-[38%] md:inset-0 md:left-[30%]">
            <HomeGlobeLoader {...globe} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--globe-ocean)] to-transparent" />
          <div className="pointer-events-none relative flex h-full flex-col justify-end px-6 pb-14 lg:px-10">
            <p className="meta-label text-white/60">
              Divemaster · traveler · engineer
            </p>
            <h1 className="font-heading mt-4 max-w-3xl text-[clamp(3rem,8vw,7.5rem)] leading-[0.95] tracking-[-0.045em]">
              Field notes from the road and under the sea.
            </h1>
            <p className="meta-label mt-6 text-white/70">
              {counters.join(" · ")}
            </p>
          </div>
        </div>
      </section>
      <div className="h-16 bg-gradient-to-b from-[var(--globe-ocean)] to-transparent" />

      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-8">
          <div>
            <p className="meta-label text-muted-foreground">Timeline</p>
            <h2 className="font-heading mt-3 text-[clamp(2rem,3.5vw,3rem)]">
              Journeys and stories
            </h2>
          </div>
          <div className="flex gap-6 text-sm">
            <Link
              href="/travel"
              className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              All journeys{" "}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              All stories <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <Timeline years={years} />
      </div>
    </>
  );
}
