import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeView } from "@/components/home/home-view";
import {
  buildHomeView,
  homeSectionModes,
  landingContent,
  publicHomeData,
  viewerHomeData,
} from "@/lib/home";
import { currentViewer } from "@/lib/site-access";
import type { SectionModes } from "@/lib/site-sections";
import type { LandingPage } from "@/payload-types";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Per request: the owner's or a passcode holder's version of the hub. */
async function ViewerHome({
  landing,
  modes,
}: Readonly<{ landing: LandingPage; modes: SectionModes }>) {
  const viewer = await currentViewer();
  const data = await viewerHomeData(viewer);
  return (
    <HomeView landing={landing} view={buildHomeView(data, modes, viewer)} />
  );
}

/**
 * Bento hub. Everything an anonymous visitor sees comes from cached reads
 * and renders as the Suspense fallback (the static shell); the per-viewer
 * version streams in over it.
 */
export default async function HomePage() {
  const [landing, data, modes] = await Promise.all([
    landingContent(),
    publicHomeData(),
    homeSectionModes(),
  ]);
  const anonymous = (
    <HomeView
      landing={landing}
      view={buildHomeView(data, modes, "anonymous")}
    />
  );
  return (
    <Suspense fallback={anonymous}>
      <ViewerHome landing={landing} modes={modes} />
    </Suspense>
  );
}
