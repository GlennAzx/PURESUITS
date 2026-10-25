import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Trash2, Plus, Pencil, GripVertical, Image as ImageIcon, RefreshCw, AlertTriangle } from 'lucide-react';
import bundledMembers from '../../data/members.json';
import PortraitCropper from './PortraitCropper';
import { loadContent, saveSection, StaleError, useContentWatch } from '../../lib/adminContent';
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

/**
 * Display groups, in the order the Members page renders them. The roster array
 * is stored in this same order, so a drag here is the order visitors see.
 * A drag cannot cross a group: membership is a tier, and promoting someone is
 * the Tier select, not a side effect of dropping them in another list.
 */
const GROUPS = [
  { key: 'leadership', label: 'Leadership', tiers: ['guild_leader', 'deputy'] },
  { key: 'command', label: 'Command', tiers: ['commander'] },
  { key: 'members', label: 'Members', tiers: ['member'] },
];

const groupOf = (tier) => GROUPS.find((g) => g.tiers.includes(tier)) || GROUPS[2];

export default function MemberManager({ token, onNotice, onError }) {
  const [roster, setRoster] = useState(null);
  const [form, setForm] = useState(null); // null | 'new' | id
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  // The picked file waits here while the crop step is open.
  const [crop, setCrop] = useState(null);
  // Reorder state. The ref mirrors the roster so pointerup can save the array
  // that the last drag produced, without waiting for React to flush.
  const [dragging, setDragging] = useState(null);
  const rosterRef = useRef(null);
  const dragRef = useRef(null);
  const revRef = useRef(0);
  const [stale, setStale] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await loadContent();
        if (!alive) return;
        const loaded =
          Array.isArray(data.members) && data.members.length ? data.members : bundledMembers;
        rosterRef.current = loaded;
        revRef.current = Number(data.rev || 0);
        setRoster(loaded);
      } catch (err) {
        onError(`could not load the roster: ${err.message}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [onError]);

  const reload = useCallback(async () => {
    try {
      const data = await loadContent();
      const loaded =
        Array.isArray(data.members) && data.members.length ? data.members : bundledMembers;
      rosterRef.current = loaded;
      revRef.current = Number(data.rev || 0);
      setRoster(loaded);
      setStale(null);
      onNotice('Reloaded the latest version.');
    } catch (err) {
      onError(err.message);
    }
  }, [onNotice, onError]);

  // Someone else's save shows up here before the next save would undo it.
  useContentWatch({
    revRef,
    onNewer: (content) => {
      if (Number(content.rev || 0) > revRef.current) {
        setStale({
          rev: Number(content.rev || 0),
          updatedAt: content.updatedAt,
          reason: 'changed',
        });
      }
    },
  });

  const save = useCallback(
    async (next, message) => {
      setBusy(true);
      onError('');
      try {
        const data = await saveSection('/api/members', { members: next }, {
          token,
          rev: revRef.current,
        });
        revRef.current = Number(data.rev || revRef.current);
        rosterRef.current = data.members || next;
        setRoster(data.members || next);
        setStale(null);
        onNotice(message);
        setForm(null);
      } catch (err) {
        if (err instanceof StaleError) {
          setStale({ rev: err.rev, updatedAt: err.updatedAt, reason: 'conflict' });
        } else {
          onError(err.message);
        }
      } finally {
        setBusy(false);
      }
    },
    [token, onNotice, onError]
  );

  const uploadPortrait = async (blob, memberId) => {
    const body = new FormData();
    body.append('file', blob, 'portrait.jpg');
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

  /**
   * Move a member to another position inside its own group.
   *
   * The roster is rebuilt group by group so the stored array keeps the same
   * order the Members page renders, which is what makes the drag stick.
   */
  const moveWithin = useCallback((groupKey, id, toIndex) => {
    setRoster((prev) => {
      if (!prev) return prev;
      const { tiers } = GROUPS.find((g) => g.key === groupKey);
      const rows = prev.filter((m) => tiers.includes(m.tier));
      const from = rows.findIndex((m) => m.id === id);
      if (from < 0 || toIndex < 0 || toIndex >= rows.length || from === toIndex) return prev;

      const reordered = [...rows];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(toIndex, 0, moved);

      const rebuilt = GROUPS.flatMap((g) =>
        g.key === groupKey ? reordered : prev.filter((m) => g.tiers.includes(m.tier))
      );
      rosterRef.current = rebuilt;
      return rebuilt;
    });
  }, []);

  /**
   * Start a reorder drag.
   *
   * Listeners go on the window rather than the handle: pointer capture on the
   * button did deliver the moves, but the pointerup was lost when the row moved
   * under the cursor, so the new order was never saved. Window listeners do not
   * depend on which element ends up under the pointer.
   */
  const startDrag = (e, groupKey, id) => {
    if (query.trim()) return; // a filtered list cannot be dropped into meaningfully
    e.preventDefault();
    const list = e.currentTarget.closest('ul');
    if (!list) return;

    dragRef.current = { groupKey, id };
    setDragging({ groupKey, id });

    const onMove = (ev) => {
      const rows = [...list.querySelectorAll('li[data-row]')];
      const y = ev.clientY;
      // The row under the pointer is the target. Reordering live keeps the DOM
      // and the array in step, so no ghost element is needed.
      const over = rows.findIndex((row) => {
        const b = row.getBoundingClientRect();
        return y >= b.top && y <= b.bottom;
      });
      if (over >= 0) moveWithin(groupKey, id, over);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      dragRef.current = null;
      setDragging(null);
      save(rosterRef.current, 'Order saved.');
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const filtered = useMemo(() => {
    if (!roster) return [];
    const q = query.trim().toLowerCase();
    const list = q
      ? roster.filter((m) => `${m.name} ${m.role || ''} ${m.tier}`.toLowerCase().includes(q))
      : roster;
    // Stored order, not a sort: the drag sets it and the site follows it.
    return list;
  }, [roster, query]);

  if (!roster) return <p className="text-xs text-gray-500">Loading roster…</p>;

  return (
    <div className="space-y-5">
      {stale && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-imperial-gold/40 bg-imperial-gold/10 px-3 py-2">
          <AlertTriangle size={13} className="shrink-0 text-imperial-gold" />
          <p className="min-w-0 flex-1 text-[11px] text-imperial-gold/90">
            {stale.reason === 'conflict'
              ? 'Another admin saved first, so this change was not applied. Reload, then redo your edit.'
              : 'Someone else changed the roster. Reload before editing.'}
          </p>
          <button
            type="button"
            onClick={reload}
            className="inline-flex shrink-0 items-center gap-1 rounded border border-imperial-gold/50 px-2 py-1 text-[9.5px] uppercase tracking-wider text-imperial-gold transition-colors hover:border-imperial-gold"
          >
            <RefreshCw size={10} /> Reload
          </button>
        </div>
      )}

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
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) setCrop({ file, memberId: form });
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

      {query.trim() && (
        <p className="text-[10.5px] text-gray-500">
          Reordering is off while the search is filtered. Clear it to drag.
        </p>
      )}

      {GROUPS.map((group) => {
        const rows = filtered.filter((m) => group.tiers.includes(m.tier));
        if (rows.length === 0) return null;
        return (
          <section key={group.key} className="space-y-1.5">
            <h3 className="flex items-baseline justify-between px-0.5 pt-1 text-[9.5px] uppercase tracking-[0.16em] text-imperial-gold/60">
              <span>{group.label}</span>
              <span className="text-gray-600">{rows.length}</span>
            </h3>

            <ul className="space-y-1.5">
              {rows.map((m) => (
                <li
                  key={m.id}
                  data-row
                  className={`flex items-center gap-2 rounded-lg border px-1.5 py-2 transition-colors ${
                    dragging?.id === m.id
                      ? 'border-jade-accent/60 bg-jade-accent/[0.07]'
                      : 'border-imperial-gold/15 bg-ink-charcoal'
                  }`}
                >
                  {/* Pointer events, not HTML5 drag: on a phone there is no
                      dragstart, so a native draggable list would not move. */}
                  <button
                    type="button"
                    aria-label={`Reorder ${m.name}`}
                    onPointerDown={(e) => startDrag(e, group.key, m.id)}
                    disabled={!!query.trim()}
                    className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded text-gray-600 transition-colors hover:text-imperial-gold disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <GripVertical size={13} />
                  </button>

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
          </section>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-[11px] text-gray-500">No member matches that search.</p>
      )}

      {crop && (
        <PortraitCropper
          file={crop.file}
          onCancel={() => setCrop(null)}
          onDone={async (blob) => {
            try {
              setBusy(true);
              await uploadPortrait(blob, crop.memberId);
              setCrop(null);
            } catch (err) {
              onError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}
