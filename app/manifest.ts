import type { MetadataRoute } from "next";

/** Lets the site be added to a home screen. No service worker, no offline cache. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shan Mufti",
    short_name: "Shan Mufti",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Light theme --background.
    background_color: "#fbfcfd",
    theme_color: "#fbfcfd",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
