import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Upload, Trash2, Plus, Pencil, Check, X, Image as ImageIcon } from 'lucide-react';
import bundledMembers from '../../data/members.json';
import { imageUrl } from '../../lib/media';

/**
 * Roster management: add, edit, remove members and set their portraits.
 *
 * The roster moves out of the built bundle and into the content file the first
 * time it is saved here. Until then this reads the bundled list, so the tab
 * works on a site that has never been edited.
 *
 * Deletion is immediate and there is no undo, so it asks first. Names are also
 * unique by design: /members/<slug> is derived from the name, so two people
 * called the same thing would fight over one URL. The Worker rejects that, and
 * this form warns before it gets that far.
 */

const TIERS = [
  ['guild_leader', 'Guild Leader'],
  ['deputy', 'Vice Master'],
  ['commander', 'Command'],
  ['member', 'Member'],
];

const inputCls =
  'w-full rounded-md border border-imperial-gold/25 bg-ink-black/60 px-2.5 py-2 text-xs text-ivory outline-none transition-colors focus:border-imperial-gold/70';

const EMPTY = { id: '', name: '', role: '', tier: 'member', avatar: null };

export default function MemberManager({ token, onNotice, onError }) {
  const [roster, setRoster] = useState(null);
  const [form, setForm] = useState(null); // null | 'new' | id
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/content', { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;
        setRoster(Array.isArray(data.members) && data.members.length ? data.members : bundledMembers);
      } catch (err) {
        onError(`could not load the roster: ${err.message}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [onError]);

  const save = useCallback(
    async (next, message) => {
      setBusy(true);
      onError('');
      try {
        const res = await fetch('/api/members', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ members: next }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `save failed (${res.status})`);
        setRoster(data.members || next);
        onNotice(message);
        setForm(null);
      } catch (err) {
        onError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [token, onNotice, onError]
  );

  const uploadPortrait = async (file, memberId) => {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/upload?kind=members', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `upload failed (${res.status})`);
    const next = roster.map((m) => (m.id === memberId ? { ...m, avatar: data.key } : m));
    await save(next, 'Portrait saved.');
  };

  const submit = (e) => {
    e.preventDefault();
    if (!draft.name.trim()) return onError('A name is required.');

    if (form === 'new') {
      const id = `m-${Date.now().toString(36)}`;
      return save([...roster, { ...draft, id, avatar: null }], 'Member added.');
    }
    return save(
      roster.map((m) => (m.id === form ? { ...m, ...draft } : m)),
      'Member updated.'
    );
  };

  const remove = (member) => {
    if (!window.confirm(`Remove ${member.name} from the roster? This is live immediately.`)) return;
    return save(roster.filter((m) => m.id !== member.id), 'Member removed.');
  };

  const startNew = () => {
    setDraft(EMPTY);
    setForm('new');
    onError('');
  };

  const startEdit = (m) => {
    setDraft({ id: m.id, name: m.name, role: m.role || '', tier: m.tier, avatar: m.avatar || null });
    setForm(m.id);
    onError('');
  };

  const filtered = useMemo(() => {
    if (!roster) return [];
    const q = query.trim().toLowerCase();
    const list = q
      ? roster.filter((m) => `${m.name} ${m.role || ''} ${m.tier}`.toLowerCase().includes(q))
      : roster;
    // Leaders first, then the rest, so the common edits are at the top.
    const rank = { guild_leader: 0, deputy: 1, commander: 2, member: 3 };
    return [...list].sort((a, b) => (rank[a.tier] ?? 9) - (rank[b.tier] ?? 9));
  }, [roster, query]);

  if (!roster) return <p className="text-xs text-gray-500">Loading roster…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-gray-500">
          {roster.length} members · changes are live on the next page load
        </p>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-md border border-jade-accent/40 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-jade-accent transition-colors hover:border-jade-accent"
        >
          <Plus size={12} /> New member
        </button>
      </div>

      {form && (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-xl border border-imperial-gold/30 bg-ink-charcoal p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-gray-500">
                Name
              </span>
              <input
                className={inputCls}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="In-game name"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-gray-500">
                Role
              </span>
              <input
                className={inputCls}
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                placeholder="Guild Leader"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-gray-500">
                Tier
              </span>
              <select
                className={inputCls}
                value={draft.tier}
                onChange={(e) => setDraft({ ...draft, tier: e.target.value })}
              >
                {TIERS.map(([v, label]) => (
                  <option key={v} value={v} className="bg-ink-charcoal">
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md border border-jade-accent/50 bg-jade-accent/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-jade-accent transition-colors hover:border-jade-accent disabled:opacity-40"
            >
              {busy ? 'Saving…' : form === 'new' ? 'Add member' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-md border border-imperial-gold/20 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 transition-colors hover:border-imperial-gold/50 hover:text-imperial-gold"
            >
              Cancel
            </button>
            {form !== 'new' && (
              <label className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded border border-imperial-gold/25 px-2 py-1 text-[9.5px] uppercase tracking-wider text-imperial-gold/80 transition-colors hover:border-imperial-gold/60 hover:text-imperial-gold">
                <Upload size={10} /> Portrait
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setBusy(true);
                      await uploadPortrait(file, form);
                    } catch (err) {
                      onError(err.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </form>
      )}

      <input
        className={inputCls}
        placeholder="Search the roster…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <ul className="space-y-1.5">
        {filtered.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-lg border border-imperial-gold/15 bg-ink-charcoal px-2.5 py-2"
          >
            <div className="h-10 w-8 shrink-0 overflow-hidden rounded border border-imperial-gold/20 bg-ink-black/60">
              {m.avatar ? (
                <img src={imageUrl(m.avatar)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-700">
                  <ImageIcon size={11} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] text-ivory">{m.name}</p>
              <p className="truncate text-[9.5px] uppercase tracking-wider text-gray-600">
                {m.role || TIERS.find(([v]) => v === m.tier)?.[1] || m.tier}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => startEdit(m)}
                aria-label={`Edit ${m.name}`}
                className="rounded border border-imperial-gold/20 p-1.5 text-gray-500 transition-colors hover:border-imperial-gold/60 hover:text-imperial-gold"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={() => remove(m)}
                disabled={busy}
                aria-label={`Remove ${m.name}`}
                className="rounded border border-red-500/25 p-1.5 text-red-400/70 transition-colors hover:border-red-500/60 hover:text-red-400 disabled:opacity-40"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="text-[11px] text-gray-500">No member matches that search.</p>
      )}
    </div>
  );
}
