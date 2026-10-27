import React from 'react';

/**
 * A mahjong tile drawn as SVG.
 *
 * The guide needs to SHOW a hand, not describe one, and the screenshots are only
 * 467 px wide, so a tile inside them is about 22 px - too small to reuse as art.
 *
 * The face follows the traditional tile, checked against the Wikimedia Commons
 * mahjong set before drawing:
 *   - cream face on a deep green body, with a bevelled top-left highlight
 *   - dots are coloured discs carrying a white four-petal flower
 *   - bamboo are jointed green sticks, not plain bars
 *   - characters show the numeral above 萬, as printed
 *
 * Drawn here rather than copied so the tile can take the site palette, stay
 * flat and crisp at any size, and be composed into arbitrary hands.
 */

const INK = '#1f2b33';
const RED = '#b03a30';
const GREEN = '#2c6b4f';
const BLUE = '#2f5570';
const IVORY = '#f6f1e2';
const BODY = '#1f512f';
const BODY_EDGE = '#143520';

const NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

// Circle (dot) layouts and colours, matched to the tile legend: green, blue and
// red placed by position, with the 1 as one large red-ringed circle.
const G = GREEN;
const B = BLUE;
const R = RED;

const DOTS = {
  1: [[0.5, 0.5, R, 'big']],
  2: [[0.5, 0.28, B], [0.5, 0.72, G]],
  3: [[0.26, 0.24, B], [0.5, 0.5, R], [0.74, 0.76, G]],
  4: [[0.28, 0.28, G], [0.72, 0.28, B], [0.28, 0.72, B], [0.72, 0.72, G]],
  5: [[0.26, 0.26, G], [0.74, 0.26, B], [0.5, 0.5, R], [0.26, 0.74, B], [0.74, 0.74, G]],
  6: [[0.3, 0.2, G], [0.7, 0.2, G], [0.3, 0.5, G], [0.7, 0.5, R], [0.3, 0.8, R], [0.7, 0.8, R]],
  7: [[0.28, 0.18, G], [0.5, 0.18, G], [0.72, 0.18, G], [0.3, 0.62, R], [0.7, 0.62, R], [0.3, 0.85, R], [0.7, 0.85, R]],
  8: [[0.3, 0.15, B], [0.7, 0.15, B], [0.3, 0.38, B], [0.7, 0.38, B], [0.3, 0.62, B], [0.7, 0.62, B], [0.3, 0.85, B], [0.7, 0.85, B]],
  9: [[0.22, 0.18, B], [0.5, 0.18, B], [0.78, 0.18, B], [0.22, 0.5, R], [0.5, 0.5, R], [0.78, 0.5, R], [0.22, 0.82, G], [0.5, 0.82, G], [0.78, 0.82, G]],
};

// Bamboo layouts; the colour rule below turns the accent stalk red.
const BAMBOO = {
  1: [[0.5, 0.5]],
  2: [[0.5, 0.28], [0.5, 0.72]],
  3: [[0.5, 0.22], [0.28, 0.74], [0.72, 0.74]],
  4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
  5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]],
  6: [[0.3, 0.22], [0.7, 0.22], [0.3, 0.5], [0.7, 0.5], [0.3, 0.78], [0.7, 0.78]],
  7: [[0.5, 0.18], [0.28, 0.55], [0.72, 0.55], [0.28, 0.82], [0.72, 0.82], [0.5, 0.82], [0.5, 0.68]],
  8: [[0.3, 0.16], [0.7, 0.16], [0.3, 0.38], [0.7, 0.38], [0.3, 0.62], [0.7, 0.62], [0.3, 0.84], [0.7, 0.84]],
  9: [[0.22, 0.18], [0.5, 0.18], [0.78, 0.18], [0.22, 0.5], [0.5, 0.5], [0.78, 0.5], [0.22, 0.82], [0.5, 0.82], [0.78, 0.82]],
};

