# shan-web — Project Context

Personal site for Shan Mufti: adventures/blog, diving (divemaster), travel, and tech sections. Large photo/video archive.

## Decisions made

- **Framework**: Next.js (React) — chose React over Vue for larger ecosystem/job-market fit; comfortable with either.
- **Content**: MDX files stored in the repo (`/content/blog`, `/content/diving`, `/content/travel`, `/content/tech`), no separate CMS for now.
- **Hosting**: Vercel, connected to GitHub repo `shanmufti/shan-web`, auto-deploys on push to `main`. Free Hobby tier is sufficient for now.
- **Domain**: `smufti.com`, registered via **Cloudflare Registrar** (not GoDaddy — GoDaddy was ~$30/yr, Cloudflare is ~$10.44/yr at-cost with free WHOIS privacy).
- **DNS**: Managed in Cloudflare. Two CNAME records, both set to **DNS only** (proxy OFF — required because Vercel issues/manages its own SSL; Cloudflare's orange-cloud proxy conflicts with Vercel's cert handling):
  - `@` → `c3d3528a53a5afcf.vercel-dns-017.com.`
  - `www` → `c3d3528a53a5afcf.vercel-dns-017.com.`
- **Media storage (photos/videos, the "safe archive")**: Cloudflare R2 bucket (S3-compatible, $0 egress fees, ~$0.015/GB/mo storage). Bucket already created.
- **Video**: Long-form video hosted on YouTube (channel already created), embedded on the site. Raw originals also archived in R2.
- **Budget**: ~$5-20/mo target. Current actuals: ~$10.44/yr domain + a few dollars/mo R2 storage (scales with archive size) + $0 Vercel hosting.

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
- Only content so far: a single static `index.html` smoke-test page (confirms the full pipeline: GitHub → Vercel → Cloudflare DNS → SSL all work end to end).
- Nothing else has been built yet — no Next.js app, no MDX setup, no R2 client wiring, no page layouts.

## Not yet done / next steps

- Scaffold the actual Next.js app (replace the placeholder `index.html`).
- Build out the four section routes: `/blog`, `/diving`, `/travel`, `/tech`.
- Set up MDX content pipeline.
- Wire up R2 client (bucket name, endpoint, access keys — stored in Vercel env vars, not in this repo) for image/video handling.
- Design page layouts/site map (not yet discussed in detail — open decision).
