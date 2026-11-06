/**
 * Base map tiles for the Leaflet maps (CARTO Positron, raster).
 *
 * CARTO needs an API key on raster tiles; without one every tile shows an
 * "API key required" watermark. The key goes to the browser, so restrict it to
 * the site's domains in the CARTO dashboard. Keep the attribution visible:
 * CARTO's terms require it.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_CARTO_KEY?: string;
    }
  }
}

// Dot access on purpose: Next.js only inlines NEXT_PUBLIC_ values into the
// browser bundle when they are read as process.env.NAME.
const key = process.env.NEXT_PUBLIC_CARTO_KEY;

export const MAP_TILE_URL = `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png${
  key ? `?key=${encodeURIComponent(key)}` : ""
}`;

export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
