import React, { useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CountdownCard from './CountdownCard';

const REPEAT = 3;
const AUTOPLAY_MS = 4500;

export default function EventCarousel({ events }) {
  const scrollerRef = useRef(null);
  const trackRef = useRef(null);
  const setWidthRef = useRef(0);
  const pausedRef = useRef(false);

  const count = events.length;
  const loop = Array.from({ length: REPEAT }, () => events).flat();

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const firstOfSet = track.children[0];
    const firstOfSecondSet = track.children[count];
    if (!firstOfSet || !firstOfSecondSet) return;
    setWidthRef.current = firstOfSecondSet.offsetLeft - firstOfSet.offsetLeft;
  }, [count]);

  const centre = useCallback(() => {
    const s = scrollerRef.current;
    const w = setWidthRef.current;
    if (!s || !w) return;
    s.scrollLeft = w; // start of the middle set
  }, []);

  useEffect(() => {
    // Wait for layout so offsetLeft is meaningful
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
  }, [measure, centre]);

  // Seamless wrap: shifting by exactly one set width shows identical content
  const handleScroll = useCallback(() => {
    const s = scrollerRef.current;
    const w = setWidthRef.current;
    if (!s || !w) return;
    if (s.scrollLeft < w * 0.5) s.scrollLeft += w;
    else if (s.scrollLeft >= w * 1.5) s.scrollLeft -= w;
  }, []);

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
    const id = setInterval(() => {
      if (pausedRef.current) return;
      step(1);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [step]);

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
          {loop.map((event, i) => (
            <CountdownCard key={`${event.id}-${i}`} event={event} />
          ))}
        </div>
      </div>

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
    </div>
  );
}
