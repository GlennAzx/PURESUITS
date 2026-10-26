import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, Pencil, Plus, LogOut, Check, X } from 'lucide-react';
import ImageManager from '../components/admin/ImageManager';
import MemberManager from '../components/admin/MemberManager';
import FeaturedManager from '../components/admin/FeaturedManager';

/**
 * Admin page for editing events on the live site.
 *
 * There is no account system. The page asks for the admin token, keeps it in
 * localStorage, and sends it with each write. The token is a Worker secret and
 * is never part of the bundle, so viewing the source reveals nothing.
 *
 * Every action saves immediately. A "Save" button that can be forgotten is a
 * worse failure mode than one extra request per edit, and the events list is a
 * few kilobytes.
 */

const TOKEN_KEY = 'puresuit.admin.token';

const EMPTY_FORM = {
  id: '',
  title: '',
  date: '',
  time: '21:00',
  durationMinutes: 120,
  location: '',
  tag: 'Event',
  description: '',
  link: '',
};

/** Local date parts, so the default date is "today" for the editor. */
function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-gray-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-ivory-shadow">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border border-imperial-gold/25 bg-ink-black/60 px-2.5 py-2 text-xs text-ivory outline-none transition-colors focus:border-imperial-gold/70';

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | event id
  const [form, setForm] = useState(EMPTY_FORM);

  // Keep the admin page out of search results, and out of any crawler that
  // ignores robots.txt.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const loadContent = useCallback(async (authToken) => {
    const res = await fetch('/api/content', { cache: 'no-store' });
    if (!res.ok) throw new Error(`could not load content (${res.status})`);
    const data = await res.json();
    setEvents(Array.isArray(data.events) ? data.events : []);
    return authToken;
  }, []);

  const checkToken = useCallback(
    async (candidate) => {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { Authorization: `Bearer ${candidate}` },
      });
      return res.ok;
    },
    []
  );

  // On first mount, silently validate a stored token so a returning editor is
  // not asked again.
  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        if (await checkToken(token)) {
          if (!alive) return;
          await loadContent(token);
          if (alive) setUnlocked(true);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          if (alive) setToken('');
        }
      } catch {
        // A network failure should not wipe a good token.
      }
    })();
    return () => {
      alive = false;
    };
  }, [checkToken, loadContent, token]);

  const unlock = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!(await checkToken(token))) {
        setError('That token was rejected.');
        return;
      }
      localStorage.setItem(TOKEN_KEY, token);
      await loadContent(token);
      setUnlocked(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUnlocked(false);
    setEditing(null);
  };

  /** Send the whole array and adopt the server's answer. */
  const save = async (nextEvents, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: nextEvents }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `save failed (${res.status})`);
      setEvents(data.events || nextEvents);
      setNotice(message);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitForm = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required.');
    if (!form.date) return setError('Date is required.');

    const clean = {
      ...form,
      id: form.id || `event-${Date.now()}`,
      durationMinutes: Number(form.durationMinutes) || 120,
    };

    const exists = events.some((ev) => ev.id === clean.id);
    const next = exists
      ? events.map((ev) => (ev.id === clean.id ? clean : ev))
      : [...events, clean];

    return save(next, exists ? 'Event updated.' : 'Event added.');
  };

  const remove = (event) => {
    if (!window.confirm(`Delete "${event.title}"? This is live immediately.`)) return;
    return save(
      events.filter((ev) => ev.id !== event.id),
      'Event deleted.'
    );
  };

  const startEdit = (event) => {
    setEditing(event.id);
    setForm({
      id: event.id,
      title: event.title || '',
      date: event.date || '',
      time: event.time || '21:00',
      durationMinutes: event.durationMinutes || 120,
      location: event.location || '',
      tag: event.tag || 'Event',
      description: event.description || '',
      link: event.link || '',
    });
    setError('');
    setNotice('');
  };

  const startNew = () => {
    setEditing('new');
    setForm({ ...EMPTY_FORM, date: todayISO() });
    setError('');
    setNotice('');
  };

  const sorted = useMemo(
    () => [...events].sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [events]
  );

  if (!unlocked) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
        <h1 className="mb-1 font-serif text-2xl font-bold text-ivory">Admin</h1>
        <p className="mb-6 text-xs text-gray-400">
          Paste the admin token to manage events on the live site.
        </p>
        <form onSubmit={unlock} className="space-y-3">
          <input
            type="password"
            autoFocus
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token"
            className={inputClass}
            aria-label="Admin token"
          />
          <button
            type="submit"
            disabled={busy || !token}
            className="w-full rounded-md border border-imperial-gold/40 bg-ink-charcoal py-2 text-[11px] uppercase tracking-[0.16em] text-imperial-gold transition-colors hover:border-imperial-gold disabled:opacity-40"
          >
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </form>
        {error && <p className="mt-3 text-[11px] text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-imperial-gold/25 pb-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ivory">Site admin</h1>
          <p className="mt-1 text-xs text-gray-400">
            Changes are live immediately. No build, no deploy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'events' && (
            <button
              type="button"
              onClick={startNew}
              className="inline-flex items-center gap-1.5 rounded-md border border-jade-accent/40 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-jade-accent transition-colors hover:border-jade-accent"
            >
              <Plus size={12} /> New event
            </button>
          )}
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-md border border-imperial-gold/20 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 transition-colors hover:border-imperial-gold/50 hover:text-imperial-gold"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>

      {notice && (
        <p className="mb-4 flex items-center gap-1.5 text-[11px] text-jade-accent">
          <Check size={12} /> {notice}
        </p>
      )}
      {error && (
        <p className="mb-4 flex items-center gap-1.5 text-[11px] text-red-400">
          <X size={12} /> {error}
        </p>
      )}

      <div className="mb-6 flex gap-1.5 border-b border-imperial-gold/15 pb-3">
        {[
          ['events', 'Events'],
          ['members', 'Members'],
          ['images', 'Gallery'],
          ['home', 'Home'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setNotice('');
              setError('');
            }}
            aria-pressed={tab === id}
            className={`rounded-md px-3 py-1.5 text-[10px] uppercase tracking-wider transition-colors ${
              tab === id
                ? 'bg-imperial-gold/15 text-imperial-gold'
                : 'text-gray-500 hover:text-ivory'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <MemberManager token={token} onNotice={setNotice} onError={setError} />
      )}

      {tab === 'images' && (
        <ImageManager token={token} onNotice={setNotice} onError={setError} />
      )}

      {tab === 'home' && (
        <FeaturedManager token={token} onNotice={setNotice} onError={setError} />
      )}

      {tab === 'events' && editing && (
        <form
          onSubmit={submitForm}
          className="mb-8 space-y-3 rounded-xl border border-imperial-gold/30 bg-ink-charcoal p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Title">
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Mahjong Night"
                />
              </Field>
            </div>
            <Field label="Date" hint="Guild time, UTC+8">
              <input
                type="date"
                className={inputClass}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Start time" hint="Guild time, UTC+8">
              <input
                type="time"
                className={inputClass}
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </Field>
            <Field label="Duration (minutes)">
              <input
                type="number"
                min="1"
                max="1440"
                className={inputClass}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: e.target.value })
                }
              />
            </Field>
            <Field label="Tag" hint="Small label on the card">
              <input
                className={inputClass}
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                placeholder="Mahjong"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Location (optional)">
                <input
                  className={inputClass}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Guild Hall, East Wing"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description (optional)">
                <textarea
                  rows={2}
                  className={inputClass}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Details link (optional)" hint="Must start with https://">
                <input
                  className={inputClass}
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://discord.gg/…"
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md border border-jade-accent/50 bg-jade-accent/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-jade-accent transition-colors hover:border-jade-accent disabled:opacity-40"
            >
              {busy ? 'Saving…' : editing === 'new' ? 'Add event' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(EMPTY_FORM);
              }}
              className="rounded-md border border-imperial-gold/20 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 transition-colors hover:border-imperial-gold/50 hover:text-imperial-gold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {tab === 'events' && (sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-imperial-gold/20 px-4 py-8 text-center text-[11.5px] text-ivory-shadow">
          No events yet. Use New event to add one.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-imperial-gold/20 bg-ink-charcoal px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-ivory">{ev.title}</p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400">
                  {ev.date} {ev.time} · {ev.durationMinutes}m
                  {ev.location ? ` · ${ev.location}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => startEdit(ev)}
                  aria-label={`Edit ${ev.title}`}
                  className="rounded border border-imperial-gold/20 p-1.5 text-gray-400 transition-colors hover:border-imperial-gold/60 hover:text-imperial-gold"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(ev)}
                  disabled={busy}
                  aria-label={`Delete ${ev.title}`}
                  className="rounded border border-red-500/25 p-1.5 text-red-400/70 transition-colors hover:border-red-500/60 hover:text-red-400 disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
