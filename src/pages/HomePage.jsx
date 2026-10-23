import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowUpRight, Github, Heart } from 'lucide-react';
import VideoHero from '../components/VideoHero';
import EventCarousel from '../components/EventCarousel';
import OngoingEventCard from '../components/OngoingEventCard';
import EventsSection from '../components/EventsSection';
import DiscordPill from '../components/DiscordPill';
import { activeOccurrence } from '../data/schedule';
import { upcomingEvents } from '../lib/siteContent';
import useSiteContent from '../lib/useSiteContent';
import useNow from '../lib/useNow';
import useTimeMode, { setTimeMode } from '../lib/useTimeMode';



function DiscordIcon({ size = 22 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

/** Shows only while at least one event is inside its run window. */
/**
 * The stationary row of large cards for events running right now.
 *
 * Kept out of the carousel on purpose: a running event is the most actionable
 * thing on the page, and a card that slides away every 4.5 seconds is a poor
 * place to put it. One running event gets the full width; two or more share a
 * two-column grid.
 */
function OngoingSection({ events, now }) {
  if (events.length === 0) return null;

  return (
    <div className="ongoing-section mb-7">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-jade-accent">
          <span className="w-1.5 h-1.5 rounded-full bg-jade-accent animate-pulse" />
          Happening now
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-jade-accent/35 to-transparent" />
      </div>

      <div
        className={`grid gap-4 ${
          events.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {events.map((event, i) => (
          <OngoingEventCard key={`${event.id}-${i}`} event={event} now={now} />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const eventsRef = useRef(null);
  const [timeMode] = useTimeMode();
  // One clock for the whole section, so every card flips on the same tick.
  const now = useNow();
  // Content comes from JSON in R2, so events and the schedule change without a
  // redeploy. Starts on the bundled defaults, so there is no empty first paint.
  const { content } = useSiteContent();
  const { links } = content;

  // An event belongs in exactly one place: the stationary row while it runs,
  // the carousel otherwise. Splitting here keeps that rule in a single spot.
  const ongoing = content.schedule.filter(
    (e) => activeOccurrence(e, now) !== null
  );
  const upcoming = content.schedule.filter(
    (e) => activeOccurrence(e, now) === null
  );

  // One-off events, soonest first. Finished ones drop out on their own.
  const events = upcomingEvents(content.events, now);

  useGSAP(
    () => {
      gsap.from('.events-header', {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
        scrollTrigger: {
          trigger: '.events-header',
          start: 'top 88%',
          once: true,
        },
      });

      gsap.from('.events-carousel', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: 0.08,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
        scrollTrigger: {
          trigger: '.events-carousel',
          start: 'top 88%',
          once: true,
        },
      });

      gsap.from('.landing-footer', {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
        scrollTrigger: {
          trigger: '.landing-footer',
          start: 'top 92%',
          once: true,
        },
      });
    },
    // An EMPTY dependency array is required, not optional. useGSAP re-runs its
    // callback on every render when no dependencies are given, and this page
    // now re-renders once a second from the shared clock. Without this the
    // reveal tweens were rebuilt every tick: each new gsap.from() reset the
    // element to opacity 0, so the carousel and header never became visible.
    { scope: eventsRef, dependencies: [] }
  );

  // The ongoing row mounts and unmounts as events start and end, which changes
  // the height of everything below it. ScrollTrigger caches each trigger's
  // start and end position when the trigger is created, so after a layout
  // change those cached positions are stale and the reveals below the change
  // either fire early or never fire.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [ongoing.length, upcoming.length, events.length]);

  return (
    <div>
      <VideoHero />
      <DiscordPill href={links.discord} />

      <EventsSection events={events} now={now} />

      <section ref={eventsRef} className="max-w-6xl mx-auto px-4 lg:pr-24 py-20">
        <div className="events-header flex flex-wrap items-end justify-between gap-3 mb-6 pb-3 border-b border-imperial-gold/25">
          <div>
            <h2 className="text-2xl font-serif font-bold text-ivory">
              Weekly Schedule
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Recurring guild runs.{' '}
              {timeMode === 'sgt' ? 'All times UTC+8 (guild time)' : 'Times in your local zone'}
            </p>
          </div>

          {/* Time zone toggle. One control, applies to every card, remembered. */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">
              Countdowns update live
            </span>
            <div className="flex overflow-hidden rounded-md border border-imperial-gold/25">
              <button
                type="button"
                onClick={() => setTimeMode('sgt')}
                aria-pressed={timeMode === 'sgt'}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                  timeMode === 'sgt'
                    ? 'bg-imperial-gold/20 text-imperial-gold'
                    : 'text-gray-500 hover:text-ivory'
                }`}
              >
                UTC+8
              </button>
              <button
                type="button"
                onClick={() => setTimeMode('local')}
                aria-pressed={timeMode === 'local'}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                  timeMode === 'local'
                    ? 'bg-imperial-gold/20 text-imperial-gold'
                    : 'text-gray-500 hover:text-ivory'
                }`}
              >
                My time
              </button>
            </div>
          </div>
        </div>

        <OngoingSection events={ongoing} now={now} />

        {upcoming.length > 0 && (
          <div className="events-carousel">
            {ongoing.length > 0 && (
              <div className="mb-3 flex items-center gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                  Coming up
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-imperial-gold/20 to-transparent" />
              </div>
            )}
            <EventCarousel events={upcoming} now={now} />
          </div>
        )}
      </section>

      <footer className="landing-footer border-t border-imperial-gold/15">
        <div className="max-w-6xl mx-auto px-4 lg:pr-24 py-14 flex flex-col items-center gap-6">
          <a
            href={links.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 px-6 py-3.5 rounded-xl border border-imperial-gold/35 bg-ink-charcoal text-gray-300 hover:border-imperial-gold hover:text-imperial-gold-bright transition-[border-color,color,box-shadow] duration-200 ease-out-strong hover:shadow-[0_0_28px_rgba(212,175,55,0.16)]"
          >
            <DiscordIcon size={22} />
            <span className="font-serif font-bold text-sm tracking-wide">
              Join the Discord
            </span>
            <ArrowUpRight
              size={14}
              className="opacity-40 group-hover:opacity-90 transition-opacity duration-200"
            />
          </a>

          {/* Secondary links. Support is hidden while links.support is empty,
              so the footer never shows a dead button. */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {links.github && (
              <a
                href={links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-imperial-gold/20 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 transition-colors hover:border-imperial-gold/50 hover:text-imperial-gold"
              >
                <Github size={12} />
                GitHub
              </a>
            )}

            {links.support && (
              <a
                href={links.support}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-jade-accent/25 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-jade-accent/70 transition-colors hover:border-jade-accent/60 hover:text-jade-accent"
              >
                <Heart size={12} />
                Support this page
              </a>
            )}
          </div>

          <p className="text-[11px] font-mono text-gray-600">
            {links.discord.replace(/^https?:\/\//, '')}
          </p>
        </div>
      </footer>
    </div>
  );
}
