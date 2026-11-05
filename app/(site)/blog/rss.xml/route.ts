import { listPublicForFeeds } from "@/lib/public-content";
import { siteUrl } from "@/lib/site-url";

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** RSS 2.0 feed of public stories. */
export async function GET() {
  const base = siteUrl();
  const { stories } = await listPublicForFeeds();

  const items = stories
    .slice(0, 50)
    .map((story) => {
      const url = `${base}/blog/${story.slug}`;
      return `    <item>
      <title>${escapeXml(story.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(story.date).toUTCString()}</pubDate>
      <description>${escapeXml(story.summary)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Shan Mufti — Stories</title>
    <link>${base}/blog</link>
    <atom:link href="${base}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Field notes from the road and under the sea.</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
