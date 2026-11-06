# shan-web — Project Context

Personal site for Shan Mufti: adventures/blog, diving (divemaster), travel, and tech sections. Large photo/video archive.

## Decisions made

- **Framework**: Next.js (React) — chose React over Vue for larger ecosystem/job-market fit; comfortable with either.
- **Content**: authored through a self-hosted [Payload CMS](https://payloadcms.com) admin panel at `/admin` (embedded in this same Next.js app/repo, not a separate service). Article metadata and text live in a **managed Postgres database (Neon, direct account)** — deliberately not the git repo, and not a third-party hosted content platform, for control/privacy over the data. Chosen over a git-based CMS overlay (Decap/Sveltia, which still commits files to git) and a fully managed headless CMS (Sanity, third-party-owned data).
- **Hosting**: Vercel, connected to GitHub repo `shanmufti/shan-web`, auto-deploys on push to `main`. Free Hobby tier is sufficient for now.
- **Domain**: `smufti.com`, registered via **Cloudflare Registrar** (not GoDaddy — GoDaddy was ~$30/yr, Cloudflare is ~$10.44/yr at-cost with free WHOIS privacy).
- **DNS**: Managed in Cloudflare. Two CNAME records for the site, both set to **DNS only** (proxy OFF — required because Vercel issues/manages its own SSL; Cloudflare's orange-cloud proxy conflicts with Vercel's cert handling):
  - `@` → `c3d3528a53a5afcf.vercel-dns-017.com.`
  - `www` → `c3d3528a53a5afcf.vercel-dns-017.com.`
  - Plus `media.smufti.com` as an **R2 custom domain** (proxied / orange cloud — required for R2 CDN). That hostname is `R2_PUBLIC_URL`; it is not a Vercel route.
- **Media storage (photos/videos, the "safe archive")**: Cloudflare R2 bucket (S3-compatible, $0 egress fees, ~$0.015/GB/mo storage). Wired into Payload via `@payloadcms/storage-s3` + `clientUploads` — admin uploads go browser→R2 (signed URL), metadata stays in Neon, public pages load from `R2_PUBLIC_URL`. Plugin is `enabled` only when `R2_BUCKET` + `R2_ENDPOINT` are set. Bucket needs public access (r2.dev or custom domain) and CORS for PUT from localhost + smufti.com.
- **Video**: Long-form video hosted on YouTube (channel already created), embedded on the site. Raw originals also archived in R2.
- **Budget**: ~$5-20/mo target. Current actuals: ~$10.44/yr domain + a few dollars/mo R2 storage (scales with archive size) + $0 Vercel hosting + Neon free tier.

## Git / GitHub setup (important, don't break this)

- Two GitHub accounts on this Mac: a **work** account (default, HTTPS) and **personal** account `shanmufti` (used for this project).
- This repo uses **SSH with a dedicated host alias** to keep the personal identity isolated from the work HTTPS default:
  - SSH key: `~/.ssh/id_ed25519_personal`
  - `~/.ssh/config` has a `Host github.com-personal` block pointing to that key
  - This repo's remote: `git@github.com-personal:shanmufti/shan-web.git`
- Local repo config (`shan-web/.git/config`, NOT global) sets `user.name`/`user.email` to the personal identity, so commit authorship is correct without touching the global/work default.
- **Do not** change the remote back to the default `github.com` host or push without the `-personal` alias — that would risk authenticating as the work account.

## Current state

- Repo is live at `github.com/shanmufti/shan-web` (**public**), deployed on Vercel, reachable at `https://smufti.com` and `https://www.smufti.com`.
- Full Next.js App Router site is built: globe + timeline homepage plus four section routes (`/travel` Journeys, `/blog` Stories, `/diving`, `/tech`). Diving is a hub (`/diving`) with Logs (`/diving/logs`, `/diving/logs/[slug]`), Skills, private Gear, and Resources. Old `/diving/[slug]` redirects to `/diving/logs/[slug]`.
- Content moved from an initial MDX-in-repo pipeline (Velite) to Payload CMS — see "Decisions made" above. `/admin` is the only way articles get created; nothing content-related lives in git anymore.
- Content routes inherit `dynamic = "force-dynamic"` from `app/(site)/layout.tsx` so edits in `/admin` (shared Neon DB) show on production immediately, instead of freezing HTML at build time.
- **Production DB access**: Vercel holds `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`, and `PAYLOAD_SECRET` as **Sensitive** env vars (Production + Preview). `NEXT_PUBLIC_SERVER_URL=https://smufti.com` is public. Build is currently `next build` (schema has been pushed via local `next dev`). Switch the Vercel build command to `npm run ci` once versioned migrations exist under `/migrations` — do not enable that while the Neon DB still has a dev `push` marker, or the migrate step will block on an interactive prompt.
- **Access control**: centralized in `collections/access.ts` as named presets (`publicContentAccess`, `publicCreateContentAccess`, `publicReadAccess`, `privateAccess`, `usersAccess`). Diving allows public create (site form at `/diving/logs/new`); other content stays auth-write. Public reads published (`draft: false`) only for content collections; no public user signup; GraphQL disabled; auth cookies `Secure` in production.
- Code quality tooling in place: strict TypeScript, ESLint (`typescript-eslint` strictTypeChecked), Prettier. Commit/push protection is local only (no CI/PRs): Husky **pre-commit** (secret scan + lint-staged + typecheck) and **pre-push** (`npm run verify` = check + `next build`).

## Redesign (2026-11-05)

See `docs/site-redesign-plan.md` for the full plan and decisions.

- **Design:** "Field notes" — Geist + Geist Mono, cool neutrals, open-water blue accent, flat image cards, light/dark toggle.
- **Content model:** `travel` is labelled **Journeys** (adds `stops` route, `visibility`, `relatedDiveLogs`, `stories` join). `blog` is labelled **Stories** (adds optional `journey`, `visibility`, optional `location`). Slugs and URLs unchanged.
- **Private content:** one shared passcode, set in `/admin` → Settings → Site settings (only a scrypt hash is stored). `/unlock` sets an HttpOnly cookie (30 days); changing the passcode signs everyone out. Failed attempts are rate-limited per hashed IP (`unlock-attempts`, hidden). Private items show as locked cards unless "Hide from listings when locked" is on. Journeys/stories are read in `lib/journeys.ts` with `overrideAccess: true` and filtered there, because Local API calls don't carry the visitor's cookie; the collection `read` access still hides private/draft docs from the REST API.
- **Homepage:** globe (`react-globe.gl`) + ledger timeline (`lib/home.ts`).
- **SEO:** `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`, `/blog/rss.xml`, `app/global-not-found.tsx` (needs `experimental.globalNotFound`, because there are two root layouts).
- **Photos:** on hold. Uncommitted work-in-progress lives in `collections/Media.ts`, `collections/PrivateMedia.ts`, `collections/image-upload.ts` (the dev server has already pushed the extra Media columns to Neon).

## Food tour rubrics (2026-11-05)

- `/food-tour` (unlisted, `noindex`): anyone with the link scores a restaurant on the 4-category rubric (Food quality, Ambiance & vibe, Price value, Would you go again?; 5/4/3/1 pts, total out of 20). One rubric per name per restaurant; resubmitting replaces it.
- Setup lives in `/admin` → Settings → **Food tour** (global `food-tour`): title, intro, reveal date/time, restaurant list, pause toggle.
- Rubrics are in `food-ratings`, which has `read/create/update/delete: false` for everyone, admin included, and is hidden from the admin nav. The only reader is `getRevealedResults()` in `lib/food-tour.ts`, which throws before the reveal date. Writes go through `lib/actions/submit-food-rating.ts` with `overrideAccess`.
- Once any rubric exists, the reveal date can only move later (hook in `collections/FoodTour.ts`).
- This is an app-level seal: someone with direct Neon access could still read the `food_ratings` table.

## Not yet done / next steps

- Author real content through `/admin` (and the public dive log form at `/diving/logs/new`).
- Set the private content passcode in `/admin` → Settings → Site settings before marking anything private.
- Add `stops` (with ISO alpha-3 country codes and coordinates) to journeys so the globe and route maps fill in.
- Photos (albums, galleries, private bucket, import script) — see plan §4.
- Lighthouse/performance pass once real content and images exist.
- No syntax highlighting for code blocks in Payload's rich text yet (the old MDX pipeline had this via Shiki/rehype-pretty-code) — only relevant if `/tech` posts need highlighted code.
- Granular admin permissions/roles: Payload supports this natively via per-collection `access` functions whenever multiple contributors are needed — not set up yet since it's currently single-user.
