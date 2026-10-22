import { useEffect, useRef, useState } from 'react';

/**
 * Buffer screen.
 *
 * Shown on first load only. It covers the page while fonts, the hero poster
 * and the dice sprite arrive, then fades out and unmounts.
 *
 * Variant 'pair' — two dice at different rates, the way a mahjong deal is
 * actually thrown. Markup for all four variants is in src/styles/loader.css.
 *
 * Why first load only: a route change in this app is a React state change with
 * nothing to fetch. A loader there would ADD delay to an instant transition.
 */

// 550ms, not 900ms. The floor exists so the animation is not a flicker, but
// every millisecond above the real load time is delay this site never had.
// Measured local load is ~350ms, so 550 costs ~200ms and still reads as intent.
const MIN_MS = 550;
const MAX_MS = 4000; // never hold the page hostage to a slow asset

export default function Loader() {
  const [progress, setProgress] = useState(8);
  const [state, setState] = useState('in'); // 'in' | 'out' | 'gone'
  const startedAt = useRef(performance.now());

  useEffect(() => {
    let done = false;

    // Creep forward so the bar always moves, even while waiting on fonts.
    const creep = setInterval(() => {
      setProgress((p) => (p >= 92 ? p : p + Math.random() * 7));
    }, 180);

    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(creep);
      setProgress(100);

      const elapsed = performance.now() - startedAt.current;
      const wait = Math.max(0, MIN_MS - elapsed);

      setTimeout(() => {
        setState('out');
        // Matches the 520ms opacity transition in loader.css.
        setTimeout(() => setState('gone'), 560);
      }, wait);
    };

    // Wait for FONTS, not for window.load. `load` includes the hero video, and
    // on a slow connection that held this overlay on screen for seconds — a
    // loader that outlasts the content is worse than no loader.
    const fontWait = document.fonts?.ready ?? Promise.resolve();
    fontWait.then(finish).catch(finish);

    // Hard ceiling. Fonts never gate the page for longer than this.
    const cap = setTimeout(finish, 1200);

    return () => {
      clearInterval(creep);
      clearTimeout(cap);
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
    <div className="loader" data-state={state} role="status" aria-live="polite">
      <div className="loader__inner">
        <div className="loader__pair">
          <div className="loader__die" />
          <div className="loader__die" />
        </div>
        <div className="loader__label">Shuffling the wall</div>
        <div className="loader__bar">
          <div className="loader__fill" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      </div>
    </div>
  );
}
