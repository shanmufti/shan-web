"use client";

import dynamic from "next/dynamic";

import type { HomeGlobeProps } from "./home-globe";

// WebGL + three.js only load in the browser, after the page is interactive.
const HomeGlobe = dynamic(
  () => import("./home-globe").then((mod) => mod.HomeGlobe),
  { ssr: false },
);

export function HomeGlobeLoader(props: Readonly<HomeGlobeProps>) {
  return <HomeGlobe {...props} />;
}
