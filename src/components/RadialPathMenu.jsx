import React, { useEffect, useRef, useState } from 'react';
import paths from '../data/paths.json';

/**
 * Radial path menu.
 *
 * Ten nodes sit on one orbit. The whole ring drifts a little as the pointer
 * moves anywhere on the page, which is the only motion — no spin, no pulse.
 *
 * Why the drift writes CSS variables instead of React state: a pointermove
 * fires dozens of times a second, and re-rendering ten nodes on each one is
 * waste. One ref, one requestAnimationFrame, two variables.
 *
 * The node emblems are the game's own art, but the largest is 73x105 px and
 * most are about 30 px. They are shown at 34 px and will look soft on a HiDPI
 * screen until the real art replaces them. Missing emblems render a blank
 * node, on purpose.
 */

const DRIFT = 18; // px. Subtle by intent; raise it and the menu starts to swim.

export default function RadialPathMenu() {
  const ringRef = useRef(null);
  const [active, setActive] = useState(null);
  const [hover, setHover] = useState(null);

  // Pointer drift. Writes straight to the element, never to React state.
  useEffect(() => {
    const el = ringRef.current;
    if (!el) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;

    let raf = 0;
    let nx = 0;
    let ny = 0;

    const flush = () => {
      raf = 0;
      el.style.setProperty('--drift-x', `${nx.toFixed(2)}px`);
      el.style.setProperty('--drift-y', `${ny.toFixed(2)}px`);
    };

    const onMove = (event) => {
      nx = (event.clientX / window.innerWidth) * 2 - 1;
      ny = (event.clientY / window.innerHeight) * 2 - 1;
      nx *= DRIFT;
      ny *= DRIFT;
      if (!raf) raf = requestAnimationFrame(flush);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const shown = hover ?? active;
  const current = shown === null ? null : paths[shown];
  const total = paths.length;

  return (
    <section className="radial-paths" aria-label="Martial Arts paths">
      <div className="radial-paths-ring" ref={ringRef}>
        {/* Orbit hairline. Barely there — it stops the nodes reading as debris. */}
        <span className="radial-orbit" aria-hidden="true" />

        {paths.map((path, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / total;
          const x = 50 + Math.cos(angle) * 40;
          const y = 50 + Math.sin(angle) * 40;
          const isActive = active === i;
          const isEmpty = !path.icon;

          return (
            <button
              key={path.id}
              type="button"
              className="path-node"
              style={{ left: `${x}%`, top: `${y}%` }}
              data-empty={isEmpty || undefined}
              data-active={isActive || undefined}
              aria-label={`${path.en}${path.cn ? `, ${path.cn}` : ''}${isEmpty ? ' — emblem pending' : ''}`}
              aria-pressed={isActive}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover((h) => (h === i ? null : h))}
              onFocus={() => setHover(i)}
              onBlur={() => setHover((h) => (h === i ? null : h))}
              onClick={() => setActive((a) => (a === i ? null : i))}
            >
              {isEmpty ? (
                <span className="path-node-blank" aria-hidden="true" />
              ) : (
                <img src={path.icon} alt="" draggable="false" decoding="async" />
              )}
            </button>
          );
        })}

        <div className="radial-hub" aria-live="polite">
          <span className="radial-hub-attribute">
            {current ? current.attribute : 'Martial Paths'}
          </span>
          <strong className="radial-hub-name">
            {current ? current.short : `${total} disciplines`}
          </strong>
          <span className="radial-hub-cn">{current ? current.cn ?? '—' : '武学流派'}</span>
          {current && current.weapons.length > 0 && (
            <span className="radial-hub-weapons">{current.weapons.join(' · ')}</span>
          )}
        </div>
      </div>
    </section>
  );
}
