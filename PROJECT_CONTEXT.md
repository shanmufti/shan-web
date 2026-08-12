# shan-web — Project Context

Personal site for Shan Mufti: adventures/blog, diving (divemaster), travel, and tech sections. Large photo/video archive.

## Decisions made

- **Framework**: Next.js (React) — chose React over Vue for larger ecosystem/job-market fit; comfortable with either.
- **Content**: authored through a self-hosted [Payload CMS](https://payloadcms.com) admin panel at `/admin` (embedded in this same Next.js app/repo, not a separate service). Article metadata and text live in a **managed Postgres database (Neon, direct account)** — deliberately not the git repo, and not a third-party hosted content platform, for control/privacy over the data. Chosen over a git-based CMS overlay (Decap/Sveltia, which still commits files to git) and a fully managed headless CMS (Sanity, third-party-owned data).
- **Hosting**: Vercel, connected to GitHub repo `shanmufti/shan-web`, auto-deploys on push to `main`. Free Hobby tier is sufficient for now.
- **Domain**: `smufti.com`, registered via **Cloudflare Registrar** (not GoDaddy — GoDaddy was ~$30/yr, Cloudflare is ~$10.44/yr at-cost with free WHOIS privacy).
- **DNS**: Managed in Cloudflare. Two CNAME records, both set to **DNS only** (proxy OFF — required because Vercel issues/manages its own SSL; Cloudflare's orange-cloud proxy conflicts with Vercel's cert handling):
  - `@` → `c3d3528a53a5afcf.vercel-dns-017.com.`
  - `www` → `c3d3528a53a5afcf.vercel-dns-017.com.`
- **Media storage (photos/videos, the "safe archive")**: Cloudflare R2 bucket (S3-compatible, $0 egress fees, ~$0.015/GB/mo storage). Wired into Payload's admin uploads via `@payloadcms/storage-s3` (R2 speaks the S3 API) — images uploaded through `/admin` land directly in R2, not in the repo or the database.
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

- Repo is live at `github.com/shanmufti/shan-web`, deployed on Vercel, reachable at `https://smufti.com` and `https://www.smufti.com`.
- Full Next.js App Router site is built: homepage plus four section routes (`/blog`, `/diving`, `/travel`, `/tech`), each with a list page and `/section/slug` detail pages, styled with Tailwind + shadcn/ui.
- Content moved from an initial MDX-in-repo pipeline (Velite) to Payload CMS — see "Decisions made" above. `/admin` is the only way articles get created; nothing content-related lives in git anymore.
- Code quality tooling in place: strict TypeScript, ESLint, Prettier, Husky pre-commit (lint-staged) + pre-push (typecheck) hooks.

## Not yet done / next steps

- Author real content through `/admin` (diving/travel/tech placeholder posts from the old MDX era were intentionally dropped, not migrated).
- Diving/travel currently show location as text; an interactive map view (dive sites, trip itinerary) is a planned follow-up — `react-leaflet` was the earlier recommendation over MapLibre/Mapbox GL, given the site's small scale.
- No syntax highlighting for code blocks in Payload's rich text yet (the old MDX pipeline had this via Shiki/rehype-pretty-code) — only relevant if `/tech` posts need highlighted code.
- Granular admin permissions/roles: Payload supports this natively via per-collection `access` functions whenever multiple contributors are needed — not set up yet since it's currently single-user.
