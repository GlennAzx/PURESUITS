import { useEffect, useRef } from 'react';

/**
 * Sprite cursor.
 *
 * The die is a pre-rendered sprite in public/dice/tumble.webp. CSS plays it.
 * This component moves one element to the pointer and publishes two state
 * classes on <html> that the cursor variants react to:
 *
 *   .is-hot       pointer is over something clickable
 *   .is-pressing  button is held down
 *
 * The variant itself is chosen by data-cursor on <html> and lives in
 * src/styles/cursor-variants.css. 'halo' is the default: a still die inside a
 * ring that opens over links.
 *
 * Two things here are deliberate:
 *
 * 1. No smoothing. An earlier build eased the position at 0.38 per frame "so
 *    the die has weight". Users read that easing as the cursor lagging behind
 *    the pointer. A cursor must sit exactly where the pointer is.
 * 2. No rAF loop. The transform is written inside pointermove. A loop running
 *    at 60fps to re-write a value that only changes on input is wasted frames.
 */

// What counts as interactive. Checked with closest(), so a click on a label or
// an icon inside a button still counts as the button.
const HOT = 'a, button, [role="button"], input, select, textarea, label, summary, .member-tile-wrap';

export default function DiceCursor() {
  const ref = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || calm.matches) return undefined;

    const el = ref.current;
    const root = document.documentElement;
    let shown = false;
    let rolling = false;
    let hot = false;
    let idleTimer = 0;

    // Rolling stops 140ms after the last pointer event. Short enough that the
    // die is still while you read, long enough that a slow drag does not
    // stutter between events. Only the 'tumble' variant rolls at all; the
    // others override the animation, but the flag stays correct either way.
    const stopRolling = () => {
      rolling = false;
      el.style.animationPlayState = 'paused';
    };

    const onMove = (event) => {
      el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;

      if (!shown) {
        shown = true;
        el.style.opacity = '1';
        root.classList.add('dice-cursor-on');
      }

      if (!rolling) {
        rolling = true;
        el.style.animationPlayState = 'running';
      }
      clearTimeout(idleTimer);
      idleTimer = setTimeout(stopRolling, 140);

      // Hover state. event.target is the topmost element under the pointer;
      // the die itself is pointer-events: none, so it never shadows the page.
      const nextHot = !!(event.target instanceof Element && event.target.closest(HOT));
      if (nextHot !== hot) {
        hot = nextHot;
        root.classList.toggle('is-hot', hot);
      }
    };

    const onDown = () => root.classList.add('is-pressing');
    const onUp = () => root.classList.remove('is-pressing');

    // Hiding the real cursor is session-wide, so drop the die and every state
    // class together if the pointer leaves for a touch screen or a mouse
    // unplugs.
    const onLeave = () => {
      el.style.opacity = '0';
      clearTimeout(idleTimer);
      stopRolling();
      hot = false;
      root.classList.remove('is-hot', 'is-pressing');
    };
    const onEnter = () => {
      if (shown) el.style.opacity = '1';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerenter', onEnter);

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerenter', onEnter);
      root.classList.remove('dice-cursor-on', 'is-hot', 'is-pressing');
    };
  }, []);

  return <div className="dice-cursor" ref={ref} aria-hidden="true" />;
}
