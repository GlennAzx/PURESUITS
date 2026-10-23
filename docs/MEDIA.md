# Media on Cloudflare R2

Heavy media is **not** committed to this repository. It lives in an R2 bucket and is
referenced by URL.

## Why

1. **Git keeps binaries forever.** A 40 MB clip committed once stays in the history of every
   future clone, even after you delete it. There is no undo short of rewriting history.
2. **Workers caps a single static asset at 25 MiB.** A longer clip simply cannot deploy.
3. **Uploading media should not require a deploy.** New gallery files appear without a rebuild.

Cost is **not** a reason. R2's free tier is 10 GB with free egress; a realistic gallery
(500 screenshots + 200 clips ≈ 1.8 GB) stays inside it and bills **$0.00**.

## Status: live

The bucket exists and the hero streams from it.

| | |
|---|---|
| Bucket | `puresuit-media` |
| Public URL | `https://media.puresuit.net` (custom domain) |
| Verified | `video/mp4`, `Cache-Control: public, max-age=31536000, immutable`, HTTP 206 on range requests, valid TLS |

The r2.dev development URL is rate-limited and is no longer used. The custom domain replaced it.

### VITE_MEDIA_BASE must be a BUILD variable, not a runtime variable

Cloudflare has two separate variable sections, and only one works here:

| Dashboard location | Applies | Correct for this? |
|---|---|---|
| Settings > Build > Variables and secrets | during `npm run build` | **yes** |
| Settings > Variables and secrets | at Worker runtime | no |

Vite reads `VITE_MEDIA_BASE` while building and writes the value into the JS bundle. A runtime
variable arrives too late to affect it. This site is static assets with no Worker code, so a
runtime variable has no effect at all.

Set it in **both** places it is needed:
- `.env.local` for local builds
- Workers **Build** variables, so a rebuild from git produces a working bundle

## One-time setup

R2 must be enabled on the account first — `wrangler r2 bucket list` fails with error 10042
until it is. That is a dashboard action: **Cloudflare dashboard → R2 → Enable**.

```bash
# 1. create the bucket
npx wrangler r2 bucket create puresuit-media

# 2. make it publicly readable
#    Dashboard -> R2 -> puresuit-media -> Settings -> Public access
#    Either connect a custom domain (media.puresuit.net) or enable the r2.dev URL.
#    A custom domain is better: r2.dev is rate-limited and not meant for production.

# 3. point the app at it
cp .env.example .env.local
#    then set VITE_MEDIA_BASE=https://media.puresuit.net

# 4. set the SAME variable in the Workers build environment
#    Dashboard -> Workers & Pages -> puresuits -> Settings -> Variables
#    Without this the deployed site falls back to its own origin and the video 404s.
```

## Uploading

```bash
node scripts/upload-media.mjs ./media/hero hero
node scripts/upload-media.mjs ./media/gallery gallery
node scripts/upload-media.mjs ./media/gallery/raid.jpg gallery
```

The script sets `Content-Type` per extension and a one-year immutable `Cache-Control`.
Both matter: a video served as `application/octet-stream` will not stream or seek in Safari,
and without the cache header the browser refetches a 16 MB video on every visit.

**The script passes `--remote`, and that is not optional.** Without it `wrangler r2 object put`
writes to a *local simulated* bucket under `.wrangler/state` and still prints success. The
upload appears to work and the file never reaches R2. Verify any upload by pulling it back:

```bash
npx wrangler r2 object get puresuit-media/hero/wwm-hero.mp4 --remote --file /tmp/check.mp4
```

`media/` is gitignored. It is a staging area, not storage.

## Using media in code

Always go through `media()` from `src/lib/media.js`. Never hard-code a bucket URL.

```js
import { media, MEDIA } from '../lib/media';

<video src={media(MEDIA.heroVideo)} />
<img src={media('gallery/raid-night.jpg')} />
```

`media()` returns an absolute R2 URL when `VITE_MEDIA_BASE` is set, and a root-relative path
when it is not. Changing buckets, adding a custom domain, or reverting to local files is then
one environment variable rather than a search and replace.

Keys used by the app are listed in `MEDIA` in `src/lib/media.js`. That object doubles as the
manifest of what the bucket must contain.

## Encoding before upload

The source for the current hero was **175 MB**: 3072x2048, 34 Mbps, with an audio track on a
muted background video. Encoded for web it is **16.66 MB** — 11x smaller, with no visible
difference behind the hero's dark gradient.

```bash
ffmpeg -i source.mp4 -an \
  -vf "scale=1920:-2:flags=lanczos" \
  -c:v libx264 -preset slow -crf 26 -profile:v high \
  -pix_fmt yuv420p -movflags +faststart -g 48 \
  hero.mp4
```

- `-an` strips audio. A background hero is muted; the audio track is pure waste.
- `-movflags +faststart` puts the index at the front so playback starts before the full
  download. Without it the browser waits for the whole file.
