import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Plus, Image as ImageIcon, X, RefreshCw, AlertTriangle } from 'lucide-react';
import bundledGallery from '../../data/gallery.json';
import { imageUrl } from '../../lib/media';
import { toAlbums, countPhotos } from '../../lib/gallery';
import { processImage, formatBytes } from '../../lib/image';
import { loadContent, saveSection, StaleError, useContentWatch } from '../../lib/adminContent';

/**
 * Album management for the admin page.
 *
 * Each album is a section on the public Gallery page: an editable header plus
 * any number of photos.
 *
 * Two things matter because more than one person uses this panel:
 *
 * 1. Every photo is compressed before upload. A 3000 px phone screenshot drops
 *    to about a tenth of its bytes, which is what keeps the gallery inside the
 *    R2 free tier (10 GB stored).
 * 2. Saves carry the revision they were built from. If someone else saved
 *    first, the Worker refuses with 409 and this panel reloads rather than
 *    overwriting their work.
 */
const MAX_PHOTOS = 800;
const MAX_BYTES = 4 * 1024 * 1024 * 1024;

/** Index of the tile under the pointer, or the nearest one if between tiles. */
function indexAtPoint(tiles, x, y) {
  for (let i = 0; i < tiles.length; i += 1) {
    const r = tiles[i].getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
  }
  let best = -1;
  let bestDist = Infinity;
  tiles.forEach((t, i) => {
    const r = t.getBoundingClientRect();
    const dx = r.left + r.width / 2 - x;
    const dy = r.top + r.height / 2 - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/**
 * Move the given photos as one block to sit before or after `anchorId`.
 *
 * The side matters: inserting "before the anchor" only, as the first version
 * did, made a two-photo album impossible to reorder, because dropping A onto B
 * always put A back before B.
 *
 * Relative order inside the block is preserved.
 */
function moveBlock(photos, movingIds, anchorId, after) {
  const moving = new Set(movingIds);
  const block = photos.filter((p) => moving.has(p.id));
  const rest = photos.filter((p) => !moving.has(p.id));

  const anchor = photos.find((p) => p.id === anchorId);
  if (!anchor || moving.has(anchor.id)) return photos;

  let at = rest.findIndex((p) => p.id === anchorId);
  if (at < 0) at = rest.length;
  else if (after) at += 1;

  return [...rest.slice(0, at), ...block, ...rest.slice(at)];
}

export default function ImageManager({ token, onNotice, onError }) {
  const [albums, setAlbums] = useState(null);
  const [busyAlbum, setBusyAlbum] = useState(null);
  const [stale, setStale] = useState(null);
  // Selection is scoped to one album: a delete or a move applies inside a
  // single album, so mixing selections across albums would be meaningless.
  const [selection, setSelection] = useState({ albumId: null, ids: new Set() });
  const albumsRef = useRef(null);
  const revRef = useRef(0);
  const dragRef = useRef(null);

  const adopt = useCallback((content) => {
    const loaded = toAlbums(
      Array.isArray(content.gallery) && content.gallery.length ? content.gallery : bundledGallery
    );
    albumsRef.current = loaded;
    revRef.current = Number(content.rev || 0);
    setAlbums(loaded);
    setStale(null);
  }, []);

  const reload = useCallback(async () => {
    try {
      adopt(await loadContent());
      onNotice('Reloaded the latest version.');
    } catch (err) {
      onError(err.message);
    }
  }, [adopt, onNotice, onError]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const content = await loadContent();
        if (alive) adopt(content);
      } catch (err) {
        onError(`could not load the gallery: ${err.message}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [adopt, onError]);

  // Notice a save by someone else before the next save loses it.
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
      albumsRef.current = next;
      setAlbums(next);
      onError('');
      try {
        const data = await saveSection('/api/images', { gallery: next }, { token, rev: revRef.current });
        revRef.current = Number(data.rev || revRef.current);
        setStale(null);
        if (message) onNotice(message);
      } catch (err) {
        if (err instanceof StaleError) {
          setStale({ rev: err.rev, updatedAt: err.updatedAt, reason: 'conflict' });
          return;
        }
        onError(err.message);
      }
    },
    [token, onNotice, onError]
  );

  const patchAlbum = (albumId, patch) =>
    albumsRef.current.map((a) => (a.id === albumId ? { ...a, ...patch } : a));

  const rename = (albumId, title) => {
    const next = patchAlbum(albumId, { title });
    albumsRef.current = next;
    setAlbums(next);
  };

  const addPhotos = async (albumId, files) => {
    if (!files.length) return;
    setBusyAlbum(albumId);
    onError('');
    try {
      const put = async (blob, name) => {
        const form = new FormData();
        form.append('file', blob, name);
        const res = await fetch('/api/upload?kind=gallery', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `upload failed (${res.status})`);
        return data;
      };

      const added = [];
      for (const file of files) {
        // Two files per photo: the full one is only opened on click, the
        // thumbnail is what every grid draws.
        const { full, thumb, compressed } = await processImage(file);
        // Name from the real blob type: the Worker takes the extension from the
        // filename first, so calling a WebP "photo.jpg" stores it as a JPEG.
        const ext = full.type === 'image/webp' ? 'webp' : 'jpg';
        const fullRes = await put(full, compressed ? `photo.${ext}` : file.name);
        const thumbRes = thumb === full ? null : await put(thumb, `thumb.${ext}`);

        added.push({
          id: `p-${Date.now().toString(36)}-${added.length}`,
          image: fullRes.key,
          thumb: thumbRes?.key || null,
          bytes: Number(fullRes.bytes) || full.size,
          caption: '',
        });
      }

      const album = albumsRef.current.find((a) => a.id === albumId);
      const photos = [...(album?.photos || []), ...added];
      const total = countPhotos(albumsRef.current) + added.length;
      if (total > MAX_PHOTOS) {
        throw new Error(`that would make ${total} photos; the limit is ${MAX_PHOTOS}`);
      }

      await save(
        albumsRef.current.map((a) => (a.id === albumId ? { ...a, photos } : a)),
        `${added.length} ${added.length === 1 ? 'photo' : 'photos'} added.`
      );
    } catch (err) {
      onError(err.message);
    } finally {
      setBusyAlbum(null);
    }
  };

  const clearSelection = () => setSelection({ albumId: null, ids: new Set() });

  const toggleSelect = (albumId, photoId) => {
    setSelection((prev) => {
      const ids = prev.albumId === albumId ? new Set(prev.ids) : new Set();
      if (ids.has(photoId)) ids.delete(photoId);
      else ids.add(photoId);
      return { albumId: ids.size ? albumId : null, ids };
    });
  };

  const deletePhotos = (album, ids) => {
    const count = ids.length;
    const label = count === 1 ? 'this photo' : `these ${count} photos`;
    if (!window.confirm(`Delete ${label} from "${album.title}"? This cannot be undone.`)) {
      return undefined;
    }
    clearSelection();
    const drop = new Set(ids);
    return save(
      albumsRef.current.map((a) =>
        a.id === album.id ? { ...a, photos: a.photos.filter((p) => !drop.has(p.id)) } : a
      ),
      count === 1 ? 'Photo deleted.' : `${count} photos deleted.`
    );
  };

  /**
   * Reorder photos inside one album.
   *
   * A pointer drag rather than HTML5 dragstart, which never fires on a phone.
   * When the grabbed photo is part of a multi-selection, the whole selection
   * moves as one block and keeps its relative order.
   */
  const startPhotoDrag = (e, albumId, photoId) => {
    if (e.button !== undefined && e.button !== 0) return;
    const grid = e.currentTarget.closest('[data-photo-grid]');
    if (!grid) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const album = albumsRef.current.find((a) => a.id === albumId);
    const moving =
      selection.albumId === albumId && selection.ids.has(photoId)
        ? [...selection.ids]
        : [photoId];

    let dragging = false;

    const onMove = (ev) => {
      if (!dragging) {
        // A few pixels of slop so a tap to select is not read as a drag.
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 6) return;
        dragging = true;
      }

      const tiles = [...grid.querySelectorAll('[data-photo]')];
      const ids = tiles.map((t) => t.dataset.photo);
      const hit = indexAtPoint(tiles, ev.clientX, ev.clientY);
      if (hit < 0) return;

      const targetId = ids[hit];
      if (!targetId || moving.includes(targetId)) return;

      // Which side of the tile the pointer is on decides where the block lands.
      const r = tiles[hit].getBoundingClientRect();
      const sameRow = Math.abs(ev.clientY - (r.top + r.height / 2)) <= r.height / 2;
      const after = sameRow
        ? ev.clientX > r.left + r.width / 2
        : ev.clientY > r.top + r.height / 2;

      const next = moveBlock(album.photos, moving, targetId, after);
      const updated = albumsRef.current.map((a) =>
        a.id === albumId ? { ...a, photos: next } : a
      );
      albumsRef.current = updated;
      setAlbums(updated);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      dragRef.current = null;

      if (!dragging) {
        toggleSelect(albumId, photoId);
        return;
      }
      save(albumsRef.current, moving.length > 1 ? 'Photos reordered.' : 'Order saved.');
    };

    dragRef.current = { albumId, photoId };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const addAlbum = () =>
    save(
      [...albumsRef.current, { id: `g-${Date.now().toString(36)}`, title: 'New album', photos: [] }],
      'Album added. Rename its header above.'
    );

  const deleteAlbum = (album) => {
    const count = album.photos.length;
    const msg = count
      ? `Delete the album "${album.title}" and its ${count} photo${count === 1 ? '' : 's'}? The photos stay in storage but leave the gallery.`
      : `Delete the album "${album.title}"?`;
    if (!window.confirm(msg)) return undefined;
    return save(albumsRef.current.filter((a) => a.id !== album.id), 'Album deleted.');
  };

  const commitTitle = () => save(albumsRef.current, 'Header saved.');

  if (!albums) return <p className="text-xs text-gray-500">Loading gallery…</p>;

  const photos = countPhotos(albums);
  const bytes = albums.reduce((n, a) => n + a.photos.reduce((m, p) => m + (p.bytes || 0), 0), 0);
  const pct = Math.min(100, (bytes / MAX_BYTES) * 100);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold text-ivory">Gallery</h2>
          <p className="mt-1 max-w-md text-[11px] text-gray-500">
            Each album is a section on the Gallery page. Photos are compressed to
            1920 px before upload.
          </p>
        </div>
        <button
          type="button"
          onClick={addAlbum}
          className="inline-flex items-center gap-1.5 rounded-md border border-jade-accent/40 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-jade-accent transition-colors hover:border-jade-accent"
        >
          <Plus size={12} /> New album
        </button>
      </div>

      <div className="rounded-lg border border-imperial-gold/15 bg-ink-charcoal/50 px-3 py-2">
        <div className="flex items-baseline justify-between text-[10px] uppercase tracking-wider">
          <span className="text-gray-500">
            {photos} / {MAX_PHOTOS} photos
          </span>
          <span className="font-mono text-imperial-gold/80">
            {formatBytes(bytes)} / {formatBytes(MAX_BYTES)}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-black/70">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              pct > 85 ? 'bg-red-400/70' : pct > 60 ? 'bg-imperial-gold/70' : 'bg-jade-accent/60'
            }`}
            style={{ width: `${Math.max(pct, bytes > 0 ? 1 : 0)}%` }}
          />
        </div>
      </div>

      {stale && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-imperial-gold/40 bg-imperial-gold/10 px-3 py-2">
          <AlertTriangle size={13} className="shrink-0 text-imperial-gold" />
          <p className="min-w-0 flex-1 text-[11px] text-imperial-gold/90">
            {stale.reason === 'conflict'
              ? 'Another admin saved first, so this change was not applied. Reload to see their version, then redo your edit.'
              : 'Someone else changed the gallery. Reload to see the latest before editing.'}
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

      {albums.map((album) => (
        <div
          key={album.id}
          className="rounded-xl border border-imperial-gold/20 bg-ink-charcoal/60 p-3"
        >
          <div className="flex items-center gap-2">
            <input
              value={album.title}
              onChange={(e) => rename(album.id, e.target.value)}
              onBlur={commitTitle}
              aria-label="Album header"
              placeholder="Album header"
              className="min-w-0 flex-1 rounded-md border border-imperial-gold/25 bg-ink-black/60 px-2.5 py-2 text-xs text-ivory outline-none transition-colors focus:border-imperial-gold/70"
            />
            <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-gray-600">
              {album.photos.length}
            </span>
            <button
              type="button"
              onClick={() => deleteAlbum(album)}
              aria-label={`Delete album ${album.title}`}
              className="shrink-0 rounded border border-red-500/25 p-1.5 text-red-400/70 transition-colors hover:border-red-500/60 hover:text-red-400"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {/* Selection bar. Appears only with something picked, so the common
              single-upload case stays uncluttered. */}
          {selection.albumId === album.id && selection.ids.size > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-jade-accent/30 bg-jade-accent/5 px-2 py-1.5">
              <span className="text-[10px] uppercase tracking-wider text-jade-accent">
                {selection.ids.size} selected
              </span>
              <button
                type="button"
                onClick={() => deletePhotos(album, [...selection.ids])}
                className="rounded border border-red-500/40 px-2 py-1 text-[9.5px] uppercase tracking-wider text-red-400 transition-colors hover:border-red-500/70 hover:text-red-300"
              >
                Delete all
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-[9.5px] uppercase tracking-wider text-gray-500 transition-colors hover:text-gray-300"
              >
                Clear
              </button>
            </div>
          )}

          <div
            data-photo-grid={album.id}
            className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5"
          >
            {album.photos.map((photo) => {
              const picked = selection.albumId === album.id && selection.ids.has(photo.id);
              return (
                <div
                  key={photo.id}
                  data-photo={photo.id}
                  onPointerDown={(e) => startPhotoDrag(e, album.id, photo.id)}
                  className={`group relative aspect-video cursor-grab touch-none overflow-hidden rounded border bg-ink-black/60 transition-colors ${
                    picked
                      ? 'border-jade-accent ring-1 ring-jade-accent/60'
                      : 'border-imperial-gold/20'
                  }`}
                >
                  <img
                    src={imageUrl(photo.image)}
                    alt={photo.caption || album.title}
                    draggable={false}
                    className="h-full w-full object-cover"
                  />

                  {picked && (
                    <span className="pointer-events-none absolute left-1 top-1 rounded bg-jade-accent px-1 text-[9px] font-bold text-ink-black">
                      ✓
                    </span>
                  )}

                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePhotos(album, [photo.id]);
                    }}
                    aria-label={`Delete photo from ${album.title}`}
                    className="absolute right-1 top-1 rounded bg-ink-black/80 p-1 text-red-400 opacity-0 transition-opacity hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}

            <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-imperial-gold/30 text-gray-500 transition-colors hover:border-imperial-gold/60 hover:text-imperial-gold">
              {busyAlbum === album.id ? (
                <span className="text-[9px] uppercase tracking-wider">Uploading…</span>
              ) : (
                <>
                  <Upload size={13} />
                  <span className="text-[9px] uppercase tracking-wider">Add photos</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={busyAlbum === album.id}
                onChange={(e) => {
                  const files = [...(e.target.files || [])];
                  e.target.value = '';
                  addPhotos(album.id, files);
                }}
              />
            </label>
          </div>

          {album.photos.length === 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-600">
              <ImageIcon size={11} /> No photos — the section is hidden on the
              site until it has one.
            </p>
          )}
        </div>
      ))}

      {albums.length === 0 && (
        <p className="text-[11px] text-gray-500">
          No albums. Use New album to create the first section.
        </p>
      )}
    </section>
  );
}
