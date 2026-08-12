# shan-web

Personal site for Shan Mufti — blog, diving, travel, and tech, built with Next.js and Tailwind CSS. Live at [smufti.com](https://smufti.com).

Articles are authored through a [Payload CMS](https://payloadcms.com) admin panel at `/admin`, not as files in this repo. Article text/metadata live in a Postgres database (Neon); images live in Cloudflare R2. Nothing content-related is stored in git.

## Development

```bash
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000) with Fast Refresh. Visit [http://localhost:3000/admin](http://localhost:3000/admin) to log in and create/edit articles for the blog, diving, travel, and tech sections.

Requires a `.env.local` (gitignored) with:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection (runtime on Vercel) |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection (migrations during build) |
| `PAYLOAD_SECRET` | Signs admin auth cookies/JWTs — long random string |
| `NEXT_PUBLIC_SERVER_URL` | Public site URL (`https://smufti.com`) for CSRF |
| `R2_BUCKET` | R2 bucket name |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 **S3 API** token (Object Read & Write) |
| `R2_ENDPOINT` | S3 API endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (uploads only) |
| `R2_PUBLIC_URL` | Public file URL base: `https://pub-….r2.dev` or a custom domain (serving only) |

Never commit these. Production/Preview copies live only in Vercel → Project → Settings → Environment Variables (secrets marked **Sensitive**).

### How media / R2 works

Neon stores article text + a pointer to each file. The bytes live in R2.

1. In `/admin`, you upload an image on a Media doc (or as a post cover).
2. With `clientUploads: true`, the browser uploads **directly to R2** using a short-lived signed URL from Payload (so large photos never pass through Vercel’s 4.5MB limit).
3. Payload saves metadata in Postgres (`filename`, `alt`, `url`, sizes, etc.).
4. The site renders using `url`, which `generateFileURL` builds as `R2_PUBLIC_URL/filename`.

Two different Cloudflare URLs (easy to mix up):

- **`R2_ENDPOINT`** — private S3 API for upload/delete. Not for `<img src>`.
- **`R2_PUBLIC_URL`** — public HTTP base for browsers. Enable **R2.dev subdomain** (or attach a custom domain) on the bucket.

Also set **CORS** on the bucket so browser PUTs from `http://localhost:3000` and `https://smufti.com` are allowed (needed because of client uploads).

### Code quality

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run format      # Prettier, writes in place
```

A pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files automatically. A pre-push hook runs a full `tsc --noEmit` project-wide type check before every push.

## Build & deploy

Deploys are automatic: [Vercel](https://vercel.com) is connected to this repo (`shanmufti/shan-web`) and runs `next build` on every push to `main`. Framework Preset should be **Next.js** (`vercel.json`). When you add versioned Payload migrations, switch the build command to `npm run ci` so deploys run `payload migrate` (unpooled URL) before the build.

After changing env vars in Vercel, trigger a redeploy so the new values are picked up.

To test a production build locally before pushing:

```bash
npm run build
npm start
```

**Domain**: `smufti.com` / `www.smufti.com` → Cloudflare DNS (CNAMEs, proxy off — DNS-only, since Vercel manages its own SSL cert) → Vercel.

**Git remote**: this repo pushes over a dedicated SSH alias for the personal GitHub account — `git@github.com-personal:shanmufti/shan-web.git`, not the default `github.com` host. See `PROJECT_CONTEXT.md` for the full setup (two GitHub accounts on this machine, SSH key/config details). Don't change the remote back to the default host.
