import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import { formatTime, zoneLabel } from '../lib/calendar';
import useTimeMode from '../lib/useTimeMode';
import { splitCountdown } from '../data/schedule';
import { isEventLive } from '../lib/siteContent';
import { imageUrl } from '../lib/media';

/** "15 NOV" split into the two parts the badge shows. */
function dateParts(startsAt) {
  const d = new Date(startsAt + 8 * 60 * 60 * 1000); // SGT, matching the data
  const day = d.getUTCDate();
  const month = d
    .toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })
    .toUpperCase();
  return { day, month };
}

/** 90 -> "1.5 hr", 45 -> "45 min". */
function durationLabel(mins) {
  if (!mins) return '';
  if (mins < 60) return `${mins} min`;
  const h = mins / 60;
  return Number.isInteger(h) ? `${h} hr` : `${h.toFixed(1)} hr`;
}

/**
 * Compact countdown for a one-off event: "Live now", "in 3d 04h", or the
 * absolute time when it is far away.
 */
function whenLabel(event, now) {
  if (isEventLive(event, now)) return 'Live now';

  const untilStart = event.startsAt - now;
  const c = splitCountdown(untilStart);

  // Always relative. The absolute time is already printed on the card's bottom
  // line, so repeating it here would show the same string twice.
  if (c.days >= 1) return `in ${c.days}d ${String(c.hours).padStart(2, '0')}h`;
  if (c.hours >= 1) return `in ${c.hours}h ${String(c.minutes).padStart(2, '0')}m`;
  return `in ${c.minutes}m`;
}

/**
 * One card. Separate from CountdownCard because a one-off event has a fixed
 * date rather than a cadence, and the two read very differently: a weekly run
 * repeats forever, a one-off night does not.
 */