- `-crf 26` is the quality dial. Lower is better and larger; 23 is near-transparent, 28 is
  visibly soft on detail.

Always encode before uploading. Storage is cheap, but a visitor's connection is not.

## Current contents

| Key | Size | Notes |
|---|---|---|
| `hero/wwm-hero.mp4` | 16.66 MB | 1920x1280, 42.6 s, no audio, faststart |
| `hero/wwm-hero-poster.jpg` | 161 KB | frame at 6 s, shown while the video loads |


## Editing events and the schedule without a deploy

Events, the weekly schedule and the link URLs live in **one JSON file** in the
bucket: `content/site.json`. The page fetches it at runtime.

```bash
# 1. edit content/site.json
# 2. upload it
node scripts/upload-media.mjs ./content content
# 3. reload the page. No build, no deploy.
```

`content/site.json` in this repository is the source of truth. The copy in the
bucket is what visitors see — keep them in step by uploading after every edit.

### Shape

```jsonc
{
  "events": [
    {
      "id": "winter-cup",
      "title": "Winter Cup",
      "description": "One-line blurb shown on the card.",
      "date": "2026-11-15",          // guild time, UTC+8
      "time": "21:30",
      "durationMinutes": 120,
      "location": "Guild Hall, East Wing",   // optional
      "tag": "Tournament",
      "link": "https://discord.gg/..."   // optional
    }
  ],
  "schedule": [
    {
      "id": "breaking-army",
      "name": "Breaking Army & Showdown",
      "category": "PvP",
      "cadence": "weekly",           // or "daily"
      "weekdays": ["wed", "sat"],    // names or 0-6 (0 = Sunday)
      "time": "21:30",
      "durationMinutes": 120,
      "description": "..."
    }
  ],
  "links": {
    "discord": "https://discord.gg/QrnhSzcYkb",
    "github": "https://github.com/GlennAzx/PURESUITS",
    "support": ""                    // empty hides the Support button
  }
}
```

### Two things that will bite you

**Caching.** JSON is uploaded with `Cache-Control: no-cache`, not the one-year
immutable header used for images and video. An immutable header on a file that
is rewritten in place would pin the old copy in every browser for a year.

**CORS.** `fetch()` is cross-origin here (`puresuit.net` → `media.puresuit.net`),
so the bucket needs a CORS policy or the request is blocked and the page
silently falls back to the bundled defaults. The policy is checked in as
`r2-cors.json`:

```bash
npx wrangler r2 bucket cors set puresuit-media --file r2-cors.json
```

Note the key format: Cloudflare wants lowercase keys nested in an `allowed`
object. The S3-style `AllowedOrigins` spelling is rejected.

### If the file breaks

The page falls back to `DEFAULT_CONTENT` in `src/lib/siteContent.js` and logs a
warning. A malformed JSON file cannot blank the schedule — but it does mean your
edit is not live, so check the browser console.


## Add an event — step by step

**1. Open `content/site.json` and add one object to the `events` array.**

```json
{
  "id": "mahjong-night",
  "title": "Mahjong Night",
  "description": "Open tables, tiles on the felt. All ranks welcome.",
  "date": "2026-11-14",
  "time": "21:00",
  "durationMinutes": 120,
  "location": "Guild Hall, East Wing",
  "tag": "Mahjong"
}
```

**2. Upload it.**

```bash
node scripts/upload-media.mjs ./content content
```

**3. Reload the page.** No build, no deploy.

### Field by field

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Any unique string. Never reuse one. |
| `title` | yes | Shown as the card heading. |
| `description` | no | One or two sentences. Long text wraps and pushes the card taller. |
| `date` | yes | `YYYY-MM-DD`, **guild time (UTC+8)**. |
| `time` | yes | `"21:30"` — 24-hour, **guild time (UTC+8)**. |
| `durationMinutes` | yes | How long the card counts as live. `120` = 2 hours. |
| `location` | no | Free text. A hall, `"in-game, Guild Hall"`, a Discord channel. Hidden when empty. |
| `tag` | no | Small label, e.g. `"Mahjong"`, `"PvP"`, `"Tournament"`. Defaults to `"Event"`. |
| `link` | no | Adds a "Details" link. Must include `https://`. |

### Three rules that matter

- **Times are guild time, not the visitor's.** Write what you mean in UTC+8; the
  page converts for visitors who switch to "My time".
- **Use a real comma-free date.** `2026-11-14`, not `14/11/2026`. A bad date is
  dropped silently — the card simply does not appear.
- **The card disappears on its own** once `time + durationMinutes` has passed.
  Nothing to clean up.

### Check it worked

If the card does not appear, open the browser console. A malformed JSON file
logs `[content] using bundled defaults` and the page keeps the old content. A
quick syntax check before uploading:

```bash
node -e "JSON.parse(require('fs').readFileSync('content/site.json','utf8')); console.log('valid')"
```
