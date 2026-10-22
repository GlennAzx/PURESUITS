import { useEffect, useMemo, useRef, useState } from 'react';
import { registerTransition } from '../lib/transition';

/**
 * The overlay the page transition animates.
 *
 * The cover IS the tiles — there is no felt behind them. They sit on a
 * jittered grid so neighbours overlap: the layout looks thrown, but every
 * point of the viewport is covered by at least one tile. That matters,
 * because the route swap happens underneath at the covered instant and the
 * panel has no background to hide it.
 *
 * The layout is seeded, so the table is identical on every mount. A
 * non-seeded random would reshuffle on every React render.
 *
 * The tiles never animate. The panel is one transform; they ride on it.
 */

// Cell of the underlying grid, in CSS px. Tiles are drawn larger than the cell
// (OVERLAP) so rotation and jitter can never open a hole between them.
const CELL_W = 76;
// 1.35, not 1.22. A tile rotated 16 degrees pulls its corners inward by ~20px,
// which was enough to open pinholes at 1.22. Coverage is asserted by a magenta
// pixel test, not assumed.
const OVERLAP = 1.35;
const JITTER = 7; // px of positional wobble
const TILT = 16; // degrees

// mulberry32 — a tiny seeded PRNG. Same seed, same table, forever.
function seeded(a) {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WINDS = ['東', '南', '西', '北'];

function buildTiles(w, h) {
  const rnd = seeded(20261022);
  const cw = Math.max(58, Math.min(96, Math.round(w / 15)));
  const ch = Math.round(cw * 1.34);
  const tw = Math.round(cw * OVERLAP);
  const th = Math.round(ch * OVERLAP);

  const cols = Math.ceil(w / cw) + 1;
  const rows = Math.ceil(h / ch) + 1;

  const out = [];
  let id = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      // EVERY cell gets a tile. Mess comes from jitter, tilt and extra tossed
      // tiles on top — never from moving a tile off its cell, which is what
      // opened pinholes in the first version.
      const x = c * cw - tw * 0.12 + (rnd() - 0.5) * JITTER * 2;
      const y = r * ch - th * 0.12 + (rnd() - 0.5) * JITTER * 2;

      out.push({
        id: id += 1,
        left: x,
        top: y,
        w: tw,
        h: th,
        rot: (rnd() - 0.5) * TILT * 2,
        back: rnd() < 0.45,
        face: Math.floor(rnd() * 5),
        glyph: WINDS[Math.floor(rnd() * 4)],
        pips: 1 + Math.floor(rnd() * 6),
      });

      // A thrown tile, lying across its neighbours. Decorative only: it can
      // never be the difference between covered and not covered.
      if (rnd() < 0.22) {
        out.push({
          id: id += 1,
          left: x + (rnd() - 0.5) * cw * 0.9,
          top: y + (rnd() - 0.5) * ch * 0.9,
          w: tw,
          h: th,
          rot: (rnd() - 0.5) * TILT * 3,
          back: rnd() < 0.45,
          face: Math.floor(rnd() * 5),
          glyph: WINDS[Math.floor(rnd() * 4)],
          pips: 1 + Math.floor(rnd() * 6),
        });
      }
    }
  }
  return out;
}

function FaceContent({ tile }) {
  if (tile.face === 0) {
    return <span className="pgt__glyph pgt__glyph--wind" style={{ fontSize: tile.w * 0.5 }}>{tile.glyph}</span>;
  }
  if (tile.face === 1) {
    return <span className="pgt__glyph pgt__glyph--red" style={{ fontSize: tile.w * 0.54 }}>中</span>;
  }
  if (tile.face === 2) {
    return <span className="pgt__glyph pgt__glyph--green" style={{ fontSize: tile.w * 0.54 }}>發</span>;
  }
  if (tile.face === 3) {
    return <span className="pgt__frame" />;
  }
  return (
    <span className="pgt__pips" style={{ gap: Math.max(2, tile.w * 0.045) }}>
      {Array.from({ length: tile.pips }, (_, k) => (
        <i key={k} style={{ width: tile.w * 0.1, height: tile.w * 0.1 }} />
      ))}
    </span>
  );
}

export default function PageTransition() {
  const ref = useRef(null);
  const [size, setSize] = useState(() => ({
    w: typeof window === 'undefined' ? 1200 : window.innerWidth,
    h: typeof window === 'undefined' ? 800 : window.innerHeight,
  }));

  useEffect(() => {
    registerTransition(ref.current);
    return () => registerTransition(null);
  }, []);

  // A resize rebuilds the table. Debounced: the grid depends on the viewport,
  // and a stale grid would leave a strip of the page uncovered.
  useEffect(() => {
    let t = 0;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => setSize({ w: window.innerWidth, h: window.innerHeight }), 180);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const tiles = useMemo(() => buildTiles(size.w, size.h), [size.w, size.h]);

  return (
    <div className="pgt" ref={ref} aria-hidden="true">
      {tiles.map((t) => (
        <i
          key={t.id}
          className={`pgt__tile pgt__tile--${t.back ? 'back' : 'face'}`}
          style={{
            left: t.left,
            top: t.top,
            width: t.w,
            height: t.h,
            transform: `rotate(${t.rot.toFixed(1)}deg)`,
          }}
        >
          {t.back ? null : <FaceContent tile={t} />}
        </i>
      ))}
    </div>
  );
}
