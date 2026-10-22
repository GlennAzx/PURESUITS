import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CountdownCard from './CountdownCard';

const REPEAT = 3;
const AUTOPLAY_MS = 4500;

export default function EventCarousel({ events, now }) {
  const scrollerRef = useRef(null);
  const trackRef = useRef(null);
  const setWidthRef = useRef(0);
  const pausedRef = useRef(false);
  // Whether the track is wider than its scroller. When every card already fits
  // there is nothing to scroll to, so autoplay and the arrows are suppressed.
  const [overflows, setOverflows] = useState(false);

  const count = events.length;
  const loop = Array.from({ length: REPEAT }, () => events).flat();

  const measure = useCallback(() => {
    const track = trackRef.current;
    const scroller = scrollerRef.current;
    if (!track || !scroller) return;

    // Overflow is measured from one set's width, derived WITHOUT relying on the
    // repeated sets. Using children[count] here would deadlock: the repeats are
    // only rendered once overflow is known, so the measurement that decides it
    // could never run.
    const first = track.children[0];
    if (!first) return;
    const gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
    const setWidth = count * (first.offsetWidth + gap);
    setWidthRef.current = setWidth;
    setOverflows(setWidth > scroller.clientWidth + 1);
  }, [count]);

  const centre = useCallback(() => {
    const s = scrollerRef.current;
    const w = setWidthRef.current;
    if (!s || !w) return;
    // Only meaningful while the repeated sets exist; with no overflow the
    // track starts at its natural left edge.
    s.scrollLeft = overflows ? w : 0;
  }, [overflows]);

  useEffect(() => {
    // Re-runs when `count` changes: an event starting or ending moves it
    // between the ongoing row and this carousel, so the track width changes.
    // Wait for layout so offsetLeft is meaningful.
    const raf = requestAnimationFrame(() => {
      measure();
      centre();
    });
    const onResize = () => {
      measure();
      centre();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [measure, centre, count]);

  // Seamless wrap: shifting by exactly one set width shows identical content
  const handleScroll = useCallback(() => {
    const s = scrollerRef.current;
    const w = setWidthRef.current;
    if (!s || !w || !overflows) return;
    if (s.scrollLeft < w * 0.5) s.scrollLeft += w;
    else if (s.scrollLeft >= w * 1.5) s.scrollLeft -= w;
  }, [overflows]);

  const step = useCallback((dir) => {
    const s = scrollerRef.current;
    const track = trackRef.current;
    if (!s || !track) return;
    const first = track.children[0];
    if (!first) return;
    const gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
    s.scrollBy({ left: dir * (first.offsetWidth + gap), behavior: 'smooth' });
  }, []);

  // Autoplay
  useEffect(() => {
    // Nothing to advance to when every card already fits.
    if (!overflows) return undefined;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      step(1);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [step, overflows]);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        data-lenis-prevent
        className="overflow-x-auto overflow-y-hidden pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: 'x proximity' }}
      >
        <div
          ref={trackRef}
          className="flex gap-4 sm:gap-5 w-max px-1"
        >
          {/* Repeated sets exist only to make the wrap seamless. With no
              overflow they would be dead duplicates the user can scroll to. */}
          {(overflows ? loop : events).map((event, i) => (
            <CountdownCard key={`${event.id}-${i}`} event={event} now={now} />
          ))}
        </div>
      </div>

      {/* Arrows would be inert with nothing to scroll to. */}
      {overflows && (
      <div className="flex items-center justify-end mt-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous events"
            className="btn-press p-2 rounded border border-imperial-gold/25 text-imperial-gold hover:border-imperial-gold transition-[border-color,color] duration-150 ease-out-strong"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next events"
            className="btn-press p-2 rounded border border-imperial-gold/25 text-imperial-gold hover:border-imperial-gold transition-[border-color,color] duration-150 ease-out-strong"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
