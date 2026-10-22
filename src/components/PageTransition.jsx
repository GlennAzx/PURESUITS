import { useEffect, useMemo, useRef } from 'react';
import { registerTransition } from '../lib/transition';

/**
 * The overlay the page transition animates.
 *
 * A messy spill of mahjong tiles on felt, the way a table looks mid-hand: a mix
 * of face-up and face-down, rotated, slightly overlapping.
 *
 * The layout is generated once with a SEEDED random function, so it is identical
 * on every mount and every reload. Random-per-render would reshuffle the table
 * each time React re-rendered, which is expensive and looks like noise.
 *
 * The tiles never animate. The panel is one transform; they ride on it.
 */

const COUNT = 210;
const CLUSTERS = 17;
// Rows that run across the table, like the wall a hand is dealt from. Real
// tables are clumps plus a few straight runs, not an even scatter — an even
// scatter reads as wallpaper.
const ROW_SHARE = 0.22;

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

function buildTiles() {
  const rnd = seeded(20261022);

  // Cluster centres, then tiles gather around them with a wide jitter. This is
  // what makes the spill read as messy instead of evenly sprinkled.
  const centres = Array.from({ length: CLUSTERS }, () => ({
    x: -4 + rnd() * 108,
    y: -3 + rnd() * 106,
  }));
  const rows = Array.from({ length: 4 }, () => -3 + rnd() * 100);

  const out = [];
  for (let i = 0; i < COUNT; i += 1) {
    const w = 36 + Math.round(rnd() * 22);
    const h = Math.round(w * 1.34);

    let x;
    let y;
    if (rnd() < ROW_SHARE) {
      // A run across the table.
      x = -4 + rnd() * 108;
      y = rows[Math.floor(rnd() * rows.length)] + (rnd() - 0.5) * 3;
    } else {
      const c = centres[Math.floor(rnd() * centres.length)];
      // Sum of two randoms biases toward the centre of the cluster.
      x = c.x + (rnd() + rnd() - 1) * 20;
      y = c.y + (rnd() + rnd() - 1) * 20;
    }

    // 55% face down, as on the reference table: mostly shells with faces
    // showing through.
    const back = rnd() < 0.55;

    out.push({
      id: i,
      x,
      y,
      rot: (rnd() + rnd() - 1) * 30,
      w,
      h,
      back,
      face: Math.floor(rnd() * 5),
      glyph: WINDS[Math.floor(rnd() * 4)],
      pips: 1 + Math.floor(rnd() * 6),
    });
  }
  return out;
}

function FaceContent({ tile }) {
  if (tile.face === 0) {
    return <span className="pgt__glyph pgt__glyph--wind" style={{ fontSize: tile.w * 0.52 }}>{tile.glyph}</span>;
  }
  if (tile.face === 1) {
    return <span className="pgt__glyph pgt__glyph--red" style={{ fontSize: tile.w * 0.56 }}>中</span>;
  }
  if (tile.face === 2) {
    return <span className="pgt__glyph pgt__glyph--green" style={{ fontSize: tile.w * 0.56 }}>發</span>;
  }
  if (tile.face === 3) {
    return <span className="pgt__frame" />;
  }
  return (
    <span className="pgt__pips" style={{ gap: Math.max(2, tile.w * 0.05) }}>
      {Array.from({ length: tile.pips }, (_, k) => (
        <i key={k} style={{ width: tile.w * 0.11, height: tile.w * 0.11 }} />
      ))}
    </span>
  );
}

export default function PageTransition() {
  const ref = useRef(null);
  const tiles = useMemo(buildTiles, []);

  useEffect(() => {
    registerTransition(ref.current);
    return () => registerTransition(null);
  }, []);

  return (
    <div className="pgt" ref={ref} aria-hidden="true">
      {tiles.map((t) => (
        <i
          key={t.id}
          className={`pgt__tile pgt__tile--${t.back ? 'back' : 'face'}`}
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
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
