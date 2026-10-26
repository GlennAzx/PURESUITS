import React, { useCallback, useEffect, useState } from 'react';
import { Upload, RefreshCw, AlertTriangle, User } from 'lucide-react';
import { imageUrl } from '../../lib/media';
import bundledMembers from '../../data/members.json';
import PortraitCropper from './PortraitCropper';
import { loadContent, saveSection, StaleError } from '../../lib/adminContent';

/**
 * Editor for the Kaki of the Week card on the landing page.
 *
 * Picking a member fills the name and role from the roster, so the common case
 * is two clicks. The blurb and the photo are free-form because the point of a
 * weekly card is that it says something specific about one person.
 *
 * Disabled hides the whole section on the site; there is no "empty card" state.
 */
const EMPTY = {
  enabled: false,
  memberId: null,
  name: '',
  role: '',
  blurb: '',
  image: null,
  weekOf: null,
};

export default function FeaturedManager({ token, onNotice, onError }) {
  const [form, setForm] = useState(null);
  const [roster, setRoster] = useState(bundledMembers);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(null);
  const [crop, setCrop] = useState(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const content = await loadContent();
        if (!alive) return;
        setRev(Number(content.rev || 0));
        setRoster(
          Array.isArray(content.members) && content.members.length ? content.members : bundledMembers
        );
        const stored = { ...EMPTY, ...(content.featured || {}) };
        // Cards saved before this split copied the roster portrait into `image`.
        // Treat that as inherited, or the box would claim a custom photo that
        // is really the member's own tile picture.
        const owner = (content.members || bundledMembers).find((m) => m.id === stored.memberId);
        if (stored.image && owner && stored.image === owner.avatar) stored.image = null;
        setForm(stored);
      } catch (err) {
        onError(`could not load the featured member: ${err.message}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [onError]);

  // The portrait this member already has on their tile. It is shown in the
  // photo box as an inherited preview, but is NOT copied into `image`: the
  // roster portrait stays the roster's, and `image` means "a photo uploaded for
  // this card only". That way picking a different member shows their tile
  // portrait instead of silently carrying the previous crop across.
  const linked = roster.find((m) => m.id === form?.memberId) || null;
  const inheritedImage = linked?.avatar || null;
  const previewImage = form?.image || inheritedImage;

  const pickMember = (id) => {
    if (!id) {
      setForm((f) => ({ ...f, memberId: null }));
      return;
    }
    const m = roster.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      memberId: id,
      name: m?.name || f.name,
      role: m?.role || f.role,
      // Drop a custom photo when the member changes, so the box shows the new
      // member's tile portrait. Uploading after this wins.
      image: null,
    }));
  };

  const save = useCallback(async () => {
    setBusy(true);
    onError('');
    try {
      const data = await saveSection('/api/featured', { featured: form }, { token, rev });
      setRev(Number(data.rev || rev));
      setForm({ ...EMPTY, ...(data.featured || {}) });
      setStale(null);
      onNotice('Kaki of the Week saved.');
    } catch (err) {
      if (err instanceof StaleError) {
        setStale({ rev: err.rev, updatedAt: err.updatedAt });
      } else {
        onError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }, [form, token, rev, onNotice, onError]);

  const reload = async () => {
    try {
      const content = await loadContent();
      setRev(Number(content.rev || 0));
      setForm({ ...EMPTY, ...(content.featured || {}) });
      setStale(null);
      onNotice('Reloaded the latest version.');
    } catch (err) {
      onError(err.message);
    }
  };

  const upload = async (blob) => {
    setBusy(true);
    onError('');
    try {
      const body = new FormData();
      body.append('file', blob, 'kaki.jpg');
      const res = await fetch('/api/upload?kind=members', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `upload failed (${res.status})`);
      setForm((f) => ({ ...f, image: data.key }));
      setCrop(null);
      onNotice('Photo ready. Save to publish it.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <p className="text-xs text-gray-500">Loading…</p>;

  const inputCls =
    'w-full rounded-md border border-imperial-gold/25 bg-ink-black/60 px-2.5 py-2 text-xs text-ivory outline-none transition-colors focus:border-imperial-gold/70';

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-serif text-lg font-bold text-ivory">Kaki of the Week</h2>
        <p className="mt-1 max-w-lg text-[11px] text-gray-500">
          One featured member on the landing page. Pick someone from the roster,
          then say what they did. Turn it off to hide the section entirely.
        </p>
      </div>

      {stale && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-imperial-gold/40 bg-imperial-gold/10 px-3 py-2">
          <AlertTriangle size={13} className="shrink-0 text-imperial-gold" />
          <p className="min-w-0 flex-1 text-[11px] text-imperial-gold/90">
            Another admin saved first, so this change was not applied. Reload,
            then redo it.
          </p>
          <button
            type="button"
            onClick={reload}
            className="inline-flex shrink-0 items-center gap-1 rounded border border-imperial-gold/50 px-2 py-1 text-[9.5px] uppercase tracking-wider text-imperial-gold"
          >
            <RefreshCw size={10} /> Reload
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(form.enabled)}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="h-3.5 w-3.5 accent-imperial-gold"
          />
          <span className="text-[11px] uppercase tracking-wider text-gray-400">
            Show on the landing page
          </span>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Member</span>
          <select
            value={form.memberId || ''}
            onChange={(e) => pickMember(e.target.value)}
            className="rounded-md border border-imperial-gold/25 bg-ink-black/60 px-2 py-1.5 text-[11px] text-ivory outline-none focus:border-imperial-gold/70"
          >
            <option value="">— custom —</option>
            {roster.map((m) => (
              <option key={m.id} value={m.id} className="bg-ink-charcoal">
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-gray-500">
            Name
          </span>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="In-game name"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-gray-500">
            Role
          </span>
          <input
            className={inputCls}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Vice Master"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-gray-500">
            Blurb <span className="text-gray-600">({form.blurb.length}/400)</span>
          </span>
          <textarea
            className={`${inputCls} min-h-[86px] resize-y`}
            maxLength={400}
            value={form.blurb}
            onChange={(e) => setForm({ ...form, blurb: e.target.value })}
            placeholder="What did they do this week?"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Same 0.69 frame as the tile, so the preview matches what the card
            will show. Inherited from the linked member unless a photo was
            uploaded for this card. */}
        <div className="flex items-center gap-2">
          <div className="h-24 w-[66px] shrink-0 overflow-hidden rounded border border-imperial-gold/25 bg-ink-black/60">
            {previewImage ? (
              <img src={imageUrl(previewImage)} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-700">
                <User size={18} />
              </div>
            )}
          </div>

          <div className="text-[9.5px] leading-relaxed text-gray-500">
            {form.image ? (
              <>
                <span className="text-imperial-gold/80">Custom photo</span>
                <br />
                Used on this card only.
                <br />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image: null }))}
                  className="mt-1 underline decoration-gray-600 underline-offset-2 transition-colors hover:text-gray-300"
                >
                  Use {linked ? `${linked.name}'s` : 'member'} portrait instead
                </button>
              </>
            ) : linked ? (
              <>
                <span className="text-jade-accent/80">From the roster</span>
                <br />
                {linked.name}&apos;s tile portrait.
                <br />
                Uploading replaces it here.
              </>
            ) : (
              <>No member picked, so there is no portrait to inherit.</>
            )}
          </div>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-imperial-gold/25 px-2 py-1 text-[9.5px] uppercase tracking-wider text-imperial-gold/80 transition-colors hover:border-imperial-gold/60 hover:text-imperial-gold">
          <Upload size={10} /> Photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) setCrop(file);
            }}
          />
        </label>

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="ml-auto rounded-md border border-jade-accent/50 bg-jade-accent/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-jade-accent transition-colors hover:border-jade-accent disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>

      {crop && (
        <PortraitCropper
          file={crop}
          onCancel={() => setCrop(null)}
          onDone={upload}
        />
      )}
    </section>
  );
}
