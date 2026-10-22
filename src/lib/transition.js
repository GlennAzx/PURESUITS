/**
 * Page transition controller.
 *
 * A wall of face-down mahjong tiles sweeps right to left across the screen. The
 * route commits at the instant the wall fully covers the viewport, so the user
 * never sees the content swap.
 *
 * Timing: one continuous crossing, 320 ms in, 320 ms out. The wall travels two
 * viewport widths (from +100% to -100%), so the speed is constant across the
 * whole move — no pause, no easing between the two halves.
 *
 * Motion is a single transform on one element, animated with the Web Animations
 * API. No React state per frame, no GSAP timeline, no per-tile animation.
 */

const COVER_MS = 320;
const REVEAL_MS = 320;
const EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';

const HIDDEN = 'translate3d(100%, 0, 0)';
const COVERED = 'translate3d(0, 0, 0)';
const PASSED = 'translate3d(-100%, 0, 0)';

let overlay = null;
let busy = false;

export function registerTransition(el) {
  overlay = el;
}

/** True while a sweep is running. Used to skip double transitions. */
export function isTransitioning() {
  return busy;
}

const nextPaint = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

/**
 * Run a route change under the wall.
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
      [{ transform: HIDDEN }, { transform: COVERED }],
      { duration: COVER_MS, easing: EASE, fill: 'forwards' }
    ).finished;

    // Fully covered. Swap underneath.
    commit();
    await nextPaint();

    await overlay.animate(
      [{ transform: COVERED }, { transform: PASSED }],
      { duration: REVEAL_MS, easing: EASE, fill: 'forwards' }
    ).finished;
  } finally {
    // Always reset, even if an animation was cancelled — otherwise the wall
    // stays parked over the page and the site looks broken.
    overlay.getAnimations().forEach((a) => a.cancel());
    overlay.style.visibility = 'hidden';
    overlay.style.transform = HIDDEN;
    busy = false;
  }
}
