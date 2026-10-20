import React, { useEffect, useState } from 'react';
import {
  nextOccurrence,
  activeOccurrence,
  splitCountdown,
  formatSGT,
  cadenceLabel,
} from '../data/schedule';

export default function CountdownCard({ event }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ongoingStart = activeOccurrence(event, now);
  const isOngoing = ongoingStart !== null;
  const durationMs = (event.durationMinutes || 0) * 60000;

  // Ongoing cards count down to the end; idle cards count down to the start.
  const target = isOngoing
    ? ongoingStart + durationMs
    : nextOccurrence(event, now);

  const c = splitCountdown(target - now);

  const units = [
    { label: 'D', value: c.days },
    { label: 'H', value: c.hours },
    { label: 'M', value: c.minutes },
    { label: 'S', value: c.seconds },
  ];

  return (
    <article
      className={`event-card w-[280px] sm:w-[320px] shrink-0 snap-start bg-ink-charcoal border rounded-xl p-5 flex flex-col justify-between transition-[border-color] duration-200 ease-out-strong ${
        isOngoing
          ? 'border-jade-accent/55'
          : 'border-imperial-gold/20 hover:border-imperial-gold/50'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-jade-deep text-imperial-gold border border-imperial-gold/30">
            {event.category}
          </span>

          {isOngoing ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-jade-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-jade-accent animate-pulse" />
              Ongoing
            </span>
          ) : (
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
              {cadenceLabel(event)}
            </span>
          )}
        </div>

        <h3 className="text-base font-serif font-bold text-ivory leading-snug mb-1.5 min-h-[2.6em]">
          {event.name}
        </h3>
        <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
          {event.description}
        </p>
      </div>

      <div>
        <div
          className="flex items-end gap-1.5 mb-3"
          role="timer"
          aria-live="off"
        >
          {units.map((u) => (
            <div
              key={u.label}
              className={`flex-1 bg-ink-black/70 border rounded-md py-2 text-center ${
                isOngoing
                  ? 'border-jade-accent/25'
                  : 'border-imperial-gold/15'
              }`}
            >
              <div
                className={`font-mono text-lg tabular-nums leading-none ${
                  isOngoing
                    ? 'text-jade-accent'
                    : 'text-imperial-gold-bright'
                }`}
              >
                {String(u.value).padStart(2, '0')}
              </div>
              <div className="text-[9px] text-gray-500 mt-1 tracking-widest">
                {u.label}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[10px] font-mono text-gray-500 pt-2.5 border-t border-gray-800 flex items-center justify-between">
          <span>{isOngoing ? 'Ends' : 'Next'}</span>
          <span className={isOngoing ? 'text-jade-accent' : 'text-imperial-gold'}>
            {formatSGT(target)}
          </span>
        </div>
      </div>
    </article>
  );
}
