import React, { useEffect, useRef, useState } from 'react';
import paths from '../data/paths.json';

/**
 * Radial path menu.
 *
 * Entrance: every node starts stacked at 12 o'clock, then each one sweeps out
 * along the circumference to its own angle, staggered. Each node sits on a
 * .path-slot that rotates about the ring centre, so the node travels along the
 * circumference for free; the node counter-rotates by the same amount so the
 * emblem stays upright the whole way.
 *
 * Both rotations run on the individual `rotate` property, not `transform`.
 * That keeps them separate from the hover `scale`, so the hover can transition
 * in 300ms while the deal takes ~700ms without one fighting the other.
 *
 * The pointer drift writes CSS variables instead of React state: a pointermove
 * fires dozens of times a second and re-rendering ten nodes each time is waste.
 * One ref, one requestAnimationFrame, two variables.
 *
 * The node emblems are the game's own art, but the largest is 73x105 px and
 * most are about 30 px. They are capped at 44 px and will look soft on a HiDPI
 * screen until the real art replaces them. Missing emblems render a blank node.
 */

const DRIFT = 18;      // px of pointer drift
const DEAL_MS = 780;   // one node's travel time; keep in sync with --deal-ms
const STAGGER = 55;    // ms between nodes

export default function RadialPathMenu() {
  const ringRef = useRef(null);
  const [active, setActive] = useState(null);
  const [hover, setHover] = useState(null);
  // 'stacked' -> 'dealing' -> 'settled'. The settle step drops the per-node
  // transition delay so hover responds at once after the entrance.
  const [phase, setPhase] = useState('stacked');

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPhase('settled');
      return undefined;
    }
    // Two frames: the first paints the stacked state, the second starts the move.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPhase('dealing'));
    });
    const total = (paths.length - 1) * STAGGER + DEAL_MS + 160;
    const timer = setTimeout(() => setPhase('settled'), total);
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      clearTimeout(timer);
    };
  }, []);

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
      nx = ((event.clientX / window.innerWidth) * 2 - 1) * DRIFT;
      ny = ((event.clientY / window.innerHeight) * 2 - 1) * DRIFT;
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
  const step = 360 / total;

  return (
    <section className="radial-paths" aria-label="Martial Arts paths">
      <div className="radial-paths-ring" ref={ringRef} data-phase={phase}>
        <span className="radial-orbit" aria-hidden="true" />

        {paths.map((path, i) => {
          const angle = i * step;
          const isActive = active === i;
          const isEmpty = !path.icon;

          return (
            <div
              key={path.id}
              className="path-slot"
              style={{ '--slot-angle': `${angle}deg`, '--deal-delay': `${i * STAGGER}ms` }}
            >
              <button
                type="button"
                className="path-node"
                style={{ '--counter-angle': `${-angle}deg` }}
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
            </div>
          );
        })}

        <div className="radial-hub" aria-live="polite">
          <span className="radial-hub-attribute">
            {current ? current.attribute : 'Martial Paths'}
          </span>
          <strong className="radial-hub-name">
            {current ? current.short : `${total} PATHS`}
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
