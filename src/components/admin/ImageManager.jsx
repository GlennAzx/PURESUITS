import React, { useCallback, useEffect, useState } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import galleryData from '../../data/gallery.json';
import { imageUrl } from '../../lib/media';

/**
 * Gallery management for the admin page.
 *
 * Member portraits live in the Members tab, because a portrait belongs to a
 * roster entry. Splitting them across two tabs would give two places to change
 * the same picture.
 *
 * Uploads go to R2 and are referenced by key. Replacing an image writes a NEW
 * key instead of overwriting: the bucket serves a one-year immutable cache, so
 * reusing a filename would leave the old picture stuck in every browser.
 */
export default function ImageManager({ token, onNotice, onError }) {
  const [gallery, setGallery] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/content', { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;
        setGallery(
          Array.isArray(data.gallery) && data.gallery.length ? data.gallery : galleryData
        );
      } catch (err) {
        onError(`could not load the gallery: ${err.message}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [onError]);

  const save = useCallback(
    async (next) => {
      const res = await fetch('/api/images', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gallery: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `save failed (${res.status})`);
    },
    [token]
  );

  const setImage = async (id, file) => {
    if (!file) return;
    setBusyKey(id);
    onError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload?kind=gallery', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `upload failed (${res.status})`);

      const next = gallery.map((g) => (g.id === id ? { ...g, image: data.key } : g));
      await save(next);
      setGallery(next);
      onNotice('Gallery image saved.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const clearImage = async (id) => {
    setBusyKey(id);
    try {
      const next = gallery.map((g) => (g.id === id ? { ...g, image: null } : g));
      await save(next);
      setGallery(next);
      onNotice('Gallery slot cleared.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  if (!gallery) return <p className="text-xs text-gray-500">Loading gallery…</p>;

  return (
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
              {busyKey === slot.id && (
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
                    onChange={(e) => setImage(slot.id, e.target.files?.[0])}
                  />
                </label>
                {slot.image && (
                  <button
                    type="button"
                    onClick={() => clearImage(slot.id)}
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
  );
}
