import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import galleryData from '../../data/gallery.json';
import membersData from '../../data/members.json';
import { imageUrl } from '../../lib/media';

/**
 * Gallery and member-portrait management for the admin page.
 *
 * Images are uploaded to R2 by the Worker and referenced by key. Replacing a
 * picture gives it a NEW key instead of overwriting: the bucket serves images
 * with a one-year immutable cache, so reusing a key would leave the old picture
 * stuck in every browser.
 *
 * Only members whose portrait was changed are stored in the content file. The
 * other 70-odd keep the portrait already in the repo, so the saved list stays
 * small and the page's own JSON stays readable.
 */

const inputCls =
  'w-full rounded-md border border-imperial-gold/25 bg-ink-black/60 px-2.5 py-2 text-xs text-ivory outline-none transition-colors focus:border-imperial-gold/70';

export default function ImageManager({ token, onNotice, onError }) {
  const [gallery, setGallery] = useState(null);
  const [memberOverrides, setMemberOverrides] = useState([]);
  const [busyKey, setBusyKey] = useState(null);
  const [query, setQuery] = useState('');

  // Load current state once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/content', { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;
        setGallery(Array.isArray(data.gallery) && data.gallery.length ? data.gallery : galleryData);
        setMemberOverrides(Array.isArray(data.members) ? data.members : []);
      } catch (err) {
        onError(`could not load images: ${err.message}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [onError]);

  const overridesById = useMemo(
    () => new Map(memberOverrides.map((m) => [m.id, m.avatar])),
    [memberOverrides]
  );

  const save = useCallback(
    async (nextGallery, nextMembers) => {
      const body = {};
      if (nextGallery) body.gallery = nextGallery;
      if (nextMembers) body.members = nextMembers;
      const res = await fetch('/api/images', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `save failed (${res.status})`);
      return data;
    },
    [token]
  );

  const upload = useCallback(
    async (file, kind) => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/upload?kind=${kind}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `upload failed (${res.status})`);
      return data.key;
    },
    [token]
  );

  const setGalleryImage = async (id, file) => {
    if (!file) return;
    setBusyKey(`g-${id}`);
    onError('');
    try {
      const key = await upload(file, 'gallery');
      const next = gallery.map((g) => (g.id === id ? { ...g, image: key } : g));
      await save(next, null);
      setGallery(next);
      onNotice('Gallery image saved.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const clearGalleryImage = async (id) => {
    setBusyKey(`g-${id}`);
    try {
      const next = gallery.map((g) => (g.id === id ? { ...g, image: null } : g));
      await save(next, null);
      setGallery(next);
      onNotice('Gallery slot cleared.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const setMemberPortrait = async (memberId, file) => {
    if (!file) return;
    setBusyKey(`m-${memberId}`);
    onError('');
    try {
      const key = await upload(file, 'members');
      const next = [
        ...memberOverrides.filter((m) => m.id !== memberId),
        { id: memberId, avatar: key },
      ];
      await save(null, next);
      setMemberOverrides(next);
      onNotice('Portrait saved.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const clearMemberPortrait = async (memberId) => {
    setBusyKey(`m-${memberId}`);
    try {
      const next = memberOverrides.filter((m) => m.id !== memberId);
      await save(null, next);
      setMemberOverrides(next);
      onNotice('Portrait reverted to the shipped one.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return membersData.slice(0, 25);
    return membersData
      .filter((m) => `${m.name} ${m.role || ''}`.toLowerCase().includes(q))
      .slice(0, 25);
  }, [query]);

  if (!gallery) {
    return <p className="text-xs text-gray-500">Loading images…</p>;
  }

  return (
    <div className="space-y-10">
      {/* ── Gallery ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 font-serif text-lg font-bold text-ivory">Gallery</h2>
        <p className="mb-4 text-[11px] text-gray-500">
          Upload a screenshot into any slot. It appears on the public Gallery page
          immediately — no build, no deploy.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((slot) => (
            <div
              key={slot.id}
              className="overflow-hidden rounded-lg border border-imperial-gold/20 bg-ink-charcoal"
            >
              <div className="relative aspect-video bg-ink-black/60">
                {slot.image ? (
                  <img
                    src={imageUrl(slot.image)}
                    alt={slot.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-600">
                    <ImageIcon size={16} />
                    <span className="text-[9px] uppercase tracking-widest">Empty</span>
                  </div>
                )}
                {busyKey === `g-${slot.id}` && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink-black/70 text-[10px] uppercase tracking-wider text-imperial-gold">
                    Working…
                  </div>
                )}
              </div>

              <div className="space-y-2 p-2.5">
                <p className="truncate text-[11px] text-gray-300">{slot.title}</p>
                <div className="flex items-center gap-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-imperial-gold/25 px-2 py-1 text-[9.5px] uppercase tracking-wider text-imperial-gold/80 transition-colors hover:border-imperial-gold/60 hover:text-imperial-gold">
                    <Upload size={10} />
                    {slot.image ? 'Replace' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setGalleryImage(slot.id, e.target.files?.[0])}
                    />
                  </label>
                  {slot.image && (
                    <button
                      type="button"
                      onClick={() => clearGalleryImage(slot.id)}
                      className="inline-flex items-center gap-1 rounded border border-red-500/25 px-2 py-1 text-[9.5px] uppercase tracking-wider text-red-400/70 transition-colors hover:border-red-500/60 hover:text-red-400"
                    >
                      <Trash2 size={10} />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Member portraits ──────────────────────────────────── */}
      <section>
        <h2 className="mb-1 font-serif text-lg font-bold text-ivory">Member portraits</h2>
        <p className="mb-4 text-[11px] text-gray-500">
          {memberOverrides.length} of {membersData.length} portraits uploaded.
          Uploading replaces the portrait on that member's tile.
        </p>

        <input
          className={`${inputCls} mb-3`}
          placeholder="Search a member…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <ul className="space-y-1.5">
          {filteredMembers.map((m) => {
            const override = overridesById.get(m.id);
            const ref = override !== undefined ? override : m.avatar;
            const isBusy = busyKey === `m-${m.id}`;
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-imperial-gold/15 bg-ink-charcoal px-2.5 py-2"
              >
                <div className="h-9 w-7 shrink-0 overflow-hidden rounded border border-imperial-gold/20 bg-ink-black/60">
                  {ref ? (
                    <img src={imageUrl(ref)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-700">
                      <ImageIcon size={11} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] text-ivory">{m.name}</p>
                  <p className="truncate text-[9.5px] uppercase tracking-wider text-gray-600">
                    {m.role || m.tier}
                    {override ? ' · custom' : ''}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-imperial-gold/25 px-2 py-1 text-[9.5px] uppercase tracking-wider text-imperial-gold/80 transition-colors hover:border-imperial-gold/60 hover:text-imperial-gold">
                    <Upload size={10} />
                    {isBusy ? '…' : override ? 'Replace' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setMemberPortrait(m.id, e.target.files?.[0])}
                    />
                  </label>
                  {override && (
                    <button
                      type="button"
                      onClick={() => clearMemberPortrait(m.id)}
                      aria-label={`Revert portrait for ${m.name}`}
                      className="rounded border border-red-500/25 p-1 text-red-400/70 transition-colors hover:border-red-500/60 hover:text-red-400"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {query && filteredMembers.length === 0 && (
          <p className="mt-3 text-[11px] text-gray-500">No member matches that name.</p>
        )}
      </section>
    </div>
  );
}
