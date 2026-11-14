/**
 * Title, thumbnail and provider for a pasted link, from free sources that need
 * no API key: YouTube and Vimeo oEmbed, otherwise the page's Open Graph tags.
 * Every network call has a short timeout and failures return what we have.
 */

export interface LinkMetadata {
  title?: string;
  thumbnailUrl?: string;
  provider?: string;
  /** Start time found in the URL itself (YouTube `t=`, Vimeo `#t=`). */
  startSeconds?: number;
  isVideo: boolean;
}

export type VideoRef =
  { host: "youtube"; id: string } | { host: "vimeo"; id: string };

const TIMEOUT_MS = 4000;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const USER_AGENT = "Mozilla/5.0 (compatible; smufti-link-preview/1.0)";

export function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const YOUTUBE_ID = /^[\w-]{11}$/;

/** YouTube or Vimeo video id for a URL, or null. */
export function videoRefFor(value: string): VideoRef | null {
  const url = parseHttpUrl(value);
  if (!url) return null;
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    const id = parts[0] ?? "";
    return YOUTUBE_ID.test(id) ? { host: "youtube", id } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const fromQuery = url.searchParams.get("v");
    const id =
      fromQuery ??
      (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")
        ? (parts[1] ?? "")
        : "");
    return YOUTUBE_ID.test(id) ? { host: "youtube", id } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = [...parts].reverse().find((p) => /^\d+$/.test(p));
    return id ? { host: "vimeo", id } : null;
  }
  return null;
}

/** "90", "1:30", "90s", "1m30s", "1h2m3s" → seconds. */
export function parseTimestamp(value: string | null): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (/^\d+(?::\d{1,2}){1,2}$/.test(trimmed)) {
    return trimmed
      .split(":")
      .reduce((total, part) => total * 60 + Number(part), 0);
  }
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(trimmed);
  if (!match || trimmed === "") return undefined;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

/** Start time written into a video URL, if any. */
export function startSecondsFromUrl(value: string): number | undefined {
  const url = parseHttpUrl(value);
  if (!url) return undefined;
  const fromQuery = parseTimestamp(
    url.searchParams.get("t") ?? url.searchParams.get("start"),
  );
  if (fromQuery !== undefined) return fromQuery;
  const hash = /(?:^#|&)t=([^&]+)/.exec(url.hash);
  return parseTimestamp(hash?.[1] ?? null);
}

/**
 * Refuse obviously internal hosts so a saved link can't make the server
 * probe its own network. (Hostnames that resolve to private IPs aren't
 * caught; only the logged-in owner can trigger a fetch.)
 */
export function isPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    !host.includes(".")
  ) {
    return false;
  }
  if (host.includes(":")) return false; // IPv6 literal
  const ipv4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (!ipv4) return true;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  return true;
}

/** fetch with a timeout, manual redirects and the internal-host check. */
async function safeFetch(url: URL, accept: string): Promise<Response | null> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isPublicHost(current.hostname)) return null;
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept, "user-agent": USER_AGENT },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const next = parseHttpUrl(new URL(location, current).toString());
      if (!next) return null;
      current = next;
      continue;
    }
    return response.ok ? response : null;
  }
  return null;
}

/** Response body as text, stopping after `limit` bytes. */
async function readLimited(response: Response, limit: number) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (bytes >= limit) {
      await reader.cancel();
      break;
    }
  }
  return text;
}

