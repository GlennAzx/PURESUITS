import React from 'react';
import { slugify } from '../lib/memberSlug';

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

// Four sizes, kept in the same 1.38 : 1 face ratio and 0.81 depth ratio as a
// real Size-7 tile, so a small tile still reads as the same object seen closer
// up rather than a different, flatter one.
/**
 * Fluid size for a tile that must fit N per row on a phone.
 *
 * The wrap around a tile is 1.16x the face width (see .member-tile-stage), so a
 * plain `40vw` overflowed: the wrap was wider than the grid track and the two
 * leader tiles overlapped by ~20px at 320-430px. The divisor below accounts for
 * that 1.16 and for the page padding, pane padding and gap, so the track is
 * always at least as wide as the wrap.
 *
 * @param {string} cap  Largest the face may get, e.g. '232px'.
 * @param {number} perRow  Tiles per row at the narrowest breakpoint.
 * @param {number} chrome Horizontal space the row cannot use, in px.
 */
function fluid(cap, perRow, chrome) {
  const w = `min(${cap}, calc((100vw - ${chrome}px) / ${(perRow * 1.16).toFixed(2)}))`;
  return {
    w,
    h: `calc(${w} * 1.3793)`,
    d: `calc(${w} * 0.8103)`,
  };
}

const DIMS = {
  // Two leaders side by side even on a phone: 48px page gutters, 48px pane
  // padding, 16px gap.
  leader: fluid('232px', 2, 112),
  standard: { w: 208, h: 287, d: 175 },
  // Commanders go two across on the narrowest screens.
  command: fluid('152px', 2, 88),
  // Members go three across even at 320px, which is the point of this tier.
  member: fluid('104px', 3, 64),
};

export default function MemberCard3D({
  member,
  name: nameProp,
  role: roleProp,
  avatar: avatarProp,
  variant = 'standard',
  index = 0,
  onOpen = null,
  highlighted = false,
}) {
  const name = nameProp ?? member?.name ?? '';
  const role = roleProp ?? member?.role ?? '';
  const avatar = avatarProp ?? member?.avatar ?? null;

  const { w, h, d } = DIMS[variant] ?? DIMS.standard;

  // Every tile is a real link to /members/<slug>, so right-click "copy link"
  // and middle-click work. With onOpen the click is intercepted for an SPA
  // transition; without it the browser navigates and the SPA fallback loads
  // the right page anyway.
  const slug = slugify(name);
  const href = slug ? `/members/${encodeURIComponent(slug)}` : '/members';

  const handleClick = (event) => {
    if (!onOpen || !slug) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onOpen(slug);
  };

  return (
    <a
      className={`member-tile-wrap${variant !== 'standard' ? ` member-tile-wrap--${variant}` : ''}${highlighted ? ' member-tile-wrap--focus' : ''}`}
      style={{
        // Values are either numbers (px) or ready-made CSS expressions.
        '--mt-w': typeof w === 'number' ? `${w}px` : w,
        '--mt-h': typeof h === 'number' ? `${h}px` : h,
        '--mt-d': typeof d === 'number' ? `${d}px` : d,
      }}
      href={href}
      data-slug={slug}
      onClick={handleClick}
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
    </a>
  );
}
