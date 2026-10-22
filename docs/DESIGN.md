# PURESUIT — Design Rules

The resource library. Every rule here was decided with the user and, where a number
appears, measured. Read this before changing the tile, the type, or the roster.

Two words of warning:

- **A rule marked REJECTED is a trap that has already been sprung.** Each one cost a
  round of work and was undone. Do not re-derive it from first principles and assume
  it will behave differently this time.
- **A rule marked UNVERIFIED has no measurement behind it.** Treat it as a belief
  held by the user or an inference by an agent, not as a fact about the build.

---

## 1. Hard invariants

Break any of these and the tile stops looking like a mahjong tile, or the text stops
being readable, or the page starts lagging. These are the rules that survived.

| # | Rule | Verify with |
|---|---|---|
| I1 | The member tile uses **2D transforms only**. No `preserve-3d`, no `perspective`, no `translateZ`, no slab stack. | `grep -c "preserve-3d\|perspective:\|translateZ\|mt-slice" src/index.css src/components/MemberCard3D.jsx` → both `0` |
| I2 | The nameplate is a **sibling of `.member-tile-stage`**, never a descendant. | text stays crisp at 5x zoom; no doubled CJK strokes |
| I3 | `.mt-front` carries its **own** `border-radius`. `.mt-face` does not clip. | computed radius on `.mt-front` equals the face radius |
| I4 | **No engrave, no `text-shadow`** on `.member-name`, `.member-role`, `.mt-glyph`. | `grep -n "text-shadow" src/index.css` → exactly one hit, on `.mj-glyph` (the nav rail's engraved 發). Zero hits on any `.mt-` selector. |
| I5 | **No flip.** No `flipped` state, no `data-flipped`, no `onClick` on the tile, no `.mt-back`. | `role` null, `tabindex` null, `cursor: auto`, click changes nothing |
| I6 | Depth is **two offset copies of the face outline** that share one `border-radius`. | wall closes at both corners; no notch |
| I7 | Fonts are **self-hosted** and weights are **500 / 700 / 900 only**. Never 800. | no Google Fonts `<link>` in `index.html` |
| I8 | `font-synthesis: none` stays on `.member-name`. | stops the browser faking a missing 700 by drawing it twice |
| I9 | Hover turns the tile **toward** the viewer: the matrix gets **shallower**, never deeper. | rest `0.974`, hover `0.9976` |
| I10 | Grid gaps are `gap-x-12 gap-y-16`. | tighter gaps let tiles overlap |
| I11 | One total member count, at the top. **No per-section counts.** | `SectionHeading` takes `title` only |
| I12 | Roster changes touch `src/data/members.json` only. | sections derive from `tier` |

---

## 2. Geometry

Reference is the real **Size-7** tile: 36 mm high × 26 mm wide × 21 mm deep, so
`h/w = 1.38` and `d/w = 0.81`.

| Variant | w | h | d |
|---|---|---|---|
| `leader` | 232 | 320 | 188 |
| `standard` | 208 | 287 | **168** |

**OPEN DISAGREEMENT.** `DIMS.standard` in `MemberCard3D.jsx` reads `d: 175`.
`0.81 × 208 = 168`. Only `leader` is correct. Either set standard to 168 or change
the spec note on purpose. Do not leave the two disagreeing.

The face transform at rest:

```
matrix(0.974, 0, -0.0177, 0.997, 0, 0)
```

That is the orthographic projection of the old `rotateY(-13deg) rotateX(4.5deg)`.
Hover is `matrix(0.9976, 0, -0.0024, 0.9994, 0, 0)` — shallower, so the tile faces the
viewer more. **UNVERIFIED by an actual hover**; it is the worker's value.

---

## 3. Colour

**The palette is a template, not a constant.** Each colour the page chrome uses is a
CSS channel variable, read by Tailwind as `rgb(var(--c-*) / <alpha-value>)`. That form
matters: 46 utilities use an opacity modifier (`imperial-gold/30` and so on), and a plain
`var(--colour)` would break every one of them.

Palettes live in `src/index.css` and swap with one attribute — no rebuild, no component
change:

```js
document.documentElement.dataset.palette = 'porcelain';  // or mist | dusk | harbour
```

With no attribute set, `:root` holds **Harbour**, the default chosen by the guild on
2026-10-20 from four candidates. The others stay switchable, including `ink`, which
restores the retired gold-on-black look.

| Palette | Page base | Ink | Accent | Green wall |
|---|---|---|---|---|
| **(default) harbour** | `#14263a` | `#dfe9f2` | `#ef8b4a` | `#74b28d` |
| mist | `#e9eff5` | `#1e2c38` | `#cf6b3a` | `#88b89a` |
| porcelain | `#e3ecf4` | `#22303d` | `#e07a3f` | `#8ec7a0` |
| dusk | `#2c4763` | `#eef5fa` | `#f0904f` | `#97c9aa` |
| ink *(retired)* | `#0b0c10` | `#f5f0e8` | `#d4af37` | `#2a8f5b` |

**The tile face is exempt; the wall is themed.** The ivory face is fixed — a pastel face
stops reading as a mahjong tile. The wall green follows the palette through `--wall-1` …
`--wall-4`, and `--wall-3` also supplies `currentColor` for the three box-shadow steps
that fill the wedge between the face and the wall. Nameplate ink follows `--page-ink` /
`--role-ink`, because cream text is invisible on a pale page.

Note the token names invert on the light palettes: `ink-black` becomes the pale page and
`ivory` becomes the dark text. The names are historical; the rendering is correct.

| Role | Value |
|---|---|
| Page ink (names) | `var(--page-ink)` — `#dfe9f2` by default |
| Tile ink (frame, glyphs) | `#1b2733` — fixed, not themed |
| Face | `#ffffff → #e9e9e1` — fixed, not themed |
| Wall green | `var(--wall-1)` … `var(--wall-4)` — themed; `#8fc7a4 → #407661` by default |
| Role label | `var(--role-ink)` — `#f0a06a` by default |

**The no-JS boot fallback in `index.html` cannot read these variables.** Its `<style>`
block in `<head>` copies the Harbour colours by hand. Change the palette again and that
block must change too, or a JavaScript-disabled visitor sees the old look.

Palette is **pristine white face, green back**. Warm ivory was rejected as looking
stained.

**Edge split is 50/50.** The old 3D build used `WHITE_FRACTION = 0.44` because
perspective compressed the rear of the tile, so 0.44 of the *depth* rendered as
roughly half the *visible* edge. With no perspective, carrying 0.44 into 2D reads as
too little green.

Tailwind tokens live in `tailwind.config.js`: `ink-black #0b0c10`,
`ink-charcoal #14181f`, `imperial-gold #d4af37`, `imperial-gold-bright #f9d976`,
`jade-deep #071a12`, `jade-accent #2e7d32`, `cinnabar #c23b22`, `ivory #f5f0e8`,
`ivory-shadow #dfd7c8`.

---

## 4. The 白板 frame

白板 (*bái bǎn*, the White Dragon) is the blank tile that carries only a rectangular
border. The border is functional: a wholly blank tile could not be told from a spare,
so sets drew a double rule. The user asked for exactly that border around each portrait.

| Part | Value |
|---|---|
| outer rule | `2px solid var(--tile-frame-ink)` |
| gap | `7px` padding |
| inner rule | `1px` on `::before` at `inset: 2px` |
| corners | square `1px`, not the old rounded `6px` |

**The frame spans the WHOLE face.** `.mt-front` holds one child at `padding: 10px`;
`.member-portrait-window` takes `flex: 1`; the portrait fills with `object-fit: cover`.
The inner box lands near a **0.69** ratio, so a 0.840 source loses about 18% of its
width to the crop.

Do **not** add the optional letter or small square some 白板 sets print inside the
border. It fights the portrait.

**Placeholders use the same frame.** `"avatar": null` renders
`member-portrait-window--empty` with the first character centred as `.mt-glyph`. It is
a tile awaiting its engraving, not a missing image. **75 of 77 tiles are in this state.**

---

## 5. Typography

Self-hosted, real weights, no synthesis.

| Use | Stack | Weight |
|---|---|---|
| member name, tile glyph | `'Noto Serif SC', ui-serif, Georgia, serif` | **700** |
| role | `ui-sans-serif, system-ui, sans-serif` | 700 |
| Latin display | Cinzel, from `@fontsource` | 500 / 700 / 900 |

- Chinese: the full Noto Serif SC file is **1.5 MB per weight**. The site subsets it.
  Current subset is 9.6 KB per weight at
  `public/fonts/noto-serif-sc-cjk-{500,700,900}.woff2`.
- The CJK `@font-face` blocks use `unicode-range: U+3400-4DBF, U+4E00-9FFF, U+F900-FAFF`
  under the **same family name**, so one family serves both scripts.
- Nameplate: 24px base, 28px on `--leader`, `margin-top: 14px` below the tile.
  Role: 13px, uppercase, `#b8912f`.

**OPEN BLOCKER — the subset does not cover the roster.** The 39-character subset
predates the real roster. Names such as `路过的空气`, `太虚玄宸子`, `玄月吟`, `炎浔`,
`星瑶依萌`, `念心Xin`, `梁贝`, `Shen睿玄`, `燕夕YanXi`, `brie祺`, `Twice子瑜` fall back to
a system face and read differently from their neighbours. Regenerate all three weights
before showing the roster to the guild:

```bash
python -m fontTools.subset \
  "node_modules/@fontsource/noto-serif-sc/files/noto-serif-sc-chinese-simplified-700-normal.woff2" \
  --text-file=chars.txt --layout-features='*' --flavor=woff2 \
  --output-file=public/fonts/noto-serif-sc-cjk-700.woff2
```

Build `chars.txt` from `members.json` plus the tile glyphs. `pip install brotli` first,
or fontTools dies with `No module named brotli`.

---

## 6. Rejected, with the reason

| Rejected | Why it failed |
|---|---|
| **Six flat planes per tile** | Cannot follow a rounded corner. User: "a real visible gap on the edges revealing a green background". |
| **One side plane** | Dark notch at each corner. Tucking it 22px under the face traded the notch for a flat wall with a step at the shoulder. Error at the far corner measured **10px**. |
| **6 slabs instead of 14** | A 1x comparison said they were identical. User saw it at once: stepped corners, banded wall — "each section colour is not a smooth gradient". The 1x comparison was not evidence. |
| **A plain shadowed card** | "It does not look like a mahjong tile at all." The hard wall and material change are what make it read as a tile. |
| **Warm ivory palette** | Read as stained. |
| **Engraved name on the tile** | Read as blurry and unclean. Removed outright. |
| **Text inside the 3D subtree** | Rasterised at layout size, then scaled by the projection — doubled the CJK strokes. Moving it out fixed it: same text, same font, same browser. |
| **`box-shadow: inset` on the `<img>`** | Renders nothing. Replaced content paints over its own box shadow. The recess must be a separate `::after` overlay. |
| **`backdrop-filter` on the nav scrim** | A full-viewport blur over playing video, redone every frame of the fade. Replaced with a painted radial gradient. |
| **Hover scale on the nav handle** | "Too subtle." It must change width instead. |
| **Lucide line icons in the nav** | Read as web UI buttons, not mahjong faces. Replaced with hand-drawn solid fills. |
| **A hover `rotateY` of `-16deg`** | Turns the tile away. "Should make the tile face forward more instead of to the side more." |

---

## 7. Accepted trade-offs

Named so nobody "fixes" them later.

1. **Depth reads as two stacked plates**, with a visible white ledge at the material
   change, not one tapered wall.
2. **No perspective convergence.** A 2D affine matrix cannot taper. Edges stay parallel
   where the 3D build had a real trapezoid.
3. **The ledger after a flip is moot** — there is no flip. The wall sits on the right and
   does not mirror.

The win that bought these: **126 composited layers down to 0**.

---

## 8. Roster

`src/data/members.json` is the only file to touch. One object per member:

```json
{ "id": "m-78", "tier": "member", "name": "New Recruit", "role": "Member", "avatar": null }
```

Tiers: `guild_leader`, `deputy`, `commander`, `member`.
Order: leader → deputy → commanders → members in roster order. The sort is stable, so
roster order survives inside a tier.

Shipped split: leader 1 (淼琰MY), deputy 1 (Cheliodas), commander 2 (玄月吟, Ophiron),
member 73.

**77 members, and one is still missing.** Origin: 14 screenshots, 96 rows, 19 Apprentices
dropped, 77 kept against an expected 78–80.

**The missing member is NOT `gemino`.** `gemino` is row 89 of 96, role `Kakis`, already
present and already rendered. It was believed to be the gap. Adding it again duplicates a
member and fakes the total to 78. Verified in the page: exactly one `gemino` tile. Ask
for the missing row; do not invent or duplicate one to hit a number.

Dropped fields: `suit` (nothing read it), `callsign`, `path`. Do not re-add.

**Game roles do not map to site tiers.** The game emits ten labels — `Guild Leader`,
`Vice Master`, `Command`, `Guild Pillar`, `Halftime Performer`, `Peerless Victor`,
`Rando`, `Kakis`, `Members`, `Apprentice` — against four tiers. The tile renders `role`
verbatim, so the grid repeats `KAKIS` 30 times and `MEMBERS` 37 times. **Unresolved
question:** show the raw honour title or map to the four-tier model.

---

## 9. Verification loop

Run after any change to the tile, type, or roster.

```bash
# 1. Build must pass
npm run build

# 2. No 3D, no flip residue (expect 0 for each)
grep -c "preserve-3d\|perspective:\|translateZ\|mt-slice" src/index.css src/components/MemberCard3D.jsx
grep -c "flipped\|mt-back\|scaleX(-1)" src/index.css src/components/MemberCard3D.jsx
```

Then, in the live page console:

```js
document.querySelectorAll('.mt-slice').length            // 0
document.querySelectorAll('.member-tile-wrap').length    // 77
document.querySelectorAll('.mt-back').length             // 0
document.querySelectorAll('*').length                    // ~973 with the full roster
document.querySelector('.member-tile-box').getAttribute('role')  // null
```

Baseline measured 2026-10-20, 77-member page: **0** slices, **0** `preserve-3d`,
**0** `perspective`, **10** nodes per tile, **973** total nodes, badge `77 Members`.

**Do not copy a worker's node counts into a document.** A dispatched worker reported
"6 DOM nodes plus `<img>`" per tile; the page measured **10**. Its arithmetic came from
reading the JSX, not the page. Take every number from the live page.

**Fonts cannot be verified in the Camoufox browser.** Every face fails
`new FontFace(...).load()` with `NS_ERROR_FAILURE`, including known-good npm fonts.
Verify the shipped files with fontTools + PIL instead.

**Scroll performance is UNVERIFIED.** No frame-time number exists. rAF was throttled in
the test window and the browser tool's JS channel dies on any `requestAnimationFrame`
loop. The 2D rewrite removed 126 composited layers, which is the structural reason to
expect a win — but that is an argument, not a measurement. If lag persists, profile
before changing geometry: next suspects are the large `box-shadow` values on the wall
pseudo-elements and the five nav fan tiles that animate `scale`.

---

## 10. Deploy

Repo `GlennAzx/PURESUITS`, branch `main`. Cloudflare **Workers** (the user used that
form, not Pages).

`wrangler.jsonc` at the repo root points Wrangler at `./dist/`. Without it,
`wrangler deploy` has no assets directory and publishes nothing. `wrangler` is pinned in
devDependencies so CI does not pull a surprise major.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler preview` — **a real command in Wrangler 4**, listed as
  "Create a Preview deployment of the current Worker [open beta]". Do not replace it.
- No `_redirects`. The page id lives in the path, so `wrangler.jsonc` sets
  `"not_found_handling": "single-page-application"` — every unknown path serves
  `index.html` and React reads the path. **Remove that line and a direct visit to
  `/members` or `/builds` returns 404.**

**`wrangler deploy` does not build.** It uploads whatever is already in `dist/`. Run
`npm run build` first, every time. Deploying alone ships the previous build and still
reports success; the only signal is `No updated asset files to upload`. Full process,
verification commands and the 200-not-404 trap: the repo `README.md`.

---

## 11. Governing skills

This file is the project-local summary. The deeper technique lives in the Hermes skills:

| Skill | Covers |
|---|---|
| `puresuit-guild-site` | The project's own history, roster, tokens, deploy recipe |
| `css-3d-object-rendering` | Why slabs, why planes fail, the 4x corner check |
| `web-motion-and-3d-craft` | Motion and 3D craft rules |
| `motion-design-engineering` | Motion critique and construction |
| `web-font-loading-and-subsetting` | Font subsetting and offline verification |
| `local-html-visual-verification` | Screenshot + PIL verification of local pages |
| `simplified-technical-english` | How replies are written |

When a rule in this file and a skill disagree, **the measurement wins**. Record the
measurement here so the next session does not repeat the argument.

---

## 12. Builds page: radial path menu

The Builds page **is** the ring. Header at the top, then the menu centred in the rest of
the viewport. The two build cards that used to sit below are gone, at the user's request;
`src/data/builds.json` is now unread and is kept only as a shape hint for the per-path
subpages.

| Part | Value |
|---|---|
| Data | `src/data/paths.json` — 10 entries, `en`, `short`, `cn`, `attribute`, `weapons`, `icon` |
| Icons | `public/paths/` — 8 files |
| Ring | `min(600px, 86vw, 58vh)`, `aspect-ratio: 1`, nodes at **40%** radius |
| Node | `clamp(60px, 15%, 96px)` circle — 90px at the 600px ring; emblem `clamp(30px, 62%, 58px)` — 55px |
| Hover | node scales to **1.16** with a light overshoot; the emblem grows with it |
| Drift | **18px** amplitude, `760ms` cubic-bezier(0.23, 1, 0.32, 1) |
| Entrance | all nodes stacked at 12 o'clock, then **780ms** out, **55ms** stagger, `rotate` only |
| Hub | `clamp(132px, 33%, 196px)`, shows attribute / short name / CN / weapon pair |

**The drift writes CSS variables, not React state.** A `pointermove` fires dozens of
times a second; re-rendering ten nodes each time is waste. One ref, one
`requestAnimationFrame`, two variables, one compositor-only `transform`. Do not move it
into state.

**The entrance rides `rotate`, the hover rides `scale`.** Each node sits in a
`.path-slot` that spins about the ring centre, carrying the node along the circumference
for free; the node counter-rotates by the same angle so the emblem stays upright the
whole way. Both use the individual `rotate` property and the hover uses `scale`, so the
780ms entrance and the 300ms hover never share a duration. Putting both on `transform`
forces one of them to be wrong.

The phase attribute is `stacked → dealing → settled`. **`settled` exists only to drop the
per-node `transition-delay`**, so hover answers instantly after the entrance. Skip it and
hover lags by up to 495ms.

Expo easing `cubic-bezier(0.16, 1, 0.3, 1)` was tried first and rejected: it finished the
visible travel in about 300ms, so the stagger could not be seen. The project's ease-out
quint at 780ms keeps motion legible across the run — measured angular spread over 200ms
samples: 37° → 138° → 258° → 316° → 324°.

**No `backdrop-filter` on the nodes.** A blur over a moving ring is redone every frame.
The nav scrim already paid for that lesson.

**The ring is capped by viewport height, and the page height accounts for `main`'s
`pb-16`.** Two separate traps, both measured:

- Without the `58vh` term in the width, the fixed 600px ring pushed the bottom nodes below
  the fold on a 1440×800 laptop.
- `main` in `App.jsx` carries `pb-16` (64px). A page set to `min-h-svh` inside it scrolls
  by exactly 64px at every viewport size. The Builds page therefore uses
  `min-h-[calc(100svh-4rem)]`. Measured overflow after the fix: **0** at 1600×1120,
  1440×800, 1280×720 and 390×844.

Ring and node size across those viewports: 600/90, 464/70, 418/63, 335/60. Minimum node
gap stays at 22.9px or more.

**Two blank nodes are correct.** `Silkbind Wings` and `Bamboocut Kite` have no emblem yet.
`icon: null` renders a dashed circle with a faint dot, and the hub still names the path.
Do not substitute a placeholder glyph, and do not hide the node — the node is the content.

**The emblems are temporary.** They are the game's own art, but the largest is 73×105 px
and most are about 30 px. At 55 px they are upscaled roughly 1.9× and read soft on a
HiDPI screen. **That is accepted, not a bug** — the user asked for the larger size and
will replace the art. Do not shrink them back to sharpen, and do not substitute drawn
placeholders.

Measured on the live page, 1600×1120: ring 600×600, 10 nodes, every node at radius
240.0–240.1 px, node size **90 px**, hovered node **104 px**, closest gap between node
edges 58.3 px at rest and **51.1 px** with a node expanded, hub clearance 97 px. On
390×844: ring 335 px, node 60 px, minimum gap 22.9 px at rest and **18.1 px** expanded —
no collision at either size.

**`Silkbind Wings` has no Chinese name and no weapon pair on file.** It ships with
`cn: null` and `weapons: []`. Do not invent either.

### The CJK subset was rebuilt for this

The shipped subset held 49 glyphs — missing 15 of 17 path characters and 28 of 29 roster
characters, so the Chinese was silently falling back to a system face in the hub and on
the member tiles.

It now holds **95 characters per weight**, about **19 kB** each, built from every CJK
character in `src/` plus `index.html`. Rebuild with:

```bash
python -m fontTools.subset \
  node_modules/@fontsource/noto-serif-sc/files/noto-serif-sc-chinese-simplified-700-normal.woff2 \
  --text-file=chars.txt --layout-features='*' --flavor=woff2 \
  --output-file=public/fonts/noto-serif-sc-cjk-700.woff2
```

**鳶 (U+9CF6, "kite") does not exist in Noto Serif SC.** It is the only character in the
site that still falls back. Either accept it, write 鸢, or add a Traditional source face.

## 13. Dice cursor (LOCAL ONLY — not deployed, awaiting approval)

A pre-rendered 24-frame tumble, played by CSS, that sits exactly on the pointer.
`src/components/DiceCursor.jsx` + `.dice-cursor` in `src/index.css`. Mounted once in
`App.jsx`, above the nav.

| Part | Value |
|---|---|
| Body | 32px die inside a 50px sprite cell |
| Sprite | `/dice/tumble.webp` — 24 frames, 2400×100 at 2×, 60 KB |
| Playback | `background-position` + `steps(24)`, 1s loop |
| Rolling | **only while the pointer moves** — `animation-play-state` goes `running` on `pointermove`, `paused` 140ms after the last event |
| Position | 1:1 from `pointermove` — **measured 0px offset**, no easing |
| Shadow | `filter: drop-shadow(0 2px 3px rgba(8,16,26,0.55))` — reads the sprite's alpha |
| Native cursor | `html.dice-cursor-on * { cursor: none !important }` |

**The die only rolls while the pointer moves.** A die that tumbles forever beside text you
are reading is noise, not a cursor — the user asked for *"the dice should only roll when the
cursor is moving"*. `animation-play-state` starts `paused`, goes `running` on the first
`pointermove`, and returns to `paused` 140ms after the last event. 140ms is short enough to
be still while reading and long enough that a slow drag does not stutter between events.
The animation freezes on the frame it reached; measured, the `background-position` does not
move once paused. All 24 tumble frames read as a die, so a frozen frame never looks broken.

**The cursor must not lag the pointer.** The first build eased the position at `0.38` per
frame "so the die has weight". Users read that trail as unresponsive — *"the lag noticed was
by other users noticing it lags behind the cursor (feels not super responsive)"*. The
position is now written 1:1 inside `pointermove` and measures 0px at 20ms after every move.
Do not reintroduce smoothing.

**No rAF loop.** The old version re-composited a 3D cube — six shadowed faces inside a
`preserve-3d` context — every frame. The sprite asks the compositor for one background
offset. Headless Chromium measured both at a locked 60fps here, so that comparison proves
nothing about a real GPU; the sprite simply removes the per-frame 3D work.

**A pseudo-element shadow painted over the sprite.** `::before` draws above its parent's
background, not behind it, and greyed the whole die. `drop-shadow` is the fix: it reads the
sprite's alpha, so the shadow follows the tumble shape frame by frame.

**Frames come from `dice-capture.html`.** It renders the CSS cube at a fixed pose on a
transparent page; Playwright shoots each pose and PIL stitches the sheet. Regenerate with 24
poses of `(rx, ry) = (i * 15, i * 15)`. `dice-lab.html` compares variants at `/dice-lab.html`
— dev-only, not in the build.

**The die's look is fixed** and now baked into the sprite: 32px body, pips at ~21% of the
face, the 1 pip oversized at ~39% and cinnabar, faces 1 and 4 red, uniform lighting, warm-tan
edges rather than ink. Do not re-shade individual faces — the user rejected that.

| Off by default | Why |
|---|---|
| `(pointer: coarse)` | No pointer to follow; the die would sit frozen at 0,0 |
| `(prefers-reduced-motion: reduce)` | It is pure motion |

**Measured locally:** pointer offset `(0, 0)` at 20ms after each move; `steps(24)` with
`background-size: 1200px 50px`; sprite served as `image/webp`; 0 leftover 3D nodes; a tile
click still navigates to `/members/quincy` with `pointer-events: none`; die present on all
five routes; `display: none` and `cursor: auto` under reduced motion and on touch; no page
errors.


## 14. Page texture, cursor variants, loader (LOCAL ONLY)

Three systems, each selected by an attribute on `<html>` in `index.html`:

```html
<html data-texture="silk" data-cursor="halo">
```

| System | File | Values |
|---|---|---|
| Texture | `src/styles/texture.css` | `none` `mat` `grid` `silk` `smoke` `coin` |
| Cursor | `src/styles/cursor-variants.css` | `tumble` `still` `dot` `halo` `rollhot` `none` |

**Halo press scale is 0.98.** Sequence: 0.88, then 0.96, then 0.98 — the user asked twice for less click movement. Treat 0.98 as the ceiling; the click motion is the one property of this cursor that has been rejected twice.
| Loader | `src/styles/loader.css` + `components/Loader.jsx` | `pair` (only variant wired) |

Furniture (404, wall divider) lives in `src/styles/furniture.css`.

**The texture must paint on `.page-shell`, not on `body`.** `body::before` at `z-index: -1`
sits *under* the app's opaque root `<div class="bg-ink-black">`, which covers the viewport, so
the texture painted nothing. Measured: **0 pixels of difference** between `none` and `silk`
across a 120x120 crop. `.page-shell` now carries `position: relative; isolation: isolate`, so
its `::before` lands above its own background and below its children. After the fix: max
channel delta **18** for silk.

**Verify a background texture by PIXELS, not by computed style.** Reading
`getComputedStyle(body, '::before').backgroundImage` and counting gradient layers proved only
that the rule matched. Two textures passed that check while rendering invisibly. The honest
test is a pixel diff of the same crop with the texture off and on.

Measured deltas on a 120x120 bare-background crop (max channel difference):

| Texture | max | mean | pixels > 3 |
|---|---|---|---|
| mat | 10 | 2.92 | 4893 |
| grid | 14 | 0.82 | 615 |
| silk | 18 | 1.03 | 1973 |
| coin | 20 | 0.66 | 768 |
| smoke | 3 | 0.08 | 0 — still effectively invisible; needs a redesign, not a tweak |

**The buffer is boot-only: 2500 ms on a full page load or a refresh.** `BOOT_MS` in
`App.jsx` is the only number. It runs on every route, not just `/`.

**It is NOT shown on in-app navigation — that was tried and reverted.** A nav buffer (700 ms)
was implemented and removed in the same session: a route change in this app is a React state
update with nothing to fetch, so the buffer delayed every click to cover work that was not
happening. Page changes should be covered by a *transition* animation instead, planned in
`.hermes/plans/2026-10-22_222744_page-transition-overlay.md`. Do not re-add a nav buffer.

**The fade is layered, not a flat dissolve.** The backdrop clears in 420 ms while the dice
lift and shrink away in 320 ms, so the eye follows them out. In parallel, `html.is-buffering`
holds `.page-shell` at `opacity: 0` and releases it with a 460 ms fade when the overlay goes,
so there is never a frame exposing a blank page.

Measured: boot loader gone at 3418 ms (2500 + 470); nav loader gone at 1171 ms (700 + 470);
shell opacity during a nav 1 -> 0.22 at 120 ms -> 0.03 at 300 ms.

**`html.is-buffering` is added by the component**, so if the loader never mounts the page is
simply visible. Do not move that class into static HTML — a JS failure would then leave a
blank page behind an invisible overlay.

**Halo press scale is `--halo-press`, default 0.99.** Set it to `1` to remove click movement
entirely. Sequence: 0.88, 0.96, 0.98, 0.99 — the user asked for less three times, so treat
this as a ceiling, not a starting point.

## 15. Page transition — the tile wall

A wall of face-down mahjong tiles sweeps right to left across the screen, and the route
changes underneath it.

| Part | Value |
|---|---|
| File | `src/lib/transition.js`, `src/components/PageTransition.jsx`, `src/styles/transition.css` |
| Motion | one transform on one element: `translate3d(100%)` to `0` to `-100%` |
| Timing | 320 ms cover, 320 ms reveal, `cubic-bezier(.76, 0, .24, 1)` |
| Commit | the route state and `pushState` run at the instant the wall covers |
| Tiles | 210 scattered tiles: 55% face down, 45% face up (winds, 中, 發, 白, pips), rotated +/-30deg |
| Cost | one composited layer — the browser does not re-lay out during the sweep |

**The route commits under the wall, not after it.** `playTransition(commit)` takes the state
update as a callback and runs it after the cover animation resolves, then waits two frames so
the new page has painted before the reveal. Measured: wall fully covers from 395 ms, route
changes at 412 ms — so the swap is never visible.

**A decoration must never lose a navigation.** `playTransition` calls `commit()` immediately
when: reduced motion is set, the boot loader is still on screen, an overlay is not registered,
or another sweep is in flight. Measured: three navigations 45 ms apart end on the last URL
with the wall parked off-screen.

**The tiles are a messy spill, not a grid, and the layout is seeded.** 210 absolutely
positioned tiles on felt: 55% face down (pale pink shell), 45% face up (東南西北, 中, 發, the
白 frame, or suit pips). Placement is 78% clustered around 17 centres with a centre-weighted
jitter and 22% in four loose rows, because an even scatter reads as wallpaper rather than as a
table. `seeded(20261022)` in `PageTransition.jsx` makes the table identical on every mount; a
non-seeded `Math.random()` would reshuffle on every React render.

**The felt is opaque on purpose.** The tile scatter has gaps, so the panel background is what
guarantees the route swap is hidden. Never make the panel transparent.

**Do not animate the tiles individually.** They ride the panel; one transform moves all 210.
No per-tile `filter` either — 210 filtered layers is a compositing cost the variation does not
pay for.

**Reduced motion commits instantly** — verified at 75 ms with no wall shown.