function cleanText(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = decodeEntities(value).replaceAll(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : undefined;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

export function decodeEntities(value: string): string {
  return value.replaceAll(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (whole, code: string) => {
      if (code.startsWith("#x") || code.startsWith("#X")) {
        return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      }
      if (code.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
    },
  );
}

function attr(tag: string, name: string): string | undefined {
  const match = new RegExp(
    String.raw`\b${name}\s*=\s*(?:"([^"]*)"|'([^']*)')`,
    "i",
  ).exec(tag);
  return match ? (match[1] ?? match[2]) : undefined;
}

/** Open Graph / Twitter / <title> values from an HTML document. */
export function parseOpenGraph(html: string, pageUrl: URL) {
  const head = html.slice(0, MAX_HTML_BYTES);
  const meta = new Map<string, string>();
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (attr(tag, "property") ?? attr(tag, "name"))?.toLowerCase();
    const content = attr(tag, "content");
    if (key && content && !meta.has(key)) meta.set(key, content);
  }
  const titleTag = /<title[^>]*>([^<]*)<\/title>/i.exec(head)?.[1];

  const image = meta.get("og:image") ?? meta.get("twitter:image");
  let thumbnailUrl: string | undefined;
  if (image) {
    try {
      const resolved = parseHttpUrl(
        new URL(decodeEntities(image), pageUrl).toString(),
      );
      thumbnailUrl = resolved?.toString();
    } catch {
      thumbnailUrl = undefined;
    }
  }

  return {
    title: cleanText(
      meta.get("og:title") ?? meta.get("twitter:title") ?? titleTag,
    ),
    thumbnailUrl,
    provider: cleanText(meta.get("og:site_name"), 80),
  };
}

export function providerFromHost(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}

interface OEmbed {
  title?: unknown;
  thumbnail_url?: unknown;
  provider_name?: unknown;
}

async function fetchOEmbed(endpoint: string): Promise<OEmbed | null> {
  const url = parseHttpUrl(endpoint);
  if (!url) return null;
  const response = await safeFetch(url, "application/json");
  if (!response) return null;
  const data = (await response.json()) as OEmbed | null;
  return data && typeof data === "object" ? data : null;
}

async function videoMetadata(
  video: VideoRef,
  pageUrl: string,
): Promise<LinkMetadata> {
  const result: LinkMetadata = {
    isVideo: true,
    provider: video.host === "youtube" ? "YouTube" : "Vimeo",
    // YouTube thumbnails have a fixed URL, so this works even offline.
    ...(video.host === "youtube"
      ? { thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` }
      : {}),
  };
  const start = startSecondsFromUrl(pageUrl);
  if (start !== undefined) result.startSeconds = start;

  const canonical =
    video.host === "youtube"
      ? `https://www.youtube.com/watch?v=${video.id}`
      : `https://vimeo.com/${video.id}`;
  const endpoint =
    video.host === "youtube"
      ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonical)}`
      : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(canonical)}`;
  try {
    const data = await fetchOEmbed(endpoint);
    const title = cleanText(data?.title);
    if (title) result.title = title;
    const thumb = cleanText(data?.thumbnail_url, 500);
    if (thumb && parseHttpUrl(thumb)) result.thumbnailUrl = thumb;
  } catch (error) {
    console.warn("oEmbed lookup failed", error);
  }
  return result;
}

/** Best-effort metadata for a link. Never throws. */
export async function fetchLinkMetadata(value: string): Promise<LinkMetadata> {
  const url = parseHttpUrl(value);
  if (!url) return { isVideo: false };

  const video = videoRefFor(value);
  if (video) return videoMetadata(video, value);

  const fallback: LinkMetadata = {
    isVideo: false,
    provider: providerFromHost(url),
  };
  try {
    const response = await safeFetch(url, "text/html,application/xhtml+xml");
    const type = response?.headers.get("content-type") ?? "";
    if (!response || !type.includes("html")) return fallback;
    const html = await readLimited(response, MAX_HTML_BYTES);
    const og = parseOpenGraph(html, url);
    return {
      isVideo: false,
      provider: og.provider ?? providerFromHost(url),
      ...(og.title ? { title: og.title } : {}),
      ...(og.thumbnailUrl ? { thumbnailUrl: og.thumbnailUrl } : {}),
    };
  } catch (error) {
    console.warn("Link preview lookup failed", error);
    return fallback;
  }
}

/** Title to use when nothing could be fetched: host plus path. */
export function fallbackTitle(value: string): string {
  const video = videoRefFor(value);
  if (video) {
    return `${video.host === "youtube" ? "YouTube" : "Vimeo"} video ${video.id}`;
  }
  const url = parseHttpUrl(value);
  if (!url) return value.slice(0, 200);
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${providerFromHost(url)}${path}`.slice(0, 200);
}
