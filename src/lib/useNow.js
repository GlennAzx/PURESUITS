import { useEffect, useState } from 'react';

/**
 * A shared one-second clock.
 *
 * Several components on the landing page need "what time is it now" to decide
 * whether an event is running and how long is left. Each one used to own a
 * setInterval, so the page ran a timer per card and they ticked out of step —
 * one card could flip to "Ongoing" a second before another noticed.
 *
 * @param {number} intervalMs - Tick period. One second is enough for a
 *   countdown that displays seconds.
 * @returns {number} Current epoch milliseconds, updated on each tick.
 */
export default function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
