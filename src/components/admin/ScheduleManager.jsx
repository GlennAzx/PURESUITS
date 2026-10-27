import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Check, X, RotateCcw } from 'lucide-react';

/**
 * Editor for the weekly schedule shown on the home page.
 *
 * The schedule lives in the same content JSON as the events, so this sends the
 * whole array to /api/schedule. That route does a read-modify-write and only
 * replaces `schedule`, which keeps events and links intact.
 *
 * Editing is local until Save: a half-typed time or an empty name should not
 * reach the live page.
 */

// Display order starts on Monday; the stored numbers follow Date.getUTCDay()
// where 0 is Sunday.
const DAYS = [
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
  [0, 'Sun'],
];

const inputClass =
  'w-full rounded-md border border-imperial-gold/25 bg-ink-black/60 px-2.5 py-2 text-xs text-ivory outline-none transition-colors focus:border-imperial-gold/70';

const pad = (n) => String(n).padStart(2, '0');

/** Stored {h,m} to the "HH:MM" an <input type="time"> wants. */
function timeText(value) {
  if (!value) return '21:00';
  if (typeof value === 'string') return value.slice(0, 5);
  return `${pad(Number(value.h) || 0)}:${pad(Number(value.m) || 0)}`;
}

/** "HH:MM" back to the stored shape. */
function timeValue(text) {
  const [h, m] = String(text || '21:00').split(':').map(Number);
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

function toEditable(item, index) {
  return {
    key: item.id || `schedule-${index}`,
    id: item.id || `schedule-${index}`,
    name: item.name || '',
    category: item.category || 'Event',
    cadence: item.cadence === 'daily' ? 'daily' : 'weekly',
    weekdays: Array.isArray(item.weekdays) ? [...item.weekdays] : [],
    time: timeText(item.time),
    durationMinutes: Number(item.durationMinutes) || 0,
    description: item.description || '',
    timeByWeekday: item.timeByWeekday,
  };
}

function toStored(entry) {
  const out = {
    id: entry.id,
    name: entry.name.trim(),
    category: entry.category.trim() || 'Event',
    cadence: entry.cadence,
    time: timeValue(entry.time),
    weekdays: entry.cadence === 'daily' ? [] : [...entry.weekdays].sort((a, b) => a - b),
    durationMinutes: Number(entry.durationMinutes) || 0,
    description: entry.description.trim(),
  };
  if (entry.timeByWeekday) out.timeByWeekday = entry.timeByWeekday;
  return out;
}

function summary(entry) {
  const when =
    entry.cadence === 'daily'
      ? 'Every day'
      : entry.weekdays.length
        ? entry.weekdays
            .slice()
            .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
            .map((d) => (DAYS.find(([n]) => n === d) || [, '?'])[1])
            .join(', ')
        : 'No day picked';
  const mins = Number(entry.durationMinutes) || 0;
  const length = mins >= 60 ? `${(mins / 60).toFixed(mins % 60 ? 1 : 0)} hr` : `${mins} min`;
  return `${when} · ${entry.time} · ${length}`;
}

export default function ScheduleManager({ token, onNotice, onError }) {
  const [entries, setEntries] = useState([]);
  const [rev, setRev] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    onError('');
    try {
      const res = await fetch('/api/content', { cache: 'no-store' });
      if (!res.ok) throw new Error(`could not load content (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data.schedule) ? data.schedule : [];
      setEntries(list.map(toEditable));
      setRev(data.rev ?? null);
      setDirty(false);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (index, patch) => {
    setEntries((list) => list.map((e, i) => (i === index ? { ...e, ...patch } : e)));
    setDirty(true);
  };

  const toggleDay = (index, day) => {
    setEntries((list) =>
      list.map((e, i) => {
        if (i !== index) return e;
        const has = e.weekdays.includes(day);
        return { ...e, weekdays: has ? e.weekdays.filter((d) => d !== day) : [...e.weekdays, day] };
      })
    );
    setDirty(true);
  };

  const addEntry = () => {
    setEntries((list) => [
      ...list,
      {
        key: `new-${Date.now()}`,
        id: `schedule-${Date.now()}`,
        name: '',
        category: 'Event',
        cadence: 'weekly',
        weekdays: [],
        time: '21:00',
        durationMinutes: 60,
        description: '',
      },
    ]);
    setDirty(true);
    onNotice('');
  };

  const removeEntry = (index) => {
    const name = entries[index]?.name || 'this entry';
    if (!window.confirm(`Remove "${name}" from the home page schedule?`)) return;
    setEntries((list) => list.filter((_, i) => i !== index));
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    onError('');
    onNotice('');
    try {
      // Catch the obvious mistakes before they hit the Worker.
      for (const [i, e] of entries.entries()) {
        if (!e.name.trim()) throw new Error(`Entry ${i + 1} needs a name.`);
        if (e.cadence === 'weekly' && e.weekdays.length === 0) {
          throw new Error(`"${e.name.trim()}" is weekly but has no day picked.`);
        }
      }

      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(rev != null ? { 'If-Match': String(rev) } : {}),
        },
        body: JSON.stringify({ schedule: entries.map(toStored) }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        onError(data.message || 'Another admin saved first. Reloaded their version.');
        await load();
        return;
      }
      if (!res.ok) throw new Error(data.error || `save failed (${res.status})`);

      setEntries((data.schedule || []).map(toEditable));
      setRev(data.rev ?? rev);
      setDirty(false);
      onNotice('Schedule saved. The home page is already showing it.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="py-8 text-center text-[11px] text-gray-500">Loading the schedule…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-bold text-ivory">Weekly schedule</h2>
          <p className="mt-0.5 text-[11px] text-gray-400">
            What the home page shows under “Weekly Schedule”. Times are guild time, UTC+8.
          </p>
        </div>
        <button
          type="button"
          onClick={addEntry}
          className="inline-flex items-center gap-1.5 rounded-md border border-jade-accent/40 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-jade-accent transition-colors hover:border-jade-accent"
        >
          <Plus size={12} /> Add event
        </button>
      </div>

      {entries.length === 0 && (
        <p className="rounded-lg border border-imperial-gold/15 bg-ink-charcoal/60 px-3 py-6 text-center text-[11px] text-gray-500">
          No scheduled events. The home page hides the block when this list is empty.
        </p>
      )}

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.key}
            className="rounded-xl border border-imperial-gold/20 bg-ink-charcoal/70 p-3 sm:p-4"
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_120px_130px]">
              <label className="block">
                <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-gray-500">
                  Name
                </span>
                <input
                  className={inputClass}
                  value={entry.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="Guild Party"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-gray-500">
                  Category
                </span>
                <input
                  className={inputClass}
                  value={entry.category}
                  onChange={(e) => update(index, { category: e.target.value })}
                  placeholder="Social"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-gray-500">
                  Repeats
                </span>
                <select
                  className={inputClass}
                  value={entry.cadence}
                  onChange={(e) => update(index, { cadence: e.target.value })}
                >
                  <option value="daily">Every day</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_110px_110px]">
              <div>
                <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-gray-500">
                  {entry.cadence === 'daily' ? 'Days' : 'Days it runs'}
                </span>
                {entry.cadence === 'daily' ? (
                  <p className="py-2 text-[11px] text-gray-500">Every day, no day to pick.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {DAYS.map(([day, label]) => {
                      const on = entry.weekdays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(index, day)}
                          aria-pressed={on}
                          className={`rounded-md border px-2 py-1.5 text-[10px] uppercase tracking-wider transition-colors ${
                            on
                              ? 'border-jade-accent/60 bg-jade-accent/15 text-jade-accent'
                              : 'border-imperial-gold/20 text-gray-500 hover:border-imperial-gold/50'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="block">
                <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-gray-500">
                  Starts
                </span>
                <input
                  type="time"
                  className={inputClass}
                  value={entry.time}
                  onChange={(e) => update(index, { time: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-gray-500">
                  Minutes
                </span>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  step="5"
                  className={inputClass}
                  value={entry.durationMinutes}
                  onChange={(e) => update(index, { durationMinutes: e.target.value })}
                />
              </label>
            </div>

            <label className="mt-2 block">
              <span className="mb-1 block text-[9.5px] uppercase tracking-[0.14em] text-gray-500">
                Description
              </span>
              <textarea
                rows={2}
                className={inputClass}
                value={entry.description}
                onChange={(e) => update(index, { description: e.target.value })}
                placeholder="What happens in this run, and who it is for."
              />
            </label>

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[10.5px] text-gray-500">{summary(entry)}</p>
              <button
                type="button"
                onClick={() => removeEntry(index)}
                className="inline-flex items-center gap-1 rounded-md border border-red-500/25 px-2 py-1 text-[10px] uppercase tracking-wider text-red-400/80 transition-colors hover:border-red-500/60 hover:text-red-400"
              >
                <Trash2 size={11} /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-2 border-t border-imperial-gold/20 bg-ink-black/80 py-3 backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="inline-flex items-center gap-1.5 rounded-md border border-jade-accent/50 bg-jade-accent/10 px-3 py-2 text-[10px] uppercase tracking-wider text-jade-accent transition-colors hover:border-jade-accent disabled:opacity-40"
        >
          <Check size={12} /> {busy ? 'Saving…' : 'Save schedule'}
        </button>
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md border border-imperial-gold/20 px-3 py-2 text-[10px] uppercase tracking-wider text-gray-400 transition-colors hover:border-imperial-gold/50 hover:text-imperial-gold disabled:opacity-40"
        >
          <RotateCcw size={12} /> {dirty ? 'Discard changes' : 'Reload'}
        </button>
        <span className="text-[10.5px] text-gray-500">
          {dirty ? (
            <span className="inline-flex items-center gap-1 text-imperial-gold/90">
              <X size={11} /> Unsaved changes
            </span>
          ) : (
            'Saved. The home page reads this list directly.'
          )}
        </span>
      </div>
    </div>
  );
}
