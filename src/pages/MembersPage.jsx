import React, { useEffect, useMemo, useRef } from 'react';
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

export default function MembersPage({ focusSlug = null, onOpenMember = null }) {
  const pageRef = useRef(null);

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

  // Deep link: /members/<slug> scrolls that tile into view and rings it.
  // Waits two frames so the grid has laid out before measuring, otherwise the
  // scroll lands short on a cold load.
  useEffect(() => {
    if (!focusSlug) return undefined;
    const want = String(focusSlug).toLowerCase();
    let raf1 = 0;
    let raf2 = 0;
    let clear = 0;
    let marked = null;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = [...document.querySelectorAll('.member-tile-wrap')].find(
          (node) => (node.dataset.slug || '').toLowerCase() === want
        );
        if (!el) return;
        marked = el;
        scrollToElement(el, { offset: -140 });
        el.classList.add('member-tile-wrap--focus');
        clear = window.setTimeout(() => el.classList.remove('member-tile-wrap--focus'), 2800);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      window.clearTimeout(clear);
      // The ring is applied outside React, so cleanup must remove it too.
      // Without this, going Back to /members leaves the last tile ringed
      // forever: the timeout is cancelled and nothing else clears the class.
      if (marked) marked.classList.remove('member-tile-wrap--focus');
    };
  }, [focusSlug]);

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
              <MemberCard3D key={m.id} member={m} index={i} variant="leader" onOpen={onOpenMember} />
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
              <MemberCard3D key={m.id} member={m} index={i} onOpen={onOpenMember} />
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
              <MemberCard3D key={m.id} member={m} index={i} onOpen={onOpenMember} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
