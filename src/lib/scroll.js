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
