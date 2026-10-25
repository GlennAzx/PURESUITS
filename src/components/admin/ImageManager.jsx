import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Plus, Image as ImageIcon, X } from 'lucide-react';
import bundledGallery from '../../data/gallery.json';
import { imageUrl } from '../../lib/media';
import { toAlbums } from '../../lib/gallery';

/**
 * Album management for the admin page.
 *
 * Each album has a header you can rename and any number of photos. An album is
 * a section on the public Gallery page, so adding one here creates a new
 * section, and the header typed here is the heading visitors read.
 *
 * Uploads go to R2 and are referenced by key. Every upload writes a NEW key
 * rather than overwriting: the bucket serves a one-year immutable cache, so a
 * reused filename would leave the old picture stuck in every browser.
 */
export default function ImageManager({ token, onNotice, onError }) {
  const [albums, setAlbums] = useState(null);
  const [busyAlbum, setBusyAlbum] = useState(null);
  const albumsRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/content', { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;
        const loaded = toAlbums(
          Array.isArray(data.gallery) && data.gallery.length ? data.gallery : bundledGallery
        );
        albumsRef.current = loaded;
        setAlbums(loaded);
      } catch (err) {
        onError(`could not load the gallery: ${err.message}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [onError]);

  const save = useCallback(
    async (next, message) => {
      albumsRef.current = next;
      setAlbums(next);
      onError('');
      try {
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
        if (Array.isArray(data.gallery)) {
          const normalised = toAlbums(data.gallery);
          albumsRef.current = normalised;
          setAlbums(normalised);
        }
        if (message) onNotice(message);
      } catch (err) {
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
      const keys = [];
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload?kind=gallery', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `upload failed (${res.status})`);
        keys.push(data.key);
      }

      const album = albumsRef.current.find((a) => a.id === albumId);
      const added = keys.map((key, i) => ({
        id: `p-${Date.now().toString(36)}-${i}`,
        image: key,
        caption: '',
      }));
      await save(
        albumsRef.current.map((a) =>
          a.id === albumId ? { ...a, photos: [...(album?.photos || []), ...added] } : a
        ),
        `${added.length} ${added.length === 1 ? 'photo' : 'photos'} added.`
      );
    } catch (err) {
      onError(err.message);
    } finally {
      setBusyAlbum(null);
    }
  };

  const removePhoto = (albumId, photoId) => {
    const next = albumsRef.current.map((a) =>
      a.id === albumId ? { ...a, photos: a.photos.filter((p) => p.id !== photoId) } : a
    );
    return save(next, 'Photo removed.');
  };

  const addAlbum = () => {
    const next = [
      ...albumsRef.current,
      { id: `g-${Date.now().toString(36)}`, title: 'New album', photos: [] },
    ];
    return save(next, 'Album added. Rename its header above.');
  };

  const deleteAlbum = (album) => {
    const count = album.photos.length;
    const msg = count
      ? `Delete the album "${album.title}" and its ${count} photo${count === 1 ? '' : 's'}? The photos stay in storage but leave the gallery.`
      : `Delete the album "${album.title}"?`;
    if (!window.confirm(msg)) return undefined;
    return save(
      albumsRef.current.filter((a) => a.id !== album.id),
      'Album deleted.'
    );
  };

  const commitTitle = (albumId) => {
    const album = albumsRef.current.find((a) => a.id === albumId);
    if (!album) return;
    save(albumsRef.current, 'Header saved.');
  };

  if (!albums) return <p className="text-xs text-gray-500">Loading gallery…</p>;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold text-ivory">Gallery</h2>
          <p className="mt-1 text-[11px] text-gray-500">
            Each album is a section on the Gallery page. Upload as many photos as
            you like into one album.
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

      {albums.map((album) => (
        <div
          key={album.id}
          className="rounded-xl border border-imperial-gold/20 bg-ink-charcoal/60 p-3"
        >
          <div className="flex items-center gap-2">
            <input
              value={album.title}
              onChange={(e) => rename(album.id, e.target.value)}
              onBlur={() => commitTitle(album.id)}
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

          <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {album.photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-video overflow-hidden rounded border border-imperial-gold/20 bg-ink-black/60"
              >
                <img
                  src={imageUrl(photo.image)}
                  alt={photo.caption || album.title}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(album.id, photo.id)}
                  aria-label={`Remove photo from ${album.title}`}
                  className="absolute right-1 top-1 rounded bg-ink-black/80 p-1 text-red-400 opacity-0 transition-opacity hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
                >
                  <X size={11} />
                </button>
              </div>
            ))}

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
              <ImageIcon size={11} /> No photos — the section shows an empty
              state on the site.
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
