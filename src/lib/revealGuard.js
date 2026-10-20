/**
 * Safety net for entrance animations.
 *
 * GSAP sets opacity:0 on the first frame of a `from()` tween. If that tween
 * never completes — a ScrollTrigger that never fires, a script error, a tab
 * restored mid-load, a bundled plugin failing — the content stays invisible
 * even though it is sitting in the viewport.
 *
 * This reveals only elements that are ON SCREEN and still hidden, so elements
 * legitimately waiting below the fold are left alone and their scroll reveal
 * still works.
 */

const SELECTORS = [
  '.events-header',
  '.events-carousel',
  '.event-card',
  '.members-header',
  '.leadership-pane',
  '.member-tile-wrap',
  '.mj-header',
  '.mj-section',
  '.builds-header',
  '.build-card',
  '.gallery-header',
  '.gallery-slot',
  '.landing-footer',
];

export function revealVisibleContent() {
  const vh = window.innerHeight || 0;

  for (const selector of SELECTORS) {
    document.querySelectorAll(selector).forEach((el) => {
      const rect = el.getBoundingClientRect();
      const onScreen = rect.top < vh && rect.bottom > 0 && rect.width > 0;
      if (!onScreen) return;

      if (parseFloat(getComputedStyle(el).opacity) < 0.05) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });
  }
}

/** Runs once after `delay`. Returns a cleanup function. */
export function installRevealGuard(delay = 2600) {
  const id = window.setTimeout(revealVisibleContent, delay);
  return () => window.clearTimeout(id);
}
