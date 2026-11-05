import { ImageResponse } from "next/og";

export const alt = "Shan Mufti — field notes from the road and under the sea";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share image for every page without its own cover. */
export default function OpengraphImage() {
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
        Field notes from the road and under the sea.
      </div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.7)" }}>
        Shan Mufti · Divemaster, traveler, engineer
      </div>
    </div>,
    size,
  );
}
