import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * Looping background music, with a mute control that sits in the top-right
 * cluster beside the Discord link.
 *
 * Four behaviours worth knowing:
 *
 * 1. **Browsers refuse to autoplay audible media** until the visitor has
 *    interacted with the page. play() rejects, and an unhandled rejection is
 *    silent. So the first attempt is expected to fail: when it does, this waits
 *    for the first real gesture (pointer or key) and starts then.
 *
 * 2. **Muting pauses the element rather than setting volume to 0.** A muted but
 *    playing element still decodes audio and still holds the media pipeline.
 *
 * 3. **It announces itself once.** When playback begins the button plays a short
 *    attention pulse, because otherwise a visitor hears music and cannot tell
 *    where it comes from. The pulse runs once per play, not on a loop, and is
 *    skipped when the visitor asked for reduced motion.
 *
 * 4. **The level is low on purpose.** A visitor who did not ask for music should
 *    meet it as atmosphere, not as a hit of sound on arrival.
 */

const MUTED_KEY = 'puresuit.bgm.muted';
const VOLUME = 0.18;
const NUDGE_MS = 2600;

export default function BgmPlayer({ src }) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(() => {
    // Default to playing. Only an explicit previous choice mutes it.
    try {
      return localStorage.getItem(MUTED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [playing, setPlaying] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const persist = useCallback((next) => {
    try {
      localStorage.setItem(MUTED_KEY, next ? '1' : '0');
    } catch {
      // Private mode: the preference simply does not persist.
    }
  }, []);

  /** Try to start playback. Returns true when it actually started. */
  const tryPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;
    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }, []);

  // Start on mount, then again on the first gesture if the browser blocked it.
  useEffect(() => {
    if (!src || muted) return undefined;
    const audio = audioRef.current;
    if (!audio) return undefined;

    audio.volume = VOLUME;
    let cancelled = false;
    let cleanupGesture = () => {};

    (async () => {
      const started = await tryPlay();
      if (cancelled) return;
      if (started) return;

      setBlocked(true);
      const onGesture = async () => {
        if (await tryPlay()) {
          setBlocked(false);
          cleanupGesture();
        }
      };
      window.addEventListener('pointerdown', onGesture);
      window.addEventListener('keydown', onGesture);
      window.addEventListener('touchstart', onGesture);
      cleanupGesture = () => {
        window.removeEventListener('pointerdown', onGesture);
        window.removeEventListener('keydown', onGesture);
        window.removeEventListener('touchstart', onGesture);
      };
    })();

    return () => {
      cancelled = true;
      cleanupGesture();
    };
  }, [muted, src, tryPlay]);

  // Track real playback state from the element, not from our own intent: the
  // browser can refuse play(), and a media session can pause us externally.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  // One short attention pulse each time playback begins.
  useEffect(() => {
    if (!playing) return undefined;
    let reduce = false;
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      reduce = false;
    }
    if (reduce) return undefined;

    setNudge(true);
    const id = setTimeout(() => setNudge(false), NUDGE_MS);
    return () => clearTimeout(id);
  }, [playing]);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    persist(next);
    const audio = audioRef.current;
    if (!audio) return;
    if (next) {
      audio.pause();
    } else {
      audio.volume = VOLUME;
      // This click is the gesture, so play() is allowed here.
      audio.play().catch(() => setBlocked(true));
      setBlocked(false);
    }
  };

  if (!src) return null;

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="none" aria-hidden="true" />

      <button
        type="button"
        onClick={toggle}
        aria-pressed={!muted}
        aria-label={
          muted ? 'Unmute background music' : 'Mute background music'
        }
        title={
          muted
            ? blocked
              ? 'Music is waiting for a click'
              : 'Music is off'
            : 'Music is playing — mute'
        }
        data-nudge={nudge ? 'on' : undefined}
        data-playing={playing ? 'on' : undefined}
        className="bgm-toggle btn-press inline-flex h-8 items-center gap-1.5 rounded-full border border-imperial-gold/25 bg-ink-black/55 px-2.5 text-imperial-gold/75 backdrop-blur-md transition-[border-color,color,background-color] duration-200 ease-out-strong hover:border-imperial-gold/60 hover:bg-ink-black/75 hover:text-imperial-gold"
      >
        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}

        {/* Three bars that move only while audio is actually playing. This is
            the quiet, continuous signal; the pulse above is the one-shot one. */}
        {playing && !muted ? (
          <span className="bgm-bars flex h-3 items-end gap-[2px]" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]">
            {muted ? 'Off' : 'Music'}
          </span>
        )}
      </button>
    </>
  );
}
