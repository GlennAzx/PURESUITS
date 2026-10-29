import React from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
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
function EventCard({ event, now }) {
  const [timeMode] = useTimeMode();
  const live = isEventLive(event, now);
  const { day, month } = dateParts(event.startsAt);

  return (
    <article
      className={`event-listing group relative overflow-hidden rounded-xl border transition-colors duration-200 ${
        live
          ? 'border-jade-accent/60 bg-ink-charcoal'
          : 'border-imperial-gold/25 bg-ink-charcoal hover:border-imperial-gold/55'
      }`}
    >
      {/* Optional banner. It belongs to the event, so it leaves with the card
          once the event is over and drops out of the list. */}
      {event.image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <img
            src={imageUrl(event.image)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-charcoal via-ink-charcoal/30 to-transparent" />
        </div>
      )}

      <div className="flex gap-4 p-4">
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

      <div className="min-w-0 flex-1">
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

        <h3 className="font-serif text-base font-bold leading-snug text-ivory">
          {event.title}
        </h3>

        {event.description && (
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-gray-400">
            {event.description}
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
        </div>
      </div>
      </div>
    </article>
  );
}

/**
 * One-off events: tournaments, guild nights, milestones.
 *
 * Deliberately a plain grid, not a carousel. These are few and each one is
 * distinct, so scrolling them past the reader would hide exactly the thing
 * they need to plan around.
 */
export default function EventsSection({ events, now }) {
  return (
    <section className="events-section max-w-6xl mx-auto px-4 lg:pr-24 pt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-imperial-gold/25 pb-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ivory">Events</h2>
          <p className="mt-1 text-xs text-gray-400">
            One-off nights and tournaments. Dates in guild time, UTC+8.
          </p>
        </div>
      </div>

      {/* An honest empty state beats hiding the section: the visitor learns
          that one-off events exist and simply are not scheduled, and the
          editor can see where content goes. */}
      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-imperial-gold/20 px-4 py-8 text-center text-[11.5px] text-ivory-shadow">
          No one-off events scheduled. Weekly runs are below.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} now={now} />
          ))}
        </div>
      )}
    </section>
  );
}
