# shan-web

Personal site for Shan Mufti — blog, diving, travel, and tech, built with Next.js, Velite, and Tailwind CSS. Live at [smufti.com](https://smufti.com).

## Development

```bash
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000) with Fast Refresh — edits to `app/`, `components/`, etc. hot-reload immediately. Editing or adding an `.mdx` file under `content/` also hot-reloads: Velite watches `content/` in dev and regenerates the typed data on save.

Content lives in `content/blog/`, `content/diving/`, `content/travel/`, `content/tech/` (one `.mdx` file per post, frontmatter schema defined in `velite.config.ts`). Every post needs an explicit `slug` field in its frontmatter (it's not derived from the filename) — that's what its URL is built from.

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
