import { useEffect, useRef, useState } from 'react';

/**
 * Buffer screen.
 *
 * Shown on first load only. Covers the page for a MANDATORY duration, then
 * fades out and unmounts.
 *
 * Variant 'pair' — two dice at different rates, the way a mahjong deal is
 * actually thrown. Markup for all four variants is in src/styles/loader.css.
 *
 * Why first load only: a route change in this app is a React state change with
 * nothing to fetch. A loader there would ADD delay to an instant transition.
 *
 * Why the bar is driven by rAF and written straight to the DOM: a React state
 * update per frame would re-render the component ~150 times for one animation.
 * The element is the only thing that changes, so it is the only thing touched.
 */

// Mandatory on-screen time. The user asked for "a few seconds"; 2500 is the
// number to change if that judgement shifts. Every millisecond here is delay
// this site did not have before, so keep it honest and keep it in one place.
const MANDATORY_MS = 2500;
const FADE_MS = 560;

export default function Loader() {
  const [state, setState] = useState('in'); // 'in' | 'out' | 'gone'
  const fillRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      if (fillRef.current) fillRef.current.style.width = '100%';
      setState('out');
      // Matches the 520ms opacity transition in loader.css.
      setTimeout(() => setState('gone'), FADE_MS);
    };

    // Ease-out: progress moves early and settles, instead of crawling at the
    // end. Caps at 92 — the last 8 is the "done" jump, which reads as a result
    // rather than as the bar drifting to the finish line.
    const tick = (now) => {
      if (done) return;
      const t = Math.min(1, (now - start) / MANDATORY_MS);
      const eased = 1 - Math.pow(1 - t, 1.7);
      if (fillRef.current) fillRef.current.style.width = `${(eased * 92).toFixed(1)}%`;
      if (t < 1) raf = requestAnimationFrame(tick);
      else finish();
    };

    raf = requestAnimationFrame(tick);

    return () => {
      done = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    // The page must not scroll behind the overlay.
    document.documentElement.style.overflow = state === 'gone' ? '' : 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [state]);

  if (state === 'gone') return null;

  return (
    <div className="loader" data-state={state} role="status" aria-live="polite" aria-label="Loading">
      <div className="loader__inner">
        <div className="loader__pair">
          <div className="loader__die" />
          <div className="loader__die" />
        </div>
        <div className="loader__label">Shuffling the wall</div>
        <div className="loader__bar">
          <div className="loader__fill" ref={fillRef} style={{ width: '0%' }} />
        </div>
      </div>
    </div>
  );
}
