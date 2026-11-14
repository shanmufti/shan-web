import { ImageResponse } from "next/og";

import { getSectionModes } from "@/lib/site-access";
import type { SectionKey } from "@/lib/site-sections";

/** Shared size and type for every generated share image. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/*
 * Design tokens from app/(site)/globals.css (light theme), as hex because
 * the image renderer does not understand OKLCH.
 */
const INK = "#0a1f33"; // --foreground
const MUTED = "#4c6377"; // --muted-foreground
const PRIMARY = "#006e8c"; // --primary
const CORAL = "#ff8a66"; // --coral
const HERO_TOP = "#caeaf1"; // --hero-top
const HERO_MID = "#e3f1f5"; // --hero-mid
const BACKGROUND = "#f5f8fa"; // --background

/** The generic site image: used by the root and for anything not public. */
export function siteOgImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#132232",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          fontSize: 22,
          letterSpacing: 3,
          color: "rgba(255,255,255,0.6)",
          textTransform: "uppercase",
        }}
      >
        smufti.com
      </div>
      <div
        style={{
          fontSize: 84,
          lineHeight: 1,
          letterSpacing: -3,
          maxWidth: 900,
        }}
      >
        Shan Mufti
      </div>
      <div />
    </div>,
    OG_SIZE,
  );
}

/** A share image for one public item: section, title and a meta line. */
export function itemOgImage({
  section,
  title,
  meta,
}: Readonly<{ section: string; title: string; meta?: string | null }>) {
  // Shrink long titles so they fit in three lines.
  let fontSize = 88;
  if (title.length > 32) fontSize = 72;
  if (title.length > 60) fontSize = 60;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        color: INK,
        backgroundColor: BACKGROUND,
        backgroundImage: `linear-gradient(180deg, ${HERO_TOP} 0%, ${HERO_MID} 45%, ${BACKGROUND} 100%)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 24,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: PRIMARY,
        }}
      >
        <div
          style={{ width: 14, height: 14, borderRadius: 7, background: CORAL }}
        />
        {section}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        {meta ? <div style={{ fontSize: 28, color: MUTED }}>{meta}</div> : null}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          color: MUTED,
        }}
      >
        <div>Shan Mufti</div>
        <div>smufti.com</div>
      </div>
    </div>,
    OG_SIZE,
  );
}

/** True when the section is public for everyone (no passcode, not hidden). */
export async function sectionIsPublic(key: SectionKey): Promise<boolean> {
  try {
    return (await getSectionModes())[key] === "public";
  } catch {
    return false;
  }
}
