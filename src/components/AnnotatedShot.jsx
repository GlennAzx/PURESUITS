import React from 'react';

/**
 * A screenshot with marked-up callouts.
 *
 * The guide is for people who have never played. Showing the actual game screen
 * and ringing the part that matters beats describing it, so these are the real
 * screenshots with boxes drawn over them.
 *
 * Marks are fractions of the image (0-1), rendered in a stretched SVG on top, so
 * they stay on target at any width. `vectorEffect="non-scaling-stroke"` keeps the
 * line width constant even though the viewBox is stretched.
 *
 * @param {object} props
 * @param {string} props.src
 * @param {string} props.alt
 * @param {Array<{x: number, y: number, w: number, h: number, tone?: 'gold'|'red'|'jade'}>} props.marks
 * @param {React.ReactNode} [props.caption]
 */
const TONES = {
  gold: '#f0904f',
  red: '#e0665a',
  jade: '#8fc7a4',
};

export default function AnnotatedShot({ src, alt, marks = [], caption }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-imperial-gold/20 bg-ink-black/40">
      <div className="relative">
        <img src={src} alt={alt} loading="lazy" decoding="async" className="block w-full" />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {marks.map((m, i) => (
            <rect
              key={i}
              x={m.x * 100}
              y={m.y * 100}
              width={m.w * 100}
              height={m.h * 100}
              rx="0.8"
              fill="none"
              stroke={TONES[m.tone] || TONES.gold}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      {caption && (
        <figcaption className="border-t border-imperial-gold/15 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
