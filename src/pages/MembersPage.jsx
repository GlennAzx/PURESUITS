import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import MemberCard3D from '../components/MemberCard3D';
import membersData from '../data/members.json';
import { imageUrl } from '../lib/media';
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

/**
 * @param {object} props
 * @param {object} [props.content] - Site content from App. Its `members` list
 *   holds portrait overrides keyed by member id, so a portrait added in /admin
 *   shows up without a rebuild. Members without an override keep the portrait
 *   shipped in the repo.
 */
export default function MembersPage({
  focusSlug = null,
  focusSource = 'load',
  onOpenMember = null,
  onClearSlug = null,
  content = null,
}) {
  const pageRef = useRef(null);
  // Which tile is currently ringed. React owns this, not the DOM: an
  // imperative classList.add is wiped the next time the tile re-renders.
  const [ringSlug, setRingSlug] = useState(null);
  const [query, setQuery] = useState('');

  const { leadership, commanders, members, total } = useMemo(() => {
    // The roster itself now lives in the content file once an admin has edited
    // it, so the page no longer depends on a rebuild to add or remove someone.
    // Until then it falls back to the bundled list, which keeps the page
    // working if the bucket is unreachable.
    const source = content?.members?.length ? content.members : membersData;

    const roster = source.map((m) => ({
      ...m,
      // Resolve here so the card always receives something <img> can use: a
      // bare R2 key would otherwise be requested relative to the page.
      avatar: m.avatar ? imageUrl(m.avatar) : null,
    }));

    const byTier = (t) => roster.filter((m) => m.tier === t);
    const lead = [...byTier('guild_leader'), ...byTier('deputy')];
    return {
      leadership: lead,
      commanders: byTier('commander'),
      members: byTier('member'),
      total: roster.length,
    };
  }, [content]);

  // Search. Matches name, role and tier, so typing "deputy" works as well as a
  // name. CJK names need no special handling — there is no case to fold.
  //
  // Filtering REMOVES tiles from the DOM, and the deep-link code below finds
  // its tile by data-slug. A filtered-out slug would silently fail to ring, so
  // the query is cleared whenever a slug arrives. That is the whole trap.
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const match = (m) =>
      `${m.name} ${m.role || ''} ${m.tier || ''}`.toLowerCase().includes(q);
    return {
      leadership: leadership.filter(match),
      commanders: commanders.filter(match),
      members: members.filter(match),
    };
  }, [query, leadership, commanders, members]);

  const shown = hits ?? { leadership, commanders, members };
  const shownTotal = shown.leadership.length + shown.commanders.length + shown.members.length;

  // A tile must exist for a deep link to land on it.
  useEffect(() => {
    if (focusSlug) setQuery('');
  }, [focusSlug]);

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

        {/* Roster search. Interim until the roster is trimmed to core members
            plus recent standouts — then this becomes a filter over a shorter
            list, but it earns its place either way. */}
        <div className="mt-7 flex justify-center">
          <div className="relative w-full max-w-sm">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a member, a role, a tier…"
              aria-label="Search the roster"
              className="w-full rounded-full border border-imperial-gold/30 bg-ink-charcoal/70 px-5 py-2.5 pr-24 text-sm text-ivory placeholder:text-ivory/35 outline-none transition-colors focus:border-imperial-gold/70"
            />
            {query ? (
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-imperial-gold">
                  {shownTotal} {shownTotal === 1 ? 'hit' : 'hits'}
                </span>
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="grid h-6 w-6 place-items-center rounded-full text-ivory/50 transition-colors hover:text-ivory"
                >
                  ×
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {hits && shownTotal === 0 ? (
        <p className="py-20 text-center text-sm text-ivory/45">
          No member matches “{query}”.
        </p>
      ) : null}

      {/* Leadership — separate pane */}
      <section className={`leadership-pane mb-16 ${shown.leadership.length === 0 ? 'hidden' : ''}`}>
        <div className="rounded-2xl border border-imperial-gold/25 bg-gradient-to-b from-ink-charcoal to-ink-black p-6 sm:p-8">
          <SectionHeading title="Leadership" />
          {/* Guild leader and vice master sit as a PAIR at every width. On a
              phone a single column stacked them, which read as one person
              above another rather than two people leading together. */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 justify-items-center sm:gap-x-12 sm:gap-y-16">
            {shown.leadership.map((m, i) => (
              <MemberCard3D key={m.id} member={m} index={i} variant="leader" onOpen={onOpenMember} highlighted={ringSlug === memberSlug(m)} />
            ))}
          </div>
        </div>
      </section>

      {/* Commanders */}
      {shown.commanders.length > 0 && (
        <section className="mb-16">
          <SectionHeading title="Commanders" />
          <div className="grid grid-cols-2 justify-items-center gap-x-5 gap-y-9 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4">
            {shown.commanders.map((m, i) => (
              <MemberCard3D key={m.id} member={m} index={i} variant="command" onOpen={onOpenMember} highlighted={ringSlug === memberSlug(m)} />
            ))}
          </div>
        </section>
      )}

      {/* Members */}
      {shown.members.length > 0 && (
        <section>
          <SectionHeading title="Members" />
          {/* The roster is 73 people. Large tiles there meant a very long
              scroll of near-identical cards, so this tier is packed: many per
              row, small gaps, enough separation to scan without reading. */}
          <div className="grid grid-cols-3 justify-items-center gap-x-2.5 gap-y-6 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {shown.members.map((m, i) => (
              <MemberCard3D key={m.id} member={m} index={i} variant="member" onOpen={onOpenMember} highlighted={ringSlug === memberSlug(m)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
