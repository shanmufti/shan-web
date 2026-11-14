// Generates the app icons (monogram "SM") committed under public/icons and
// app/(site)/apple-icon.png. Run once after changing the design:
//   node scripts/generate-icons.mjs
// Text is rendered with the system's Inter (or any sans-serif fallback).
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BG = "#101214"; // --foreground (light theme)
const FG = "#fbfcfd"; // --background (light theme)

/** `inset`: fraction of the canvas the letters may use (maskable needs ~0.6). */
function svg(size, { radius, inset }) {
  const fontSize = Math.round(size * 0.38 * inset);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * radius)}" fill="${BG}"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle"
    font-family="Inter, 'Inter Display', 'DejaVu Sans', sans-serif" font-weight="600"
    font-size="${fontSize}" letter-spacing="${Math.round(fontSize * -0.02)}" fill="${FG}">SM</text>
</svg>`;
}

const outputs = [
  { file: "public/icons/icon-192.png", size: 192, radius: 0.2, inset: 1 },
  { file: "public/icons/icon-512.png", size: 512, radius: 0.2, inset: 1 },
  // Maskable: full-bleed background, letters inside the safe zone.
  {
    file: "public/icons/icon-maskable-512.png",
    size: 512,
    radius: 0,
    inset: 0.75,
  },
  // iOS rounds the corners itself and doesn't allow transparency.
  { file: "app/(site)/apple-icon.png", size: 180, radius: 0, inset: 1 },
];

for (const { file, size, radius, inset } of outputs) {
  await sharp(Buffer.from(svg(size, { radius, inset })))
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, file));
  console.log(`wrote ${file}`);
}
