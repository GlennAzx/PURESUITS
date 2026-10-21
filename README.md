# PURESUIT (清一色) - Where Winds Meet Guild Website

A guild website for **Where Winds Meet**, built with **Vite + React + Tailwind CSS** and
deployed on **Cloudflare Workers** with static assets.

**Read [docs/DESIGN.md](docs/DESIGN.md) before changing the tiles, the type or the roster.**
It records the rules that were decided with the guild, the alternatives that were rejected
and why, and how to verify each rule.

## Features

- **Right-Hand Fanned Mahjong Navigation** — tile rail fanning along a radial curve. 2D transforms only.
- **Cinematic Video Hero** — self-hosted ambient video with controls.
- **Member Tiles** — 77 members on ivory/jade mahjong tiles with a 白板 frame, drawn with 2D transforms. Name and title sit below the tile. No flip.
- **Radial Path Menu** — ten Martial Arts paths on one orbit, dealing out from the top on load.
- **Sichuan Bloody Battle (血战到底) Mahjong Guide** — scoring rules and unvoiding.
- **Gallery** — six slots, filled from `src/data/gallery.json`.
- **Real URLs** — `/`, `/members`, `/builds`, `/gallery`, `/mahjong-guide`. Refresh keeps the page, links are shareable, Back/Forward work.

Editable data lives in `src/data/`: `members.json` (roster and avatars) and `paths.json`
(the build paths). `events.json` and `builds.json` are no longer read by any component.

## Local Development

```bash
npm install
npm run dev
```

The dev server serves the SPA on port 5173. Deep URLs such as
`http://127.0.0.1:5173/members` work in dev because Vite falls back to `index.html`.

## Deploy — the full process

The live site is a **Cloudflare Worker** named `puresuits`:
**https://puresuits.glennangzx-568.workers.dev**

### The one rule that matters

**`npx wrangler deploy` does not build. Always build first.**

```bash
npm run build          # 1. compiles to dist/ and copies public/ into dist/
npx wrangler deploy    # 2. uploads dist/ to the Worker
```

Skip step 1 and wrangler uploads the **previous** build. It still reports success. The only
warning sign is this line in its output:

```
No updated asset files to upload. Proceeding with deployment...
```

That means the upload was byte-identical to the last one — your change is not in it. If you
see it after changing a file, you forgot `npm run build`.

### First time only

```bash
npx wrangler login
```

Credentials persist at `%APPDATA%\xdg.config\.wrangler\config\default.toml`.

### Verify the deploy

Status alone proves nothing — see the trap below. Check the content type of a real asset:

```bash
# the page
curl -s -o /dev/null -w "%{http_code}\n" https://puresuits.glennangzx-568.workers.dev/

# an image must return image/jpeg, NOT text/html
curl -s -o /dev/null -w "%{content_type} %{size_download}\n" \
  https://puresuits.glennangzx-568.workers.dev/members/furry.jpg
```

### The trap: missing files return 200, not 404

`wrangler.jsonc` sets `"not_found_handling": "single-page-application"` so that `/members`
and `/builds` survive a refresh. The side effect: **every unknown path returns
`index.html` with HTTP 200 and `Content-Type: text/html`.**

So a missing image never 404s. It returns 200 with HTML, the `<img>` fails to decode, and
nothing appears in the console. Never trust a 200 from this site — check `Content-Type`.

### Known issue: pushes do not trigger builds

Commits to `main` do **not** queue a Cloudflare build. Every deploy must be run from a
machine with wrangler logged in.

To repair it: **Workers & Pages → puresuits → Settings → Build**, and confirm repository
`GlennAzx/PURESUITS`, branch `main`, **Builds** enabled. If all three are correct and pushes
still do nothing, disconnect and reconnect the GitHub app to re-issue the webhook.

Until that is fixed, the workflow is:

```bash
git add -A
git commit -m "message"
git push
npm run build
npx wrangler deploy
```

### Configuration

`wrangler.jsonc` at the repo root:

```jsonc
{
  "name": "puresuits",
  "compatibility_date": "2026-10-20",
  "assets": { "directory": "./dist/", "not_found_handling": "single-page-application" }
}
```

Remove `not_found_handling` and every deep URL — `/members`, `/builds` — returns 404 on
refresh. `wrangler` is pinned in `devDependencies` so the build does not pull a surprise
major version.
