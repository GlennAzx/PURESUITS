import React from 'react';

/**
 * Member tile: a mahjong tile drawn with 2D transforms only.
 *
 * Geometry is Size-7 reference (36 x 26 x 21 mm), scaled:
 *   height / width = 1.38,  depth / width = 0.81
 *
 * How the depth is drawn:
 * The face gets one 2D matrix, the orthographic projection of the old
 * rotateY/rotateX tilt. The thickness comes from two copies of the face outline,
 * pseudo-elements on .member-tile-tilt, shifted along the projected depth
 * vector: white acrylic at mid depth, green backing at full depth. Each copy
 * shares the face's border-radius, so the wall closes at the rounded corners.
 * The old version stacked 14 slabs in a 3D context: 126 composited layers
 * across the page, and scrolling lagged. See index.css for the numbers.
 *
 * Why the nameplate sits OUTSIDE the tile:
 * Text inside a transformed subtree is resampled by the transform. Under the
 * old 3D projection that softened and doubled the CJK strokes. The nameplate
 * stays a sibling of the stage, so it is plain 2D text, crisp at any tilt.
 *
 * There is no flip. It was removed on request; the tile is a static face.
 */

const DIMS = {
  leader:   { w: 232, h: 320, d: 188 },
  standard: { w: 208, h: 287, d: 175 },
};

export default function MemberCard3D({
  member,
  name: nameProp,
  role: roleProp,
  avatar: avatarProp,
  variant = 'standard',
  index = 0,
}) {
  const name = nameProp ?? member?.name ?? '';
  const role = roleProp ?? member?.role ?? '';
  const avatar = avatarProp ?? member?.avatar ?? null;

  const { w, h, d } = DIMS[variant] ?? DIMS.standard;

  return (
    <div
      className={`member-tile-wrap${variant === 'leader' ? ' member-tile-wrap--leader' : ''}`}
      style={{ '--mt-w': `${w}px`, '--mt-h': `${h}px`, '--mt-d': `${d}px` }}
    >
      {/* Everything inside the stage is transformed; everything outside it
          renders as untransformed 2D text. */}
      <div className="member-tile-stage">
        <div className="member-tile-tilt">
          <div className="member-tile-box">
            <div className="mt-face">
              <div className="mt-front">
                {/* 白板: the double border spans the whole face and the image
                    crops inside it, like the White Dragon tile. */}
                {avatar ? (
                  <div className="member-portrait-window">
                    <img src={avatar} alt="" loading={index < 4 ? 'eager' : 'lazy'} decoding="async" />
                  </div>
                ) : (
                  <div className="member-portrait-window member-portrait-window--empty" aria-hidden="true">
                    <span className="mt-glyph">{name.trim().charAt(0)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Outside the transformed subtree on purpose. Crisp text. */}
      <div className="mt-nameplate">
        <h3 className="member-name">{name}</h3>
        <p className="member-role">{role}</p>
      </div>
    </div>
  );
}
