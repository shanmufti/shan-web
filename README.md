# shan-web

Personal site for Shan Mufti — blog, diving, travel, and tech, built with Next.js and Tailwind CSS. Live at [smufti.com](https://smufti.com).

Articles are authored through a [Payload CMS](https://payloadcms.com) admin panel at `/admin`, not as files in this repo. Article text/metadata live in a Postgres database (Neon); images live in Cloudflare R2. Nothing content-related is stored in git.

## Development

```bash
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000) with Fast Refresh. Visit [http://localhost:3000/admin](http://localhost:3000/admin) to log in and create/edit articles for the blog, diving, travel, and tech sections.

Requires a `.env.local` (gitignored) with `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PAYLOAD_SECRET`, and the `R2_*` variables — see `payload.config.ts` for what each is used for. Nobody but the machine that has `.env.local` can reach the database or R2 bucket.

### Code quality

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run format      # Prettier, writes in place
```

A pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files automatically. A pre-push hook runs a full `tsc --noEmit` project-wide type check before every push.

## Build & deploy

Deploys are automatic: [Vercel](https://vercel.com) is connected to this repo (`shanmufti/shan-web`) and runs `next build` on every push to `main` — there's no manual deploy step. Framework Preset in Vercel's project settings should be **Next.js**.

To test a production build locally before pushing:

```bash
npm run build
npm start
```

**Domain**: `smufti.com` / `www.smufti.com` → Cloudflare DNS (CNAMEs, proxy off — DNS-only, since Vercel manages its own SSL cert) → Vercel.

**Git remote**: this repo pushes over a dedicated SSH alias for the personal GitHub account — `git@github.com-personal:shanmufti/shan-web.git`, not the default `github.com` host. See `PROJECT_CONTEXT.md` for the full setup (two GitHub accounts on this machine, SSH key/config details). Don't change the remote back to the default host.
