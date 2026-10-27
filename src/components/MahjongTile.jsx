import React from 'react';

// Face tones
const TONES = {
  wind: '#22384f', // East/South/West/North
  red: '#b02a1c', // 中
  green: '#1c6b3c', // 發
  blue: '#2b5fa8', // 白
};

const SIZES = {
  sm: { w: 46, h: 62, fs: 24 },
  md: { w: 60, h: 80, fs: 32 },
  lg: { w: 76, h: 100, fs: 42 },
};

/**
 * A mahjong tile rendered with CSS 3D bevels.
 *
 * Pass either `glyph` (a text character) or `icon` (a React element such as a
 * lucide icon). The icon is drawn in the engraved style: dark on the ivory
 * face with a lit lower edge.
 *
 * To swap in a real 3D model later, replace the inner <div className="mj-tile">
 * with a react-three-fiber <Canvas> + GLTF. Keep the outer wrapper and props.
 */
export default function MahjongTile({
  glyph,
  icon,
  tone = 'wind',
  size = 'md',
  className = '',
}) {
  const s = SIZES[size] ?? SIZES.md;
  const color = TONES[tone] ?? TONES.wind;

  return (
    <div
      className={`mj-tile-wrap ${className}`}
      style={{ '--tile-w': `${s.w}px`, '--tile-h': `${s.h}px`, '--tile-fs': `${s.fs}px` }}
    >
      <div className="mj-tile">
        <div className="mj-tile-face">
          {icon ? (
            <span className="mj-engraved" style={{ color }}>
              {/* Lit lower lip of the groove, then the recessed stroke on top */}
              <span className="mj-engraved-rim" aria-hidden="true">
                {icon}
              </span>
              <span className="mj-engraved-cut">{icon}</span>
            </span>
          ) : (
            <span className="mj-glyph" style={{ color }}>
              {glyph}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
