import { useEffect, useRef, useState } from 'react';

/**
 * Buffer screen.
 *
 * Two jobs, one component:
 *
 *   boot  — first full page load. MANDATORY, long (BOOT_MS).
 *   nav   — every in-app route change. Short (NAV_MS). The app is a SPA, so a
 *           route change is a state update with nothing to fetch; this exists
 *           because the user asked for the buffer on every page, not because
 *           anything is loading.
 *
 * Variant 'pair' — two dice at different rates, the way a mahjong deal is
 * actually thrown. Markup for all four variants is in src/styles/loader.css.
 *
 * The progress bar is written straight to the element from a rAF loop. A React
 * state update per frame would re-render this component ~150 times for one
 * animation.
 */

const easeOut = (t) => 1 - Math.pow(1 - t, 1.7);

export default function Loader({ ms = 2500, onDone = null }) {
  const [state, setState] = useState('in'); // 'in' | 'out' | 'gone'
  const fillRef = useRef(null);
  const doneRef = useRef(null);
  if (doneRef.current === null) doneRef.current = onDone;

  useEffect(() => {
    const root = document.documentElement;
    // Held at 0 for the duration; released with the overlay. See loader.css.
    root.classList.add('is-buffering');

    const start = performance.now();
    let raf = 0;
    let done = false;

    const release = () => {
      root.classList.remove('is-buffering');
      setState('out');
      // Matches the 420ms opacity transition in loader.css, plus a margin.
      setTimeout(() => {
        setState('gone');
        if (doneRef.current) doneRef.current();
      }, 470);
    };

    const finish = () => {
      if (done) return;
      done = true;
      if (fillRef.current) fillRef.current.style.width = '100%';
      release();
    };

    // Ease-out: progress moves early and settles. Caps at 92 — the last 8 is
    // the "done" jump, which reads as a result rather than a drift.
    const tick = (now) => {
      if (done) return;
      const t = Math.min(1, (now - start) / ms);
      if (fillRef.current) {
        fillRef.current.style.width = `${(easeOut(t) * 92).toFixed(1)}%`;
      }
      if (t < 1) raf = requestAnimationFrame(tick);
      else finish();
    };

    raf = requestAnimationFrame(tick);

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      root.classList.remove('is-buffering');
    };
  }, [ms]);

  useEffect(() => {
    // The page must not scroll behind the overlay.
    document.documentElement.style.overflow = state === 'gone' ? '' : 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [state]);

  if (state === 'gone') return null;

  return (
    <div
      className="loader"
      data-state={state}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="loader__inner">
        <div className="loader__pair">
          <div className="loader__die" />
          <div className="loader__die" />
        </div>
        <div className="loader__label">Testing your Luck</div>
        <div className="loader__bar">
          <div className="loader__fill" ref={fillRef} style={{ width: '0%' }} />
        </div>
      </div>
    </div>
  );
}
