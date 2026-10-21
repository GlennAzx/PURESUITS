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

A 26px ivory die that follows the pointer and rolls in the direction of travel, then
settles with its nearest face square to the viewer. `src/components/DiceCursor.jsx` +
`.dice-cursor` in `src/index.css`. Mounted once in `App.jsx`, above the nav.

| Part | Value |
|---|---|
| Body | 26px cube, `perspective: 150px`, six faces at `translateZ(13px)` |
| Follow | `lerp 0.38` per frame — measured 7–11px behind a pointer moving in 200px steps |
| Roll | `rotateX += dy * 0.5`, `rotateY -= dx * 0.5` while speed > 0.6px/frame |
| Settle | after 110ms idle, ease to the nearest multiple of 90° at `0.16`/frame |
| Faces | opposite faces sum to 7: 1/6, 3/4, 5/2 |
| Pips | 4px ink `#1b2733`; faces 1 and 4 use `--c-cinnabar`, as on a real die |
| Light | **uniform** — every face `#f7f3e9`, one outline, no per-face tint, no inner gradient |
| Outline | `inset 0 0 0 1.5px rgba(27,39,51,0.62)` |
| Native cursor | `html.dice-cursor-on * { cursor: none !important }` |

**The dark outline is load-bearing.** The die is ivory and the member tiles are white; with
a 1px 22%-alpha rule the die all but vanished when it crossed a portrait. The outline is
the same ink as the 白板 tile frame.

**All six faces are lit identically.** An earlier build shaded them in three tones to make
the tumble read as a solid cube; the user rejected it — *"the dice should be equally lit on
all sides (some sides are clearly darker atm)"*. Every face is now `#f7f3e9` with the same
`inset` rule and no inner gradient. The outline and the 150px perspective carry the 3D read
instead. Do not reintroduce per-face tints.

**Written from one rAF loop, no React state.** Re-rendering at 60fps is how a custom cursor
ends up lagging. The loop **stops** once the die has settled and restarts on the next
`pointermove` — an always-on rAF for a decoration is wasted battery.

| Off by default | Why |
|---|---|
| `(pointer: coarse)` | No pointer to follow; the die would sit frozen at 0,0 |
| `(prefers-reduced-motion: reduce)` | It is pure motion |

**Measured locally:** die centre lands exactly on the pointer when settled; lag 7–11px while
moving; settled rotation `rotateX(179.98deg) rotateY(-720.002deg)`, both exact multiples of
90°; 6 faces, 21 pips; tile click and nav still work with `pointer-events: none`; no page
errors on any of the five routes.
