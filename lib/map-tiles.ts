/**
 * Base map tiles for the Leaflet maps.
 *
 * With NEXT_PUBLIC_CARTO_KEY set: CARTO Positron (raster). CARTO now needs an
 * API key on raster tiles; without one every tile shows an "API key required"
 * watermark. The key goes to the browser, so restrict it to the site's
 * domains in the CARTO dashboard.
 *
 * Without a key: OpenStreetMap's standard tiles (free, no key), muted with a
 * CSS filter (`.map-tiles-muted` in globals.css) so they sit close to the
 * light Positron look. OSM's tile policy asks for light use, a visible
 * attribution and a normal Referer, which a personal site's maps meet.
 *
 * Keep the attribution visible: both providers' terms require it.
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
const key = process.env.NEXT_PUBLIC_CARTO_KEY?.trim();

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const MAP_TILE_URL = key
  ? `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`
  : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_TILE_ATTRIBUTION = key
  ? `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>`
  : OSM_ATTRIBUTION;

/** OSM's standard tiles go up to zoom 19; CARTO's to 20. */
export const MAP_TILE_MAX_ZOOM = key ? 20 : 19;

/** Class for the tile layer: mutes the colourful OSM tiles. */
export const MAP_TILE_CLASS = key ? undefined : "map-tiles-muted";
