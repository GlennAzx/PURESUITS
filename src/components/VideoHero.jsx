import React, { useRef, useState, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Link2,
  X,
  ChevronDown,
} from 'lucide-react';
import { media, MEDIA } from '../lib/media';

// Resolved through media(), so the hero follows VITE_MEDIA_BASE: the R2 bucket
// when it is set, this origin when it is not. See src/lib/media.js.
const DEFAULT_SRC = media(MEDIA.heroVideo);
const DEFAULT_POSTER = media(MEDIA.heroPoster);

// The "custom video URL" control is a build-time preview tool, not a visitor
// feature. `import.meta.env.DEV` is true under `npm run dev` and false in
// `vite build`, so the button, the dialog and their strings are absent from the
// deployed bundle. To change the hero for real, upload a new file to R2:
//   node scripts/upload-media.mjs ./media/hero hero
// and update MEDIA.heroVideo in src/lib/media.js if the filename changes.
const SHOW_STUDIO = import.meta.env.DEV;

export default function VideoHero() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const contentRef = useRef(null);
  const dialogRef = useRef(null);
  // True when the reader paused with the button. Scrolling must not undo that.
  const userPausedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoSrc, setVideoSrc] = useState(DEFAULT_SRC);
  const [videoFailed, setVideoFailed] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [scrolled, setScrolled] = useState(false);

  // The scroll cue fades once the hero starts to leave. Passive listener, removed
  // on unmount, so a route change does not leave a stray handler on window.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Stop decoding the video the moment the reader scrolls away.
  //
  // It is a 1920x1280 file. Left running, the browser keeps decoding and
  // compositing it under every other section, and that competes with the dice
  // cursor, the overlay and the scroll itself for the same frame budget. The hero
  // is graded to 60-80% black, so a frozen frame behind it is not noticeable.
  //
  // Hysteresis: pause past PAUSE_AT, resume only when back near the top, so a
  // wobble around one pixel value cannot flap play/pause. A pause the reader
  // chose with the button is never undone by scrolling back.
  useEffect(() => {
    const PAUSE_AT = 40;
    const RESUME_AT = 10;
    let pausedByScroll = false;

    const onScroll = () => {
      const v = videoRef.current;
      if (!v) return;
      const y = window.scrollY;

      if (y > PAUSE_AT && !v.paused) {
        pausedByScroll = true;
        v.pause();
      } else if (y <= RESUME_AT && pausedByScroll && !userPausedRef.current) {
        pausedByScroll = false;
        v.play().catch(() => {});
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPausedRef.current = false;
      v.play().catch(() => setVideoFailed(true));
      setIsPlaying(true);
    } else {
      userPausedRef.current = true;
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const applyUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setVideoFailed(false);
    setVideoSrc(trimmed);
    setShowDialog(false);
    setUrlInput('');
  }, [urlInput]);

  // Both video <source> and poster remount when src changes
  const videoKey = videoSrc;

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      // Entering elements use ease-out (Emil rule)
      const tl = gsap.timeline({
        defaults: { duration: 0.7, ease: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      });

      tl.from('.hero-badge', { opacity: 0, scale: 0.95, duration: 0.5 })
        .from('.hero-title', { opacity: 0, y: 30, scale: 0.97 }, '-=0.4')
        .from('.hero-subtitle', { opacity: 0, y: 20 }, '-=0.45')
        .from('.hero-controls', { opacity: 0, x: -20, duration: 0.4 }, '-=0.3');

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!reduce) {
        // Parallax. Video is oversized to 120% so movement never exposes edges.
        gsap.to(videoRef.current, {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });

        gsap.to(contentRef.current, {
          opacity: 0,
          y: -50,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'center center',
            end: 'bottom top',
            scrub: true,
          },
        });
      }
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-ink-black"
    >
      {/* Procedural fallback — always behind the video, shows if the video fails */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(120% 90% at 20% 20%, #12291e 0%, #0b1410 45%, #0b0c10 100%), radial-gradient(80% 60% at 80% 80%, #1c2b1a 0%, transparent 70%)',
        }}
      />

      {!videoFailed && (
        <video
          key={videoKey}
          ref={videoRef}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
          poster={videoSrc === DEFAULT_SRC ? DEFAULT_POSTER : undefined}
          onError={() => setVideoFailed(true)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="absolute inset-0 w-full h-[118%] -top-[9%] object-cover z-0 will-change-transform"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Dark silk grading */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-black via-ink-black/60 to-ink-black/80 z-10" />

      {/* Hero content */}
      <div
        ref={contentRef}
        className="relative z-20 text-center max-w-4xl px-4 will-change-transform"
      >
        {/* Where Winds Meet mark. Swap this SVG for the official logo asset
            when you have it — keep the height and the class names. */}
        <div className="hero-badge mb-10 flex flex-col items-center gap-3">
          <svg
            width="46"
            height="26"
            viewBox="0 0 46 26"
            fill="none"
            aria-hidden="true"
            className="text-imperial-gold/70"
          >
            <path
              d="M2 6h22a5.5 5.5 0 1 0-5.5-5.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M2 12h31a5.5 5.5 0 1 1-5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M2 18h15"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.42em] text-imperial-gold/70">
            Where Winds Meet
          </span>
        </div>

        <h1 className="hero-title text-6xl sm:text-7xl md:text-8xl font-serif font-black text-ivory tracking-[0.08em] mb-8 drop-shadow-lg">
          PURESUIT
        </h1>

        <p className="hero-subtitle text-sm sm:text-base text-gray-400 max-w-md mx-auto leading-relaxed">
          A chill Mahjong guild. Weekly runs, relaxed tables, no pressure.
        </p>
      </div>

      {/* Controls dock */}
      <div className="hero-controls absolute bottom-10 left-8 z-30 flex items-center gap-1 bg-ink-charcoal/80 border border-imperial-gold/20 p-2 rounded-lg backdrop-blur">
        <button
          type="button"
          onClick={togglePlay}
          className="btn-press p-1.5 text-gray-400 hover:text-imperial-gold transition-colors duration-150 ease-out-strong rounded"
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause background video' : 'Play background video'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="btn-press p-1.5 text-gray-400 hover:text-imperial-gold transition-colors duration-150 ease-out-strong rounded"
          title={isMuted ? 'Unmute' : 'Mute'}
          aria-label={isMuted ? 'Unmute background video' : 'Mute background video'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        {SHOW_STUDIO && (
          <>
            <span className="w-px h-5 bg-imperial-gold/20 mx-1" />
            <button
              type="button"
              onClick={() => setShowDialog(true)}
              className="btn-press p-1.5 text-gray-400 hover:text-imperial-gold transition-colors duration-150 ease-out-strong rounded"
              title="Use a custom video URL"
              aria-label="Use a custom video URL"
            >
              <Link2 size={16} />
            </button>
          </>
        )}
      </div>

      {/* Scroll cue — fades out once the hero leaves. Decorative only. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-ivory/50 transition-opacity duration-[400ms] ease-out-strong ${
          scrolled ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <ChevronDown size={20} className="motion-safe:animate-bounce" />
        <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
      </div>

      {videoFailed && (
        <p className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 text-[11px] text-gray-400 font-mono">
          Video unavailable — using ambient fallback
        </p>
      )}

      {/* Custom URL dialog */}
      {SHOW_STUDIO && showDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-black/80 backdrop-blur-sm px-4">
          <div
            ref={dialogRef}
            className="w-full max-w-md bg-ink-charcoal border border-imperial-gold/30 rounded-xl p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-ivory">
                  Custom Hero Footage
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Paste a direct .mp4 or .webm URL.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="btn-press p-1 text-gray-400 hover:text-imperial-gold transition-colors duration-150 ease-out-strong"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <input
              autoFocus
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
              placeholder="https://example.com/footage.mp4"
              className="w-full bg-ink-black border border-gray-700 rounded p-2.5 text-sm text-ivory outline-none transition-[border-color] duration-200 ease-out-strong focus:border-imperial-gold mb-4"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyUrl}
                className="btn-press flex-1 py-2.5 rounded bg-imperial-gold text-ink-black font-serif font-bold text-sm hover:bg-imperial-gold-bright transition-[background-color] duration-200 ease-out-strong"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => {
                  setVideoSrc(DEFAULT_SRC);
                  setVideoFailed(false);
                  setShowDialog(false);
                }}
                className="btn-press px-4 py-2.5 rounded border border-imperial-gold/30 text-imperial-gold font-semibold text-sm hover:border-imperial-gold transition-[border-color] duration-200 ease-out-strong"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
