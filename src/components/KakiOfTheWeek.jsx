import React from 'react';
import { User } from 'lucide-react';
import { imageUrl } from '../lib/media';
import bundledMembers from '../data/members.json';

/**
 * Kaki of the Week: one featured member on the landing page.
 *
 * "Kaki" is local for a close friend, which is the tone this guild runs on.
 *
 * The whole block is driven by `content.featured`, so it is edited in /admin and
 * needs no deploy. When it is disabled or unnamed it renders nothing at all,
 * rather than an empty frame with a heading over it.
 *
 * @param {object} props
 * @param {object} [props.featured] The card itself.
 * @param {Array} [props.members] Roster, used to borrow the member's tile
 *   portrait when the card has no uploaded photo of its own.
 */
export default function KakiOfTheWeek({ featured, members }) {
  if (!featured || !featured.enabled || !featured.name) return null;

  const { name, role, blurb } = featured;

  // An uploaded photo wins; otherwise use the portrait from the linked member's
  // tile, so picking someone in /admin shows them without a second upload.
  // Same fallback the Members page uses: the roster in content when it has
  // entries, the bundled list otherwise, so the card keeps its portrait on a
  // site whose content file predates the roster.
  const roster = Array.isArray(members) && members.length ? members : bundledMembers;
  const linked = roster.find((m) => m.id === featured.memberId) || null;
  const image = featured.image || linked?.avatar || null;

  return (
    <section className="max-w-6xl mx-auto px-4 lg:pr-24 pt-16">
      <div className="kaki-card relative overflow-hidden rounded-2xl border border-imperial-gold/25 bg-ink-charcoal/70">
        {/* A soft wash so the card reads as a spotlight rather than a table cell. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(120% 140% at 12% 0%, rgba(240,144,79,0.10) 0%, rgba(0,0,0,0) 60%)',
          }}
        />

        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-7 sm:p-7">
          <div className="mx-auto w-[132px] shrink-0 sm:mx-0 sm:w-[150px]">
            <div className="relative aspect-[0.69] overflow-hidden rounded-lg border border-imperial-gold/35 bg-ink-black/70">
              {image ? (
                <img
                  src={imageUrl(image)}
                  alt={name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ivory-shadow">
                  <User size={30} className="opacity-40" />
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-imperial-gold/85">
              Kaki of the Week
            </p>

            <h2 className="mt-1.5 font-serif text-2xl font-bold text-ivory md:text-3xl">
              {name}
            </h2>

            {role && (
              <p className="mt-1 text-[10.5px] uppercase tracking-[0.16em] text-jade-accent/90">
                {role}
              </p>
            )}

            {blurb && (
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-300 sm:mx-0">
                {blurb}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
