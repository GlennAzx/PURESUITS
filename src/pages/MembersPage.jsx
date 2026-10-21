import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import MemberCard3D from '../components/MemberCard3D';
import membersData from '../data/members.json';
import { memberSlug } from '../lib/memberSlug';
import { scrollToElement, scrollToTop } from '../lib/scroll';

function SectionHeading({ title }) {
  return (
    <div className="mb-6 pb-2 border-b border-imperial-gold/20">
      <h3 className="text-lg font-serif font-bold text-ivory tracking-wide">
        {title}
      </h3>
    </div>
  );
}

export default function MembersPage({
  focusSlug = null,
  focusSource = 'load',
  onOpenMember = null,
  onClearSlug = null,
}) {
  const pageRef = useRef(null);
  // Which tile is currently ringed. React owns this, not the DOM: an
  // imperative classList.add is wiped the next time the tile re-renders.
  const [ringSlug, setRingSlug] = useState(null);

  const { leadership, commanders, members, total } = useMemo(() => {
    const byTier = (t) => membersData.filter((m) => m.tier === t);
    const lead = [...byTier('guild_leader'), ...byTier('deputy')];
    return {
      leadership: lead,
      commanders: byTier('commander'),
      members: byTier('member'),
      total: membersData.length,
    };
  }, []);

  // Focus comes from a CLICK on a tile: scroll it into view and ring it. The
  // ring and the slug then persist — only a refresh or a click outside clears
  // them.
  //
  // Slugs that arrive in the URL are NOT handled here. App drops those and
  // leaves the page at the top, because a refresh must return to the top of the
  // page rather than scroll down to a member.
  useEffect(() => {
    if (!focusSlug || focusSource !== 'click') return undefined;
    const want = String(focusSlug).toLowerCase();
    let raf1 = 0;
    let raf2 = 0;

    // Two frames so the grid has laid out before measuring.
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = [...document.querySelectorAll('.member-tile-wrap')].find(
          (node) => (node.dataset.slug || '').toLowerCase() === want
        );
        if (!el) return;
        scrollToElement(el, { offset: -140 });
        setRingSlug(want);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [focusSlug, focusSource]);

  // The slug is the source of truth for the ring. Back/Forward change the URL
  // without going through the outside-click handler, so without this the ring
  // can outlive the slug it belongs to.
  useEffect(() => {
    if (!focusSlug) setRingSlug(null);
  }, [focusSlug]);

  // First load of the members page always starts at the top. A refresh must not
  // drop the reader halfway down the roster, whatever the browser tried to
  // restore.
  //
  // Mount-only on purpose. Keying this on focusSource made an outside click —
  // which flips the source to 'load' — scroll the page back to the top, when
  // that click is supposed to leave the scroll alone.
  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (didInitialScroll.current) return undefined;
    didInitialScroll.current = true;
    if (focusSource === 'click') return undefined;
    const id = requestAnimationFrame(() => scrollToTop());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clicking anywhere outside the ringed tile ends the focus: the ring goes and
  // the slug leaves the URL. The scroll position does not change.
  useEffect(() => {
    if (!ringSlug) return undefined;
    const onDown = (event) => {
      const el = [...document.querySelectorAll('.member-tile-wrap')].find(
        (node) => node.dataset.slug === ringSlug
      );
      if (el && el.contains(event.target)) return;
      setRingSlug(null);
      if (onClearSlug) onClearSlug();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [ringSlug, onClearSlug]);

  useGSAP(
    () => {
      gsap.from('.members-header', {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
      });

      gsap.from('.leadership-pane', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: 0.1,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
      });
    },
    { scope: pageRef }
  );

  return (
    <div ref={pageRef} className="max-w-6xl mx-auto px-4 lg:pr-24 py-24">
      <div className="members-header text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-ivory mb-3">
          M E M B E R S
        </h2>
        <p className="text-sm text-gray-400">
          Our very amazing members that are totally super active in game
        </p>
        <div className="inline-flex items-center gap-2 mt-5 px-3.5 py-1.5 rounded-full border border-imperial-gold/30 bg-ink-charcoal/70">
          <span className="w-1.5 h-1.5 rounded-full bg-jade-accent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-imperial-gold">
            {total} {total === 1 ? 'Member' : 'Members'}
          </span>
        </div>
      </div>

      {/* Leadership — separate pane */}
      <section className="leadership-pane mb-16">
        <div className="rounded-2xl border border-imperial-gold/25 bg-gradient-to-b from-ink-charcoal to-ink-black p-6 sm:p-8">
          <SectionHeading title="Leadership" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-16 justify-items-center">
            {leadership.map((m, i) => (
              <MemberCard3D key={m.id} member={m} index={i} variant="leader" onOpen={onOpenMember} highlighted={ringSlug === memberSlug(m)} />
            ))}
          </div>
        </div>
      </section>

      {/* Commanders */}
      {commanders.length > 0 && (
        <section className="mb-16">
          <SectionHeading title="Commanders" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16 justify-items-center">
            {commanders.map((m, i) => (
              <MemberCard3D key={m.id} member={m} index={i} onOpen={onOpenMember} highlighted={ringSlug === memberSlug(m)} />
            ))}
          </div>
        </section>
      )}

      {/* Members */}
      {members.length > 0 && (
        <section>
          <SectionHeading title="Members" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16 justify-items-center">
            {members.map((m, i) => (
              <MemberCard3D key={m.id} member={m} index={i} onOpen={onOpenMember} highlighted={ringSlug === memberSlug(m)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