/** Red stalks, as the legend shows them: the 5 centre, the 7 top, the 9 top row. */
function bambooColour(rank, index) {
  if (rank === 5 && index === 2) return R;
  if (rank === 7 && index === 0) return R;
  if (rank === 9 && index < 3) return R;
  return G;
}

const W = 60;
const H = 84;
const FACE = { x: 8, y: 8, w: W - 16, h: H - 16 };

const facePoint = ([fx, fy]) => [FACE.x + fx * FACE.w, FACE.y + fy * FACE.h];

/**
 * One circle pip: a coloured ring with a filled centre, as the tile legend
 * draws them. The 1 is larger and carries an inner ring.
 */
function Dot({ cx, cy, r, fill, big, key }) {
  return (
    <g key={key}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={fill} strokeWidth={Math.max(1.6, r * 0.42)} />
      {/* The 1 dot is the ornate one: red ring, green inner ring, red centre. */}
      {big && (
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.55}
          fill="none"
          stroke={GREEN}
          strokeWidth={Math.max(1.4, r * 0.24)}
        />
      )}
      <circle cx={cx} cy={cy} r={r * (big ? 0.22 : 0.3)} fill={fill} />
    </g>
  );
}

/** 1 Bamboo is a bird on a real set, so it is a bird here too. */
function Bird({ cx, cy, scale = 1 }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      {/* body */}
      <path d="M -9 4 C -7 -4 2 -8 8 -3 C 12 0 13 4 10 6 C 4 10 -5 10 -9 4 Z" fill={BLUE} />
      {/* wing */}
      <path d="M -1 1 C 2 -2 7 -2 9 1 C 6 5 1 6 -2 4 Z" fill={GREEN} />
      {/* head and beak */}
      <circle cx="10" cy="-5" r="3.2" fill={BLUE} />
      <path d="M 13 -5 L 18 -3.5 L 13 -2.2 Z" fill={RED} />
      {/* legs */}
      <path d="M -1 9 L -1 14 M 3 9 L 3 14" stroke={RED} strokeWidth="1.2" strokeLinecap="round" />
      {/* tail */}
      <path d="M -9 4 L -16 0 L -15 7 Z" fill={RED} opacity="0.85" />
    </g>
  );
}

/**
 * One bamboo stick, drawn as a single stalk with nodes.
 *
 * The first version was two capsules with a pale gap, which at tile size reads
 * as two unrelated pills. A stalk with node bands plus a highlight reads as
 * bamboo, which is what the suit is.
 */
function Stick({ cx, cy, h, w, fill, key }) {
  const nodeH = Math.max(0.9, h * 0.055);
  const nodeY = [cy - h * 0.22, cy + h * 0.22];

  return (
    <g key={key}>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={w * 0.45} fill={fill} />
      {/* Nodes: a dark band with a pale edge, as a real stalk joints. */}
      {nodeY.map((y, i) => (
        <g key={i}>
          <rect x={cx - w / 2} y={y} width={w} height={nodeH} fill="#0d2b1b" opacity="0.4" />
          <rect x={cx - w / 2} y={y + nodeH} width={w} height={nodeH * 0.8} fill="#ffffff" opacity="0.22" />
        </g>
      ))}
      <rect
        x={cx - w / 2 + w * 0.2}
        y={cy - h / 2 + h * 0.08}
        width={w * 0.16}
        height={h * 0.84}
        rx={w * 0.08}
        fill="#ffffff"
        opacity="0.18"
      />
    </g>
  );
}

/**
 * @param {object} props
 * @param {'characters'|'dots'|'bamboo'} props.suit
 * @param {number} props.rank 1-9
 * @param {number} [props.width] Rendered width in px; height follows the tile ratio.
 * @param {string} [props.className]
 * @param {string} [props.label] Accessible name; defaults to "<rank> <suit>".
 * @param {boolean} [props.muted] Draw it greyed, the way the game marks a tile
 *   of the declared missing suit. Those tiles cannot be used and must be
 *   discarded, so the state matters more than the face.
 */
