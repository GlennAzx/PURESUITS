import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * Looping background music, with a mute control beside the nav panel.
 *
 * Two things make this more than an <audio loop> tag:
 *
 * 1. **Browsers refuse to autoplay audible media** until the visitor has
 *    interacted with the page. play() rejects, and an unhandled rejection is
 *    silent. So the first attempt is expected to fail: when it does, this waits
 *    for the first real gesture (pointer or key) and starts then.
 *
 * 2. **Muting pauses the element rather than setting volume to 0.** A muted
 *    but playing element still decodes audio and still holds the media
 *    pipeline, which drains battery for silence. Pausing actually stops it.
 *
 * The preference is remembered, so a visitor who mutes it does not hear it
 * again on the next page load.
 */

const MUTED_KEY = 'puresuit.bgm.muted';
const VOLUME = 0.32; // background music, not a foreground element

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
    // Declared before the async block: assigning it from inside would otherwise
    // touch a binding that is still in its temporal dead zone.
    let cleanupGesture = () => {};

    (async () => {
      const started = await tryPlay();
      if (cancelled) return;
      if (started) return;

      setBlocked(true);
      const onGesture = async () => {
        const ok = await tryPlay();
        if (ok) {
          setBlocked(false);
          remove();
        }
      };
      const remove = () => {
        window.removeEventListener('pointerdown', onGesture);
        window.removeEventListener('keydown', onGesture);
        window.removeEventListener('touchstart', onGesture);
      };
      window.addEventListener('pointerdown', onGesture);
      window.addEventListener('keydown', onGesture);
      window.addEventListener('touchstart', onGesture);

      cleanupGesture = remove;
    })();

    return () => {
      cancelled = true;
      cleanupGesture();
    };
  }, [muted, src, tryPlay]);

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

      {/* Sits under the nav fan: the fan reaches about 139px above and below
          the centre handle, so 168px clears it. */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!muted}
        aria-label={muted ? 'Unmute background music' : 'Mute background music'}
        title={
          muted
            ? blocked
              ? 'Background music is blocked until you click'
              : 'Background music is off'
            : 'Music on'
        }
        className="bgm-toggle btn-press fixed right-0 z-30 flex h-12 w-11 items-center justify-center rounded-l-xl border border-r-0 border-imperial-gold/50 bg-ink-charcoal text-imperial-gold shadow-[-8px_0_22px_rgba(0,0,0,0.7)] transition-[width,border-color,color,background-color] duration-200 ease-out-strong hover:w-14 hover:border-imperial-gold hover:bg-ink-charcoal hover:text-imperial-gold-bright"
        style={{ top: 'calc(50% + 168px)' }}
      >
        {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
    </>
  );
}
