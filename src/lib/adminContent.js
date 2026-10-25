import { useCallback, useEffect, useRef } from 'react';

/**
 * Shared plumbing for the admin panel, which more than one person uses.
 *
 * Every save replaces a whole section of one JSON file, so a save built from an
 * older copy would silently undo whatever the other admin did. The Worker
 * exposes a `rev` counter and rejects a save whose `If-Match` does not match it.
 * That is optimistic concurrency: no locks, no queue, and the loser is told
 * instead of overwritten.
 *
 * Polling is for freshness only: it lets a panel notice someone else's change
 * before the next save, rather than after losing it.
 */

/** A save was refused because the content moved on. Carries the server's rev. */
export class StaleError extends Error {
  constructor(info = {}) {
    super(info.message || 'Another admin saved a change first.');
    this.name = 'StaleError';
    this.rev = info.rev;
    this.updatedAt = info.updatedAt;
  }
}

export async function loadContent() {
  const res = await fetch('/api/content', { cache: 'no-store' });
  if (!res.ok) throw new Error(`could not load content (${res.status})`);
  return res.json();
}

/**
 * PUT a section, guarded by the revision it was built from.
 *
 * @param {string} path e.g. '/api/images'
 * @param {object} payload
 * @param {{token: string, rev: number}} opts
 */
export async function saveSection(path, payload, { token, rev }) {
  const res = await fetch(path, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'If-Match': String(rev ?? 0),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 409) throw new StaleError(data);
  if (!res.ok) throw new Error(data.error || `save failed (${res.status})`);
  return data;
}

/**
 * Watch for other admins' saves.
 *
 * Checks on an interval, when the tab regains focus, and when it becomes
 * visible. Never fires while the tab is hidden, so a background tab costs
 * nothing.
 *
 * @param {{revRef: {current: number}, onNewer: (content: object) => void, intervalMs?: number}} opts
 */
export function useContentWatch({ revRef, onNewer, intervalMs = 20000 }) {
  const cb = useRef(onNewer);
  cb.current = onNewer;

  useEffect(() => {
    let stopped = false;

    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const content = await loadContent();
        if (stopped) return;
        if (Number(content.rev || 0) > Number(revRef.current || 0)) cb.current(content);
      } catch {
        /* a failed poll is not worth interrupting anyone over */
      }
    };

    const id = setInterval(check, intervalMs);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      stopped = true;
      clearInterval(id);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [intervalMs, revRef]);
}
