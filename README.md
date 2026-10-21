# PURESUIT (清一色) - Where Winds Meet Guild Website

A modern, dynamic guild website built with **Vite + React + Tailwind CSS**, ready for zero-configuration continuous deployment on **Cloudflare Pages via GitHub**.

**Read [docs/DESIGN.md](docs/DESIGN.md) before changing the tiles, the type or the roster.** It records the rules that were decided with the guild, the alternatives that were rejected and why, and how to verify each rule.

## Features
- **Right-Hand Fanned Mahjong Navigation**: tile bar fanning along a radial curve. 2D transforms only.
- **Cinematic Video Hero**: Ambient background with controls.
- **Member Tiles**: 77 members on ivory/jade mahjong tiles with a 白板 frame, drawn with 2D transforms. Name and title sit below the tile. No flip.
- **Sichuan Bloody Battle (血战到底) Mahjong Guide**: Full illustrated guide with scoring rules.
- **Officer-Editable JSON Data**: Update `src/data/events.json`, `src/data/members.json`, and `src/data/builds.json` via GitHub commits to update the site live.
- **Recruitment Application Scroll**: Ready for Formspree email forwarding.
- **No DPS Simulator**: Pure qualitative stance rotations and martial arts synergies.

The site uses real URLs. Each page is a path — `/`, `/members`, `/builds`, `/gallery`, `/mahjong-guide` — so a refresh keeps the page, links are shareable, and Back/Forward work. `App.jsx` reads the path on load and pushes history on navigation. Workers needs `not_found_handling: "single-page-application"` in `wrangler.jsonc` so those paths serve `index.html`.

## Local Development
```bash
npm install
npm run dev
```

## Cloudflare Pages Deployment
1. Push this repository to GitHub.
2. In Cloudflare Dashboard, go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
