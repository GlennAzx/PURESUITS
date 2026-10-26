/**
 * Gallery albums.
 *
 * An album is a header plus a list of photos. Content saved before albums
 * existed stored one image per slot, so `toAlbums` reads such an item as a
 * single-photo album. Both the Gallery page and the admin panel go through this
 * one function, so they can never disagree about the shape.
 *
 * @param {Array} list Raw album list from content or the bundled JSON.
 * @returns {Array<{id: string, title: string, photos: Array<{id: string, image: string, caption: string}>}>}
 */
export function toAlbums(list) {
  if (!Array.isArray(list)) return [];

  return list.map((album, i) => {
    if (!album || typeof album !== 'object') {
      return { id: `g-${i}`, title: '', photos: [] };
    }

    const raw = Array.isArray(album.photos)
      ? album.photos
      : album.image
        ? [{ id: `${album.id || `g-${i}`}-p1`, image: album.image }]
        : [];

    return {
      id: album.id || `g-${i}`,
      title: album.title || '',
      photos: raw
        .filter((p) => p && p.image)
        .map((p, j) => ({
          id: p.id || `p-${i}-${j}`,
          image: p.image,
          // Grids draw the thumbnail; the full image is opened only on click.
          // Dropping this field here silently sent every grid back to the full
          // file, which is exactly the cost thumbnails exist to avoid.
          thumb: p.thumb || null,
          bytes: Number(p.bytes) || 0,
          caption: p.caption || '',
        })),
    };
  });
}

/** Total photos across every album. */
export function countPhotos(albums) {
  return albums.reduce((n, a) => n + a.photos.length, 0);
}
