# Page Transition Overlay — Implementation Plan

> **STATUS: IMPLEMENTED 2026-10-22.** Built as a single rigid wall of tile backs
> sweeping right to left, not as 12 independently animated strips. The controller
> and the commit-under-cover mechanic are as planned; the visual is the wall the
> user specified afterwards. See `docs/DESIGN.md` §15 for the shipped values.
> Tasks 1-2 below describe the strip approach and are kept only as history.

**Goal:** cover the content swap on an in-app route change with a short, on-brand
animation, so switching pages reads as a deliberate move instead of an instant cut.

**Architecture:** a fixed overlay of 12 vertical strips (mahjong tile backs) that rise to
cover the viewport, then fall away after the route has changed underneath. The route state
update is deferred to the midpoint of the animation, so the user never sees the swap.
Motion is driven by the Web Animations API, which returns a promise per strip — no GSAP
timeline, no state churn.

**Tech stack:** React 18, plain CSS transforms, Web Animations API. No new dependencies.

---

## Current context

- `src/App.jsx` owns routing: `parseRoute()`, `navigate(page, slug)`, and a `popstate`
  listener. `navigate` calls `setRoute` and `history.pushState` immediately.
- `src/components/Loader.jsx` is a **boot-only** buffer, 2500 ms, mounted once in `App`.
  It must not be reused here: it is a full-screen opaque wait, not a transition.
- `.page-shell` is the app root (`position: relative; isolation: isolate`).
- Lenis owns scrolling (`src/lib/scroll.js`); `ScrollTrigger.refresh()` runs on page change.
- Tailwind palette tokens: `--c-ink-black`, `--wall-1..4`, `--c-imperial-gold`.

**Hard constraints**

1. Total transition ≤ 650 ms, cover phase ≤ 300 ms.
2. Never block input longer than the cover phase.
3. `prefers-reduced-motion: reduce` → no animation, commit immediately.
4. Must work for Back/Forward, not just nav clicks.
5. Must not stack with the boot loader on first paint.

---

## Design options considered

| Option | Look | Cost | Verdict |
|---|---|---|---|
| **A. Tile-wall sweep** (recommended) | 12 tile-back columns rise from the bottom, hold, fall away upward | S | On-brand: it is the wall motif the 404 and divider already use |
| B. Directional wipe | One panel sweeps left→right | XS | Cheap but generic; reads like a slideshow |
| C. Dice pair rolls across | The two dice cross the screen | M | Charming once, tiring every click |
| D. Cross-fade only | 200 ms opacity swap | XS | Least risk, least identity. Good fallback if A feels heavy |

Recommendation: **A**, with **D** as the reduced-motion path.

---

## Task 1 — Overlay component (no wiring)

**Files**
- Create: `src/components/PageTransition.jsx`
- Create: `src/styles/transition.css`

**Step 1:** Create the component. Twelve strips, no animation yet.

```jsx
export default function PageTransition() {
  return (
    <div className="pgt" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} className="pgt__strip" style={{ '--i': i }} />
      ))}
    </div>
  );
}
```

**Step 2:** Style it. Strips start off-screen, overlay is inert.

```css
.pgt {
  position: fixed;
  inset: 0;
  z-index: 9000;          /* under the loader (10000), over content */
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  pointer-events: none;
  visibility: hidden;
}
.pgt__strip {
  background-image: linear-gradient(180deg, var(--wall-1), var(--wall-4));
  box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.35);
  transform: translateY(101%);
  will-change: transform;
}
```

**Step 3:** Mount it in `App.jsx` next to `<DiceCursor />`.
Verify: page renders, nothing visible, no layout shift.

**Step 4:** Commit.

---

## Task 2 — Controller

**Files**
- Create: `src/lib/transition.js`

**Step 1:** Write the controller. It exposes one function and one in-flight guard.

```js
const COVER = 260;      // strips rise
const STAGGER = 18;     // per-strip delay
const REVEAL = 300;     // strips fall

let strips = null;
let busy = false;

export function registerTransition(el) {
  strips = [...el.querySelectorAll('.pgt__strip')];
}
export function isTransitioning() {
  return busy;
}

const animate = (el, keyframes, opts) => el.animate(keyframes, opts).finished;

export async function playTransition(commit) {
  if (busy || !strips?.length) { commit(); return; }   // never trap a nav
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { commit(); return; }

  busy = true;
  const root = document.querySelector('.pgt');
  root.style.visibility = 'visible';

  await Promise.all(strips.map((el, i) =>
    animate(el, [{ transform: 'translateY(101%)' }, { transform: 'translateY(0)' }], {
      duration: COVER, delay: i * STAGGER, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards',
    })
  ));

  commit();                       // route + history update happens here, under cover
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  await Promise.all(strips.map((el, i) =>
    animate(el, [{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }], {
      duration: REVEAL, delay: (strips.length - 1 - i) * STAGGER, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards',
    })
  ));

  root.style.visibility = 'hidden';
  strips.forEach((el) => { el.style.transform = 'translateY(101%)'; });
  busy = false;
}
```

