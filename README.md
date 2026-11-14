# shan-web

Personal site for Shan Mufti — blog, diving, travel, and tech, built with Next.js and Tailwind CSS. Live at [smufti.com](https://smufti.com).

Articles are authored through a [Payload CMS](https://payloadcms.com) admin panel at `/admin`, not as files in this repo. Article text/metadata live in a Postgres database (Neon); images live in Cloudflare R2. Nothing content-related is stored in git.

## Development

```bash
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000) with Fast Refresh. Visit [http://localhost:3000/admin](http://localhost:3000/admin) to log in and create/edit content for blog, diving, travel, and tech.

Diving routes: `/diving` (hub), `/diving/logs`, `/diving/logs/[slug]`, `/diving/skills`, `/diving/gear` (private), `/diving/resources`. When logged in, **Log a dive** links to `/diving/logs/new` (also available publicly).

Requires a `.env.local` (gitignored) with:

| Variable                                    | Purpose                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | Neon **pooled** connection (runtime on Vercel)                                  |
| `DATABASE_URL_UNPOOLED`                     | Neon **direct** connection (migrations during build)                            |
| `PAYLOAD_SECRET`                            | Signs admin auth cookies/JWTs — long random string                              |
| `NEXT_PUBLIC_SERVER_URL`                    | Public site URL (`https://smufti.com`) for CSRF                                 |
| `R2_BUCKET`                                 | R2 bucket name                                                                  |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 **S3 API** token (Object Read & Write)                                       |
| `R2_ENDPOINT`                               | S3 API endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (uploads only) |
| `R2_PUBLIC_URL`                             | Public file URL base: `https://media.smufti.com` (R2 custom domain)             |

Never commit these. Production/Preview copies live only in Vercel → Project → Settings → Environment Variables (secrets marked **Sensitive**).

### How media / R2 works

Neon stores article text + a pointer to each file. The bytes live in R2.

1. In `/admin`, you upload an image on a Media doc (or as a post cover).
2. With `clientUploads: true`, the browser uploads **directly to R2** using a short-lived signed URL from Payload (so large photos never pass through Vercel’s 4.5MB limit).
3. Payload saves metadata in Postgres (`filename`, `alt`, `url`, sizes, etc.).
4. The site renders using `url`, which `generateFileURL` builds as `R2_PUBLIC_URL/filename`.

Photos (`media`), see `collections/Media.ts` and `lib/media-upload.ts`:

- On upload, sharp caps the stored original at 2560px and re-encodes it, which removes all EXIF (GPS included), and writes WebP sizes `thumb` (480), `card` (960) and `large` (2048). Pages render them as a `srcset` (`components/picture.tsx`), so phones download ~50–150KB per photo, not the original.
- Every upload gets a unique name (`img-1234-3f9c2a71.jpg`), so two `IMG_1234.JPG` from different trips can't overwrite each other in R2.
- Admin uploads go browser → R2, then Payload replaces that raw file with the processed one under the same key, so no camera original (with GPS) stays public.
- Before the EXIF is stripped, GPS and capture time are copied into the photo's `location` (lat, lng, place) and `takenAt` fields (`lib/photo-exif.ts`). `location` is owner-only: the public API and site never see it, so it can later drive a private map.
- JPEG, PNG, WebP or AVIF only: sharp can't read HEIC, so export JPEG from Photos.
- Journeys have a `photos` gallery (image + optional stop name). Bulk-add with `NODE_ENV=production npx payload run scripts/upload-journey-photos.ts <manifest.json> [apply]` (format in the script header).
- Cost: R2's free tier is 10GB storage with free egress; each photo takes about 0.3–1MB in total, so thousands of photos fit. No Vercel image optimisation is used (`images.unoptimized`), so Vercel's image limits don't apply.

Two different Cloudflare URLs (easy to mix up):

- **`R2_ENDPOINT`** — private S3 API for upload/delete. Not for `<img src>`.
- **`R2_PUBLIC_URL`** — public HTTP base for browsers (`https://media.smufti.com`).

Also set **CORS** on the bucket so browser PUTs from `http://localhost:3000` and `https://smufti.com` are allowed (needed because of client uploads).

### Vault (`/vault`, owner only)

Records (renewals, expiries, costs), private files, file drops, snippets and a calendar feed. Everything under `/vault` and the `vault-records`, `vault-files`, `file-drops`, `snippets` and `vault-settings` REST endpoints is a 404 unless you're logged in; the section is always Hidden. Never store passwords or other secrets in the vault.

- **Files** (`vault-files`) go to R2 under `vault/`, each stored under a random name (32 random hex characters + the original extension, see `lib/vault-upload-names.ts`), so the key can't be guessed from the bucket's public domain, and R2 public buckets can't be listed. The uploaded name is kept in `originalFilename` and used for downloads. This also covers admin uploads that go straight from the browser to R2: the signed-URL endpoint swaps in the random name. The site downloads through `/vault/files/<id>/download` (owner only); Payload's `/api/vault-files/file/<name>` also checks login and redirects to a signed R2 URL that expires after 60 seconds. Locally (no R2 env) files are stored in `./vault-files` (gitignored).
- **Recommended extra layer in Cloudflare:** the bucket's public domain (`R2_PUBLIC_URL`) serves any key it's asked for, so also block the vault prefix there. Cloudflare → `smufti.com` → Security → WAF → Custom rules → Block when `http.host eq "media.smufti.com" and starts_with(http.request.uri.path, "/vault/")`. Signed URLs use the S3 endpoint, not the public domain, so they keep working.
- **File drops:** `/drop/<token>` is a public download page for one file until the drop expires or runs out of downloads; then it's a 404. Create them on `/vault/drops` or in admin.
- **Calendar feed:** `/vault/calendar.ics?token=…` (link on `/vault`). The proxy lets this one path through because phone calendars can't log in; the route 404s on a wrong token. Regenerate the token in admin → Vault → Vault settings.

### Places from Google Maps (on journey pages)

Your saved Google Maps places show on journey pages (`/travel/<slug>`) under **Places I saved**, grouped by category with a link to Google Maps. The importer files places under destinations (a city, an island); in admin → Destinations, set a destination's **Journeys** and its places appear on each of those journey pages. There is no separate page per destination. Data lives in the `destinations` and `places` collections, which only you can read through the REST API.

Who sees a place: anyone who can open the journey sees its **Public** places; **Private** places need the passcode; **Only me** places show only to you, logged in. A private destination makes all its places at least private. A destination's Draft tick (importer-created ones start as drafts) doesn't hide anything: the journey's own access decides.

1. **Export.** On takeout.google.com (signed in to your Google account), click _Deselect all_, tick **Saved** (your lists, one CSV each) and **Maps (your places)** (starred places, `Saved Places.json`), then export once and download the zip. Unzip it **outside this repo**: it's personal data.
2. **Dry run** (writes nothing to the database, only a review file next to the export):

   ```bash
   NODE_ENV=production npx payload run scripts/import-google-maps.ts ~/Downloads/Takeout
   ```

   It prints each list and where it goes, the destinations it would create, and the places from catch-all lists (Want to go, Favourites, Starred places…) with the nearest destination suggested. `payload run` drops `--flags`, so options are plain words: `no-db` (don't connect at all), `map=lists.json`, `assign=review.csv`, `review-out=file.csv`, `visibility=private|owner`.

3. **Optional mapping.** Each destination-style list becomes a destination named after the list. To rename, merge or skip lists, write a JSON file outside the repo and pass `map=`. Example: `{ "Tokyo trip 2019": { "slug": "tokyo", "title": "Tokyo", "country": "JPN" }, "Work lunches": "skip", "Road trip": "review" }`.
4. **Import:** run the same command with `apply` at the end. Re-running is safe: places match on their Google place id (or name + coordinates), so nothing is duplicated; your edits to category, notes and visibility are kept, and nothing is deleted.
5. **Catch-all places:** open `google-maps-review.csv`, fill the `destination` column with a slug (or `skip`), then run again with `assign=<that file> apply`.
6. **Link to journeys:** in admin → Destinations, pick the journeys each destination belongs to. A list's description is saved in the destination's _Imported notes_ (never shown on the site).

**Trip dates (optional):** export the travel calendar as `.ics` (Calendar.app → File → Export, keep it outside the repo) and run `NODE_ENV=production npx payload run scripts/ics-trip-dates.ts ~/Downloads/Travel.ics`. It suggests stays per destination by matching event titles and locations to destination names (flights, buses and hotel bookings are ignored) and lists events that match nothing. Add `apply` to save them as _Dates visited_.

Run `next dev` once first (or migrate) so the tables exist; `NODE_ENV=production` stops the scripts pushing the dev schema. Tests for the parsers, against fake exports in `scripts/fixtures/`: `npx tsx --test scripts/*.test.ts`.

### Code quality / commit safeguards

No CI or PR flow — protection is local Husky hooks (can still be skipped with `--no-verify`; don’t).

```bash
npm run check        # typecheck + eslint + prettier --check
npm run verify       # check + production `next build` (what pre-push runs)
npm run typecheck
npm run lint
npm run format
npm run secrets:check
```

| Hook           | Runs                                    | Purpose                                                                                        |
| -------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **pre-commit** | secret scan → lint-staged → `typecheck` | Block secrets, format/lint staged files, catch cross-file type breaks before the commit exists |
| **pre-push**   | `npm run verify`                        | Full check + production build before code can reach `main` / Vercel                            |

TypeScript is strict (`exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, unused locals/params, etc.). ESLint uses `typescript-eslint` strict + stylistic type-checked rules, `eslint-plugin-sonarjs` recommended, and `eslint-plugin-jsx-a11y` recommended (covers SonarQube a11y rules like S6827 / `anchor-has-content`). Prettier ignores Payload-generated `app/(payload)/**`.

**IDE ↔ CLI parity:** `eslint.config.mjs` is the only lint rule source. Workspace settings in `.vscode/` pin the ESLint extension + workspace TypeScript SDK so Problems matches `npm run lint` / `npm run typecheck`. Prefer ESLint over standalone SonarLint for this repo (Sonar rules are mirrored via sonarjs + jsx-a11y); see `.vscode/extensions.json`.

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
