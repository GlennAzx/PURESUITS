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
// Base tile is 1.6x the cell. Rotation up to 26 degrees pulls a corner inward by
// ~38px, and 1.6x leaves a 42px margin, so corners cannot open a hole. A lower
// base or a higher TILT breaks coverage — re-run the magenta test if you change
// either.
// The base course (see transition.css) guarantees coverage, so the spill can be
// genuinely chaotic: tiles as small as 1.15x the cell and as large as 2.4x, with
// up to 34 degrees of tilt.
const OVERLAP = 1.15;
const BIG_MAX = 2.4;
const JITTER = 14;
const TILT = 34;

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
  // Fewer, larger cells. 240 rotating, shadowed tiles cost enough paint to
  // stretch a 640ms transition to ~800ms; ~100 big ones look the same or better
  // and stay inside the timing.
  const cw = Math.max(72, Math.min(132, Math.round(w / 10)));
  const ch = Math.round(cw * 1.34);
  // Base cell size. The tile size comes from `scale` in make(), which starts at
  // OVERLAP — multiplying here as well would square the overlap and make every
  // tile 2.5x the cell.
  const tw = cw;
  const th = ch;

  const cols = Math.ceil(w / cw) + 1;
  const rows = Math.ceil(h / ch) + 1;

  // Backs are not evenly mixed: real tables have a dense run of backs in one
  // place and loose faces in another. Six soft blobs bias the mix per region,
  // so the split varies across the panel instead of being 50/50 everywhere.
  const blobs = Array.from({ length: 6 }, () => ({
    x: rnd() * w,
    y: rnd() * h,
    r: 160 + rnd() * 260,
    p: rnd(),
  }));

  const backChance = (x, y) => {
    let v = 0.5;
    for (const b of blobs) {
      const d = Math.hypot(x - b.x, y - b.y);
      if (d < b.r) v += (b.p - 0.5) * (1 - d / b.r) * 1.9;
    }
    return Math.min(0.97, Math.max(0.03, v));
  };

  const out = [];
  let id = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      // EVERY cell gets a tile. Mess comes from jitter, tilt and extra tossed
      // tiles on top — never from moving a tile off its cell, which is what
      // opened pinholes in the first version.
      const x = c * cw - tw * 0.12 + (rnd() - 0.5) * JITTER * 2;
      const y = r * ch - th * 0.12 + (rnd() - 0.5) * JITTER * 2;
      const bias = backChance(x + tw / 2, y + th / 2);

      const make = (px, py, scale, rot) => ({
        id: id += 1,
        left: px,
        top: py,
        w: Math.round(tw * scale),
        h: Math.round(th * scale),
        rot,
        back: rnd() < bias,
        face: Math.floor(rnd() * 5),
        glyph: WINDS[Math.floor(rnd() * 4)],
        pips: 1 + Math.floor(rnd() * 6),
      });

      // The guaranteed tile for this cell. Scale varies from the safe base up
      // to 2.3x, which is what stops every tile being the same slab.
      out.push(make(x, y, OVERLAP + rnd() * (BIG_MAX - OVERLAP), (rnd() - 0.5) * TILT * 2));

      // A thrown tile, lying across its neighbours. Decorative only: it can
      // never be the difference between covered and not covered.
      if (rnd() < 0.3) {
        out.push(
          make(
            x + (rnd() - 0.5) * cw * 1.0,
            y + (rnd() - 0.5) * ch * 1.0,
            1.0 + rnd() * 0.7,
            (rnd() - 0.5) * TILT * 3
          )
        );
      }

      // A small pile: three or four tiles almost on top of each other, as if
      // someone dropped them. Reads as a stack, which a single layer cannot.
      if (rnd() < 0.12) {
        const pile = 2 + Math.floor(rnd() * 3);
        for (let k = 0; k < pile; k += 1) {
          out.push(
            make(
              x + (rnd() - 0.5) * 26,
              y + (rnd() - 0.5) * 26,
              1.05 + rnd() * 0.35,
              (rnd() - 0.5) * TILT * 2.4
            )
          );
        }
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