**Step 2:** Register strips on mount in `PageTransition.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import { registerTransition } from '../lib/transition';

export default function PageTransition() {
  const ref = useRef(null);
  useEffect(() => { registerTransition(ref.current); }, []);
  return (
    <div className="pgt" ref={ref} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} className="pgt__strip" style={{ '--i': i }} />
      ))}
    </div>
  );
}
```

Verify: no errors, overlay still invisible.

**Step 3:** Commit.

---

## Task 3 — Wire it into `navigate()` and `popstate`

**Files**
- Modify: `src/App.jsx`

**Step 1:** `navigate` commits inside the transition.

```js
const navigate = useCallback((page, slug = null) => {
  const next = PAGES.includes(page) ? page : 'home';
  const nextSlug = next === 'members' ? slug : null;
  playTransition(() => {
    setRoute({ page: next, slug: nextSlug, source: nextSlug ? 'click' : 'load' });
    const url = pathFor(next, nextSlug);
    if (window.location.pathname !== url) {
      window.history.pushState({ page: next, slug: nextSlug }, '', url);
    }
  });
}, []);
```

**Step 2:** Back/Forward runs the same path. The URL is already correct, so commit only the state.

```js
useEffect(() => {
  const onPop = () => {
    const next = parseRoute();
    playTransition(() => setRoute(next));
  };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}, []);
```

**Step 3:** Verify with Playwright, asserting at the midpoint that the strips cover the screen:

```python
page.evaluate("() => { history.pushState({}, '', '/members'); window.dispatchEvent(new PopStateEvent('popstate')); }")
page.wait_for_timeout(200)
covered = page.evaluate("() => { const s=document.querySelector('.pgt__strip');
    const r=s.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }")
```
Expected: `covered == True`, then `location.pathname == '/members'`, then total ≤ 700 ms.

**Step 4:** Commit.

---

## Task 4 — Interaction with scroll and the boot loader

**Files**
- Modify: `src/App.jsx`

**Step 1:** Scroll reset must happen while covered. The existing effect scrolls on
`activePage` change; because the route commits under the cover, that is already correct —
verify rather than change it.

**Step 2:** Guard against stacking: skip the transition if the boot loader is still on
screen (`document.querySelector('.loader')`). One line at the top of `playTransition`.

**Step 3:** Verify: reload, then click a nav tile within the first second. Expected: no
double overlay, no flicker.

**Step 4:** Commit.

---

## Task 5 — Reduced motion and rapid clicks

**Files**
- `src/lib/transition.js`

**Step 1:** Reduced motion already short-circuits to `commit()`. Verify by running a context
with `reduced_motion="reduce"`: route changes instantly, no `.pgt` visibility.

**Step 2:** Rapid clicks: `busy` short-circuits the second call to `commit()` immediately, so
the second navigation still happens — just without animation. That is the safe behaviour.
Verify by firing three `popstate`s 50 ms apart and asserting the final path is the last one.

**Step 3:** Commit.

---

## Files likely to change

| File | Change |
|---|---|
| `src/components/PageTransition.jsx` | new — overlay + strip registration |
| `src/lib/transition.js` | new — timing controller |
| `src/styles/transition.css` | new — strips, palette |
| `src/App.jsx` | navigate + popstate commit inside `playTransition` |
| `docs/DESIGN.md` | new section recording the timings and why the nav buffer was reverted |

## Validation

- Playwright: cover at midpoint, route correct after, total ≤ 700 ms.
- Reduced motion: no overlay, instant route.
- Three rapid navigations: final route correct, no stuck overlay.
- Boot loader and transition never co-exist.
- No console errors on any of the five routes.

## Risks and open questions

1. **The strips are an opaque wall.** If a page is slow to paint after commit, the reveal
   exposes empty space. Mitigation: reveal duration is fixed; content is already mounted.
2. **Z-index vs the nav handle** (currently ~50) and the loader (10000). 9000 sits between;
   confirm the handle is fully covered.
3. **ScrollTrigger** may refresh while covered and measure hidden content. Watch for
   animations that never fire after a transition; the existing `installRevealGuard`
   (2600 ms) is the safety net.
4. **Direction** — strips rising then falling is a "curtain". The alternative, a wall being
   built then swept away, may suit the mahjong motif better; decide from the demo.
5. **Cost of a transition on every click.** 560 ms added per navigation, by choice. This is
   the same trade the boot buffer makes, so treat the numbers as a design decision, not a
   performance one.
