/**
 * Page transition controller.
 *
 * A plain fade. An ink panel fades in, the route commits while the screen is
 * covered, the panel fades out. No assets, no sprite, no per-tile work.
 *
 * This replaced a mahjong tile sweep. The tile version is kept in
 * `transition-capture.html` + `transition-lab.html` for a future attempt; see
 * DESIGN.md for why it was parked.
 *
 * Motion is opacity on one element, animated with the Web Animations API.
 * No React state per frame.
 */

const COVER_MS = 170;
const HOLD_MS = 60;
const REVEAL_MS = 190;
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

let overlay = null;
let busy = false;

export function registerTransition(el) {
  overlay = el;
}

/** True while a transition is running. Used to skip double transitions. */
export function isTransitioning() {
  return busy;
}

const nextPaint = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run a route change under the fade.
 * `commit` performs the state update and the history push.
 *
 * If anything prevents the animation — reduced motion, the boot loader still on
 * screen, a missing overlay — the commit runs immediately. A navigation must
 * never be lost to a decoration.
 */
export async function playTransition(commit) {
  const reduce =
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;
  const booting = typeof document !== 'undefined' && !!document.querySelector('.loader');

  if (busy || !overlay || reduce || booting) {
    commit();
    return;
  }

  busy = true;
  overlay.style.visibility = 'visible';

  try {
    await overlay.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: COVER_MS, easing: EASE, fill: 'forwards' }
    ).finished;

    // Fully covered. Swap underneath.
    commit();
    await nextPaint();

    // A short hold stops the fade reading as a flicker on a fast machine.
    await wait(HOLD_MS);

    await overlay.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: REVEAL_MS, easing: EASE, fill: 'forwards' }
    ).finished;
  } finally {
    // Always reset, even if an animation was cancelled — otherwise the panel
    // stays parked over the page and the site looks broken.
    overlay.getAnimations().forEach((a) => a.cancel());
    overlay.style.visibility = 'hidden';
    overlay.style.opacity = '0';
    busy = false;
  }
}
