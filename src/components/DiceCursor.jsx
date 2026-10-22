import { useEffect, useRef } from 'react';

/**
 * Sprite cursor.
 *
 * The tumble is a pre-rendered 24-frame sprite in public/dice/tumble.webp and
 * CSS plays it. This component only moves one element to the pointer.
 *
 * Two things here are deliberate:
 *
 * 1. No smoothing. An earlier build eased the position at 0.38 per frame "so
 *    the die has weight". Users read that easing as the cursor lagging behind
 *    the pointer. A cursor is not an animation — it must sit exactly where the
 *    pointer is, every event.
 * 2. No rAF loop. The transform is written inside pointermove. A loop that runs
 *    at 60fps to re-write a value that only changes on input is wasted frames,
 *    and it is the reason the old 3D version felt heavy.
 */
export default function DiceCursor() {
  const ref = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || calm.matches) return undefined;

    const el = ref.current;
    let shown = false;

    const onMove = (event) => {
      el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      if (!shown) {
        shown = true;
        el.style.opacity = '1';
        document.documentElement.classList.add('dice-cursor-on');
      }
    };

    // Hiding the real cursor is session-wide, so drop the die and the class
    // together if the pointer leaves for a touch screen or the mouse unplugs.
    const onLeave = () => {
      el.style.opacity = '0';
    };
    const onEnter = () => {
      if (shown) el.style.opacity = '1';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerenter', onEnter);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerenter', onEnter);
      document.documentElement.classList.remove('dice-cursor-on');
    };
  }, []);

  return <div className="dice-cursor" ref={ref} aria-hidden="true" />;
}
