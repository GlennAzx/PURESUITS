/**
 * Scrolling helper.
 *
 * Lenis owns the scroll position, so a plain `window.scrollTo` from a page
 * fights it and lands in the wrong place. App registers its Lenis instance
 * here; anything that needs to scroll asks this module.
 */

let lenis = null;

export function setLenis(instance) {
  lenis = instance;
}

export function scrollToElement(el, { offset = -140, duration = 1.1 } = {}) {
  if (!el) return;
  if (lenis) {
    // Negative offset leaves room above the element for the sticky nav area.
    lenis.scrollTo(el, { offset, duration });
    return;
  }
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  // Belt and braces. Some browsers restore the previous scroll offset after
  // load, which can land after Lenis has already jumped. Pushing the window to
  // 0 as well removes the race. App also sets history.scrollRestoration to
  // 'manual' so the browser stops trying.
  window.scrollTo(0, 0);
}