function EventCard({ event, now, onOpen }) {
  const [timeMode] = useTimeMode();
  const live = isEventLive(event, now);
  const { day, month } = dateParts(event.startsAt);

  // A card with a banner takes the full width: poster left, text right. Cards
  // without one keep the compact side-by-side layout, so a text-only event does
  // not become a tall empty box.
  const feature = Boolean(event.image);

  return (
    <article
      className={`event-listing group relative h-full overflow-hidden rounded-xl border transition-colors duration-200 ${
        live
          ? 'border-jade-accent/60 bg-ink-charcoal'
          : 'border-imperial-gold/25 bg-ink-charcoal hover:border-imperial-gold/55'
      }`}
    >
      <div className={`flex h-full flex-col ${feature ? 'sm:flex-row' : ''}`}>
        {/* Optional banner. It belongs to the event, so it leaves with the card
            once the event is over and drops out of the list. */}
        {event.image && (
          <div
            className={`relative overflow-hidden ${
              feature
                ? 'aspect-[16/9] w-full sm:aspect-auto sm:min-h-[240px] sm:w-[54%] sm:shrink-0'
                : 'aspect-[16/9] w-full'
            }`}
          >
            <img
              src={imageUrl(event.image)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div
              className={`pointer-events-none absolute inset-0 ${
                feature
                  ? 'bg-gradient-to-t from-ink-charcoal via-ink-charcoal/25 to-transparent sm:bg-gradient-to-l'
                  : 'bg-gradient-to-t from-ink-charcoal via-ink-charcoal/30 to-transparent'
              }`}
            />
          </div>
        )}

        <div className={feature ? 'flex flex-1 flex-col justify-center gap-3 p-5' : 'flex h-full items-center gap-4 p-4'}>
        {/* Date badge. Kept narrow so the title gets the width. */}
        <div
          className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border py-2 ${
            live
              ? 'border-jade-accent/45 bg-jade-accent/10'
              : 'border-imperial-gold/25 bg-ink-black/50'
          }`}
        >
          <span
            className={`font-mono text-xl leading-none tabular-nums ${
              live ? 'text-jade-accent' : 'text-imperial-gold-bright'
            }`}
          >
            {String(day).padStart(2, '0')}
          </span>
          <span className="mt-1 text-[9px] uppercase tracking-widest text-gray-400">
            {month}
          </span>
        </div>

        <div className={feature ? 'min-w-0' : 'min-w-0 flex-1'}>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded border border-imperial-gold/30 bg-jade-deep px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-imperial-gold">
              {event.tag}
            </span>
            <span
              className={`text-[10px] font-mono uppercase tracking-wider ${
                live ? 'text-jade-accent' : 'text-gray-400'
              }`}
            >
              {whenLabel(event, now)}
            </span>
          </div>

          <h3
            className={`font-serif font-bold leading-snug text-ivory ${
              feature ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
            }`}
          >
            {event.title}
          </h3>

          {event.description && (
            <p
              className={`mt-1.5 leading-relaxed text-gray-400 ${
                feature ? 'line-clamp-3 max-w-xl text-[13px]' : 'line-clamp-2 text-[11.5px]'
              }`}
            >
              {/* Teaser only: line breaks collapse so a heading does not run into
                  its text. The overlay keeps them. */}
              {event.description.replace(/\s*\n+\s*/g, ' · ')}
            </p>
          )}

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] text-ivory-shadow">
              <span>
                {formatTime(event.startsAt, timeMode)}{' '}
                <span className="uppercase tracking-wider">
                  {zoneLabel(timeMode)}
                </span>
              </span>
              {/* Location is optional, so the row collapses cleanly when absent. */}
              {event.location && (
                <span className="flex min-w-0 items-center gap-1 normal-case tracking-normal text-gray-400">
                  <MapPin size={10} className="shrink-0 opacity-60" />
                  <span className="truncate">{event.location}</span>
                </span>
              )}
            </span>

            <span className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen();
                }}
                className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-imperial-gold transition-colors hover:text-imperial-gold-bright"
              >
                Read more
                <ChevronRight size={11} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
              {event.link && (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-imperial-gold/80 transition-colors hover:text-imperial-gold"
                >
                  Details
                  <ArrowUpRight size={11} className="opacity-60" />
                </a>
              )}
            </span>
          </div>
        </div>
        </div>
      </div>
    </article>
  );
}

/**
 * The expanded view of one event: the poster uncropped, and the whole
 * description in a scrollable panel.
 *
 * Rendered into document.body so no ancestor's overflow or opacity can clip it.
 * Follows the gallery viewer's rules: Escape closes, the page behind is locked,
 * and the inner panel scrolls on its own. data-lenis-prevent hands the wheel to
 * that panel, otherwise the smooth-scroll library drives the page instead.
 */
function EventOverlay({ event, now, onClose }) {
  const [timeMode] = useTimeMode();
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;
  const [shown, setShown] = useState(false);

  const live = isEventLive(event, now);
  const { day, month } = dateParts(event.startsAt);
  const length = durationLabel(event.durationMinutes);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => setShown(true));
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFn.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      // Keep Tab inside the dialog. The page behind is not reachable while open.
      const nodes = Array.from(
        panelRef.current.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={event.title}
    >
      <div
        className={`absolute inset-0 bg-ink-black/80 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className={`relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-ink-charcoal shadow-2xl transition duration-200 ease-out motion-reduce:transition-none ${
          live ? 'border-jade-accent/60' : 'border-imperial-gold/35'
        } ${shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full border border-imperial-gold/40 bg-ink-black/80 p-2 text-imperial-gold backdrop-blur transition-colors hover:border-imperial-gold"
        >
          <X size={16} />
        </button>

        <div
          data-lenis-prevent
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none focus-visible:ring-1 focus-visible:ring-imperial-gold/40"
        >
          {event.image && (
            <img
              src={imageUrl(event.image)}
              alt=""
              className="block max-h-[55vh] w-full bg-ink-black object-contain"
            />
          )}

          <div className="p-5 sm:p-7">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded border border-imperial-gold/30 bg-jade-deep px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-imperial-gold">
                {event.tag}
              </span>
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  live ? 'text-jade-accent' : 'text-gray-400'
                }`}
              >
                {whenLabel(event, now)}
              </span>
            </div>

            <h3 className="pr-10 font-serif text-2xl font-bold leading-snug text-ivory sm:text-3xl">
              {event.title}
            </h3>

            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ivory-shadow">
              <span>
                {String(day).padStart(2, '0')} {month}
              </span>
              <span>
                {formatTime(event.startsAt, timeMode)}{' '}
                <span className="uppercase tracking-wider">{zoneLabel(timeMode)}</span>
              </span>
              {length && <span>{length}</span>}
              {event.location && (
                <span className="flex items-center gap-1 normal-case tracking-normal text-gray-400">
                  <MapPin size={11} className="opacity-60" />
                  {event.location}
                </span>
              )}
            </p>

            {event.description && (
              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-gray-300">
                {event.description}
              </p>
            )}

            {event.link && (
              <a
                href={event.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-imperial-gold/40 px-3 py-2 text-[11px] uppercase tracking-wider text-imperial-gold transition-colors hover:border-imperial-gold hover:bg-imperial-gold/10"
              >
                Details
                <ArrowUpRight size={12} className="opacity-70" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * One-off events: tournaments, guild nights, milestones.
 *
 * Full-width cards, so they run as one horizontal strip: a card in view, the
 * next one peeking in from the right. The peek is the "there is more" signal —
 * no second row, and no guessing from a counter alone.
 */
export default function EventsSection({ events, now }) {
  const trackRef = useRef(null);
  const lastFocus = useRef(null);
  const [index, setIndex] = useState(0);
  const [openId, setOpenId] = useState(null);
  const count = events.length;
  const many = count > 1;

  // Looked up by id each render, so the overlay stays current as the clock
  // ticks, and closes by itself if the event ends or is deleted while open.
  const openEvent = openId ? events.find((e) => e.id === openId) : null;

  const openOverlay = useCallback((event) => {
    lastFocus.current = document.activeElement;
    setOpenId(event.id);
  }, []);

  const closeOverlay = useCallback(() => {
    setOpenId(null);
    // Hand focus back to what opened the overlay, without scrolling the page.
    requestAnimationFrame(() => lastFocus.current?.focus?.({ preventScroll: true }));
  }, []);

  /** Scroll one slide into view. Called by the arrows, the dots and a click. */
  const goTo = useCallback(
    (next) => {
      const el = trackRef.current;
      if (!el) return;
      const i = Math.max(0, Math.min(count - 1, next));
      const child = el.children[i];
      if (!child) return;
      el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: 'smooth' });
      setIndex(i);
    },
    [count]
  );

  /** Keep the arrows in step with a manual swipe. */
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    let best = 0;
    let bestDistance = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const d = Math.abs(child.offsetLeft - el.offsetLeft - el.scrollLeft);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    setIndex(best);
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  return (
    <section className="events-section max-w-6xl mx-auto px-4 lg:pr-24 pt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-imperial-gold/25 pb-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ivory">Events</h2>
          <p className="mt-1 text-xs text-gray-400">
            One-off nights and tournaments, soonest first. Dates in guild time, UTC+8.
          </p>
        </div>
        {many && (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
            {index + 1} / {count}
          </span>
        )}
      </div>

      {/* An honest empty state beats hiding the section: the visitor learns
          that one-off events exist and simply are not scheduled, and the
          editor can see where content goes. */}
      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-imperial-gold/20 px-4 py-8 text-center text-[11.5px] text-ivory-shadow">
          No one-off events scheduled. Weekly runs are below.
        </p>
      ) : (
        <div className="relative">
          <div
            ref={trackRef}
            onScroll={onScroll}
            onKeyDown={onKeyDown}
            tabIndex={0}
            role="group"
            aria-label="Events, use the arrow keys to move between them"
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 outline-none focus-visible:ring-1 focus-visible:ring-imperial-gold/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {events.map((event, i) => (
              <div
                key={event.id}
                onClick={(e) => {
                  if (e.target.closest('a, button')) return;
                  // The peeking card brings itself into view; the card already in
                  // view opens its full description.
                  if (i !== index) goTo(i);
                  else openOverlay(event);
                }}
                className={`flex shrink-0 snap-start cursor-pointer transition-opacity duration-300 ${
                  many ? 'w-full sm:w-[calc(100%-3.5rem)]' : 'w-full'
                } ${i === index ? 'opacity-100' : 'opacity-55 hover:opacity-85'}`}
              >
                <EventCard event={event} now={now} onOpen={() => openOverlay(event)} />
              </div>
            ))}
          </div>

          {many && (
            <>
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                aria-label="Previous event"
                className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-imperial-gold/40 bg-ink-black/85 p-2 text-imperial-gold backdrop-blur transition-colors hover:border-imperial-gold disabled:pointer-events-none disabled:opacity-25"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                disabled={index === count - 1}
                aria-label="Next event"
                className="absolute right-10 top-1/2 z-10 -translate-y-1/2 rounded-full border border-imperial-gold/40 bg-ink-black/85 p-2 text-imperial-gold backdrop-blur transition-colors hover:border-imperial-gold disabled:pointer-events-none disabled:opacity-25 sm:right-2"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}

          {many && (
            <div className="mt-3 flex items-center gap-1.5">
              {events.map((event, i) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show ${event.title}`}
                  aria-current={i === index}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index
                      ? 'w-6 bg-imperial-gold'
                      : 'w-1.5 bg-imperial-gold/30 hover:bg-imperial-gold/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {openEvent && <EventOverlay event={openEvent} now={now} onClose={closeOverlay} />}
    </section>
  );
}
