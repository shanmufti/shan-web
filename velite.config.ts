import rehypePrettyCode from "rehype-pretty-code";
import { defineCollection, defineConfig, s } from "velite";

const location = s.object({
  name: s.string(),
  lat: s.number().min(-90).max(90),
  lng: s.number().min(-180).max(180),
});

const base = {
  title: s.string().max(99),
  date: s.isodate(),
  summary: s.string().max(280),
  tags: s.array(s.string()).default([]),
  cover: s.image().optional(),
  draft: s.boolean().default(false),
  featured: s.boolean().default(false),
  body: s.mdx(),
};

const blog = defineCollection({
  name: "Blog",
  pattern: "blog/**/*.mdx",
  schema: s
    .object({ ...base, slug: s.slug("blog") })
    .transform((d) => ({ ...d, permalink: `/blog/${d.slug}` })),
});

const diving = defineCollection({
  name: "Diving",
  pattern: "diving/**/*.mdx",
  schema: s
    .object({
      ...base,
      slug: s.slug("diving"),
      location,
      siteName: s.string().optional(),
      depthMeters: s.number().optional(),
    })
    .transform((d) => ({ ...d, permalink: `/diving/${d.slug}` })),
});

const travel = defineCollection({
  name: "Travel",
  pattern: "travel/**/*.mdx",
  schema: s
    .object({
      ...base,
      slug: s.slug("travel"),
      location,
      startDate: s.isodate(),
      endDate: s.isodate().optional(),
    })
    .transform((d) => ({ ...d, permalink: `/travel/${d.slug}` })),
});

const tech = defineCollection({
  name: "Tech",
  pattern: "tech/**/*.mdx",
  schema: s
    .object({
      ...base,
      slug: s.slug("tech"),
      repoUrl: s.string().url().optional(),
      demoUrl: s.string().url().optional(),
    })
    .transform((d) => ({ ...d, permalink: `/tech/${d.slug}` })),
});

export default defineConfig({
  root: "content",
  mdx: {
    rehypePlugins: [[rehypePrettyCode, { theme: "github-dark" }]],
  },
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    clean: true,
  },
  collections: { blog, diving, travel, tech },
  prepare: (data) => {
    if (process.env.NODE_ENV !== "production") return;
    data.blog = data.blog.filter((item) => !item.draft);
    data.diving = data.diving.filter((item) => !item.draft);
    data.travel = data.travel.filter((item) => !item.draft);
    data.tech = data.tech.filter((item) => !item.draft);
  },
});
