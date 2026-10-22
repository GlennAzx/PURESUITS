import { useCallback, useEffect, useState } from 'react';

/**
 * Time zone preference: 'sgt' (UTC+8, guild time) or 'local' (the visitor's).
 *
 * Stored in localStorage so the choice survives a reload, and broadcast with a
 * window event so every card on the page updates at once — a toggle that only
 * changes the card you clicked is worse than no toggle.
 *
 * Default is 'sgt'. The guild organises in SGT; a visitor who has not chosen
 * should see the time the officers quote, not a conversion they did not ask
 * for.
 */

const KEY = 'puresuit.timeMode';
const EVENT = 'puresuit:timemode';

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'local' ? 'local' : 'sgt';
  } catch {
    return 'sgt';
  }
}

export function setTimeMode(mode) {
  const next = mode === 'local' ? 'local' : 'sgt';
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode — the preference just does not persist */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
}

/** Current mode, kept in sync across every component that reads it. */
export default function useTimeMode() {
  const [mode, setMode] = useState(read);

  useEffect(() => {
    const onLocal = () => setMode(read());
    const onCustom = (e) => setMode(e.detail === 'local' ? 'local' : 'sgt');
    window.addEventListener('storage', onLocal); // another tab
    window.addEventListener(EVENT, onCustom); // this tab
    return () => {
      window.removeEventListener('storage', onLocal);
      window.removeEventListener(EVENT, onCustom);
    };
  }, []);

  const toggle = useCallback(() => {
    setTimeMode(mode === 'sgt' ? 'local' : 'sgt');
  }, [mode]);

  return [mode, toggle];
}