export default function MahjongTile({
  suit = 'dots',
  rank = 1,
  width = 44,
  className = '',
  label,
  muted = false,
}) {
  const r = Math.min(9, Math.max(1, Number(rank) || 1));
  const name = label || `${r} ${suit}`;
  let face = null;

  if (suit === 'characters') {
    face = (
      <>
        <text
          x={W / 2}
          y={FACE.y + FACE.h * 0.32}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="21"
          fontWeight="700"
          fill={INK}
          style={{ fontFamily: 'Noto Serif SC, ui-serif, Georgia, serif' }}
        >
          {NUMERALS[r - 1]}
        </text>
        <text
          x={W / 2}
          y={FACE.y + FACE.h * 0.74}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="24"
          fontWeight="700"
          fill={RED}
          style={{ fontFamily: 'Noto Serif SC, ui-serif, Georgia, serif' }}
        >
          萬
        </text>
      </>
    );
  } else if (suit === 'dots') {
    const positions = DOTS[r] || DOTS[1];
    const radius = positions.length === 1 ? 10 : positions.length <= 4 ? 6 : 5;
    face = positions.map((pos, i) => {
      const [fx, fy, colour, big] = pos;
      const [cx, cy] = facePoint([fx, fy]);
      return <Dot key={i} cx={cx} cy={cy} r={radius} fill={colour} big={big === 'big'} />;
    });
  } else {
    if (r === 1) {
      const [cx, cy] = facePoint([0.5, 0.52]);
      face = <Bird cx={cx} cy={cy} scale={1.25} />;
    } else {
      const positions = BAMBOO[r] || BAMBOO[2];
      const h = positions.length <= 4 ? 18 : 13.5;
      const w = positions.length <= 4 ? 5.8 : 5.2;
      face = positions.map((pos, i) => {
        const [cx, cy] = facePoint(pos);
        return <Stick key={i} cx={cx} cy={cy} h={h} w={w} fill={bambooColour(r, i)} />;
      });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={(width * H) / W}
      role="img"
      aria-label={muted ? `${name} (missing suit)` : name}
      className={className}
      style={muted ? { filter: 'grayscale(1)', opacity: 0.45 } : undefined}
    >
      {/* Body: deep green slab, cream face laid on top, with a single light
          edge on the top-left and a shadow on the bottom-right. */}
      <rect x="2" y="3" width={W - 4} height={H - 4} rx="6" fill={BODY} />
      <rect x="2" y="3" width={W - 4} height="5" rx="2.5" fill={BODY_EDGE} opacity="0.45" />
      <rect x="4" y="4" width={W - 8} height={H - 9} rx="5" fill={IVORY} />
      <rect
        x="4"
        y="4"
        width={W - 8}
        height={H - 9}
        rx="5"
        fill="none"
        stroke={BODY_EDGE}
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <rect x="6" y="6" width={W - 12} height="3" rx="1.5" fill="#ffffff" opacity="0.55" />
      {face}
    </svg>
  );
}

/** A row of tiles, which is how every example in the guide is shown. */
export function TileRow({ tiles, width = 40, gap = 'gap-1', className = '' }) {
  return (
    <div className={`flex items-end ${gap} ${className}`}>
      {tiles.map((t, i) => (
        <MahjongTile
          key={`${t.suit}-${t.rank}-${i}`}
          suit={t.suit}
          rank={t.rank}
          muted={Boolean(t.muted)}
          width={width}
        />
      ))}
    </div>
  );
}

/** Builders, so a hand reads as data rather than markup. */
export const run = (suit, from) => [0, 1, 2].map((i) => ({ suit, rank: from + i }));
export const pong = (suit, rank) => [0, 1, 2].map(() => ({ suit, rank }));
export const kong = (suit, rank) => [0, 1, 2, 3].map(() => ({ suit, rank }));
export const pair = (suit, rank) => [0, 1].map(() => ({ suit, rank }));
