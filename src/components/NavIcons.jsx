import React from 'react';

/**
 * Solid, chunky glyphs for the nav tile faces.
 *
 * Line icons (Home, User, Hammer, Images) read as web UI at tile size. Real
 * mahjong faces use solid colour blocks, so these are filled shapes with the
 * weight of a printed tile. No width/height attributes — the tile CSS sizes
 * them via --tile-fs.
 */

export function HomeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {/* Roof + body as one clean silhouette */}
      <path d="M12 2.2 1.5 10.9a1.05 1.05 0 0 0 .68 1.83h1.9v6.9a1.9 1.9 0 0 0 1.9 1.9h12a1.9 1.9 0 0 0 1.9-1.9v-6.9h1.9a1.05 1.05 0 0 0 .68-1.83Z" />
    </svg>
  );
}

export function PersonGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="7.4" r="4.3" />
      <path d="M3.3 21.4c0-4.8 3.9-8.7 8.7-8.7s8.7 3.9 8.7 8.7Z" />
    </svg>
  );
}

export function HammerGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {/* Diagonal gavel. A front-facing hammer always reads as a letter T at
          tile size, so the head sits at an angle with a claw beneath it. */}
      <g transform="rotate(45 12 12)">
        <rect x="2.4" y="6.6" width="19.2" height="6.2" rx="1.9" />
        <path d="M18.2 12.8h1.5a2.5 2.5 0 0 1 0 5h-1.5Z" />
        <rect x="9.5" y="12.8" width="4.6" height="10.4" rx="1.9" />
      </g>
    </svg>
  );
}

export function GalleryGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
    >
      <path d="M4.2 2.6h15.6a2.6 2.6 0 0 1 2.6 2.6v13.6a2.6 2.6 0 0 1-2.6 2.6H4.2a2.6 2.6 0 0 1-2.6-2.6V5.2a2.6 2.6 0 0 1 2.6-2.6Zm0 2.2a.4.4 0 0 0-.4.4v13.6a.4.4 0 0 0 .4.4h15.6a.4.4 0 0 0 .4-.4V5.2a.4.4 0 0 0-.4-.4Z" />
      <circle cx="8.6" cy="9" r="2" />
      <path d="M4.8 18.5 9.2 13.6l3 3 2.3-2.3 4.6 4.2Z" />
    </svg>
  );
}
