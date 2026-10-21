import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import MemberCard3D from '../components/MemberCard3D';
import membersData from '../data/members.json';
import { memberSlug } from '../lib/memberSlug';
import { scrollToElement } from '../lib/scroll';

function SectionHeading({ title }) {
  return (
    <div className="mb-6 pb-2 border-b border-imperial-gold/20">
      <h3 className="text-lg font-serif font-bold text-ivory tracking-wide">
        {title}
      </h3>
    </div>
  );
}

export default function MembersPage({ focusSlug = null, onOpenMember = null, onConsumeSlug = null }) {
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

  // Deep link: /members/<slug> scrolls that tile into view, rings it, then the
  // slug is consumed so the address bar goes back to /members. Two frames of
  // delay lets the grid lay out first, otherwise the scroll lands short on a
  // cold load.
  useEffect(() => {
    if (!focusSlug) return undefined;
    const want = String(focusSlug).toLowerCase();
    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = [...document.querySelectorAll('.member-tile-wrap')].find(
          (node) => (node.dataset.slug || '').toLowerCase() === want
        );
        if (el) {
          scrollToElement(el, { offset: -140 });
          setRingSlug(want);
        }
        // Consume either way: an unknown slug should not sit in the URL.
        if (onConsumeSlug) onConsumeSlug();
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [focusSlug, onConsumeSlug]);

  // The ring is on its own timer. It must NOT live in the effect above: that
  // effect re-runs the moment the slug is consumed, and its cleanup would
  // cancel the timeout, leaving the ring on screen forever.
  useEffect(() => {
    if (!ringSlug) return undefined;
    const timer = window.setTimeout(() => setRingSlug(null), 2800);
    return () => window.clearTimeout(timer);
  }, [ringSlug]);

  // Clicking anywhere outside the ringed tile dismisses it at once. The slug is
  // already gone by then, but the ring should not outstay the click.
  useEffect(() => {
    if (!ringSlug) return undefined;
    const onDown = (event) => {
      const el = [...document.querySelectorAll('.member-tile-wrap')].find(
        (node) => node.dataset.slug === ringSlug
      );
      if (el && el.contains(event.target)) return;
      setRingSlug(null);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [ringSlug]);

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
