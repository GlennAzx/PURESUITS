import React from 'react';
import { activeOccurrence, splitCountdown } from '../data/schedule';
import { formatTime, zoneLabel, downloadICS } from '../lib/calendar';
import useTimeMode from '../lib/useTimeMode';

/**
 * The large, stationary card for an event that is running right now.
 *
 * This is deliberately NOT the carousel card. A running event is the single
 * most useful thing on the page — "can I join something this minute" — and a
 * card that slides away on a 4.5 second timer answers that badly. These cards
 * sit above the carousel and do not move.
 *
 * It also shows what the small card cannot: a progress bar of how much of the
 * run is already gone. "Ends 23:30" needs arithmetic; a bar that is three
 * quarters full does not.
 *
 * @param {object} props
 * @param {object} props.event - Event record from src/data/schedule.js.
 * @param {number} props.now - Shared clock, see src/lib/useNow.js.
 */
export default function OngoingEventCard({ event, now }) {
  const [timeMode] = useTimeMode();

  const start = activeOccurrence(event, now);
  // The parent only renders this for running events, but a card that outlives
  // its own window by one tick must not crash the page.
  if (start === null) return null;

  const durationMs = (event.durationMinutes || 0) * 60000;
  const end = start + durationMs;
  const remaining = end - now;
  const c = splitCountdown(remaining);

  // Clamped so a late tick cannot overflow the bar.
  const elapsedPct = durationMs > 0
    ? Math.min(100, Math.max(0, ((now - start) / durationMs) * 100))
    : 0;

  // Days are omitted on purpose: nothing here runs longer than a few hours,
  // and a permanent "00 D" column wastes the space this card is spending.
  const units = [
    { label: 'Hours', value: c.hours },
    { label: 'Minutes', value: c.minutes },
    { label: 'Seconds', value: c.seconds },
  ];

  return (
    <article className="ongoing-card relative overflow-hidden rounded-xl border border-jade-accent/60 bg-ink-charcoal p-5 sm:p-6 shadow-[0_0_34px_rgba(111,191,145,0.10)]">
      {/* Jade wash, strongest at the leading edge. Pointer-events off so it
          never sits between the user and the button below. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-jade-accent/[0.09] via-transparent to-transparent"
      />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded bg-jade-accent/15 border border-jade-accent/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-jade-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-jade-accent animate-pulse" />
            Live now
          </span>
          <span className="rounded border border-imperial-gold/30 bg-jade-deep px-2 py-0.5 text-[10px] uppercase tracking-wider text-imperial-gold">
            {event.category}
          </span>
        </div>

        <h3 className="font-serif text-lg sm:text-xl font-bold text-ivory leading-snug mb-1.5">
          {event.name}
        </h3>
        <p className="text-[11.5px] sm:text-xs text-gray-400 leading-relaxed mb-4 max-w-2xl">
          {event.description}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.18em] text-gray-500 mb-1.5">
              Time remaining
            </div>
            <div className="flex items-end gap-2" role="timer" aria-live="off">
              {units.map((u) => (
                <div key={u.label} className="text-center">
                  <div className="font-mono text-2xl sm:text-3xl tabular-nums leading-none text-jade-accent">
                    {String(u.value).padStart(2, '0')}
                  </div>
                  <div className="mt-1 text-[8.5px] uppercase tracking-widest text-gray-600">
                    {u.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sm:text-right">
            <div className="font-mono text-[11px] text-gray-500">
              Ends{' '}
              <span className="text-jade-accent">
                {formatTime(end, timeMode)}
              </span>{' '}
              <span className="text-[9px] uppercase tracking-wider text-gray-600">
                {zoneLabel(timeMode)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => downloadICS(event, start)}
              className="mt-2 rounded-md border border-jade-accent/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-jade-accent/90 transition-colors hover:border-jade-accent hover:text-jade-accent"
            >
              Add to calendar
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-ink-black/80"
            role="progressbar"
            aria-valuenow={Math.round(elapsedPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${event.name} progress`}
          >
            <div
              className="h-full rounded-full bg-jade-accent/70"
              style={{ width: `${elapsedPct}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
