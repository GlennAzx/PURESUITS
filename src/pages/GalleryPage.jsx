import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import galleryData from '../data/gallery.json';
import { imageUrl } from '../lib/media';
import { DEFAULT_CONTENT } from '../lib/siteContent';
import { toAlbums, countPhotos } from '../lib/gallery';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// How many photos an album shows before the "show more" tile.
const PREVIEW_COUNT = 3;

/**
 * A thumbnail that owns its own loaded flag.
 *
 * The first version kept a Set of loaded ids in the page and copied it on every
 * load. That re-rendered the whole page - every album and every tile - once per
 * image. Fine at six photos, quadratic at three hundred.
 */
// Full images already asked for, so hovering the same tile twice is free.
const warmedFull = new Set();

/** Start the full image on hover/focus, at low priority. */
function warmFull(photo) {
  if (!photo?.image || warmedFull.has(photo.image)) return;
  warmedFull.add(photo.image);
  const img = new Image();
  img.fetchPriority = 'low';
  img.src = imageUrl(photo.image);
}

function Thumb({ src, alt, className = '', imgClassName = '' }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <span className="pointer-events-none absolute inset-0 animate-pulse bg-imperial-gold/5" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`${imgClassName} transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      />
    </>
  );
}

/**
 * Gallery, grouped into albums.
 *
 * Each album renders its header, then its photos. Albums with no photos still
 * show their header, so an album added in /admin is visible on the site as soon
 * as it is created rather than looking like the album did not save.
 *
 * @param {object} props
 * @param {object} [props.content] - Site content, fetched once in App. When it
 *   carries a gallery list it wins over the bundled JSON, so albums and photos
 *   added in /admin appear without a rebuild.
 */
export default function GalleryPage({ content }) {
  const pageRef = useRef(null);
  // Album opened in the full viewer, or null.
  const [viewer, setViewer] = useState(null);
  // Index of the photo opened full size inside that album, or null for the grid.
  const [photoIndex, setPhotoIndex] = useState(null);
  // Whether the full image in the lightbox has arrived.
  const [fullLoaded, setFullLoaded] = useState(false);
  // Spinner appears only if the wait is long enough to notice.
  const [slowLoad, setSlowLoad] = useState(false);
  // Memoised: without this every thumbnail load rebuilt the whole album tree.
  const albums = useMemo(
    () => toAlbums(content?.gallery?.length ? content.gallery : galleryData),
    [content]
  );
  const total = countPhotos(albums);

  // Only albums that actually hold a photo are rendered. An empty album is an
  // admin placeholder, not something to show a visitor, and rendering six empty
  // sections beside a "coming soon" notice said the same thing twice.
  const filled = albums.filter((a) => a.photos.length > 0);
  const albumCount = filled.length;

  // `content` is null until the first fetch resolves. Keeping the notice behind
  // that stops it flashing on every visit before the real data arrives.
  const empty = total === 0 && content !== null && content !== undefined;

  // Escape closes the viewer, and the page behind must not scroll while it is
  // open or the album appears to move under the reader.
  useEffect(() => {
    if (!viewer) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (photoIndex !== null) setPhotoIndex(null);
        else setViewer(null);
      }
      if (photoIndex !== null && viewer.photos.length > 1) {
        if (e.key === 'ArrowRight') {
          setPhotoIndex((i) => (i + 1) % viewer.photos.length);
        }
        if (e.key === 'ArrowLeft') {
          setPhotoIndex((i) => (i - 1 + viewer.photos.length) % viewer.photos.length);
        }
      }
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [viewer, photoIndex]);

  useEffect(() => {
    setFullLoaded(false);
    setSlowLoad(false);
    // A spinner that flashes for 80 ms reads as a glitch, not as progress.
    const timer = setTimeout(() => setSlowLoad(true), 200);
    return () => clearTimeout(timer);
  }, [photoIndex]);

  // Warm the NEXT full image so an arrow press usually lands on something the
  // browser already has.
  //
  // Deliberately narrow: preloading both neighbours meant one click cost three
  // full images (1.7 MB measured), which is worse than the wait it removes. One
  // neighbour, after a short delay, and skipped entirely when the connection is
  // slow or the visitor asked to save data.
  useEffect(() => {
    if (!viewer || photoIndex === null || viewer.photos.length < 2) return undefined;
    // The photo on screen wins the bandwidth. Preloading a neighbour before it
    // has arrived just makes the one you asked for slower.
    if (!fullLoaded) return undefined;

    const conn = typeof navigator !== 'undefined' ? navigator.connection : null;
    if (conn && (conn.saveData || /(^|-)2g$|(^|-)3g$/.test(conn.effectiveType || ''))) {
      return undefined;
    }

    const next = viewer.photos[(photoIndex + 1) % viewer.photos.length];
    let img = null;
    const timer = setTimeout(() => {
      if (!next) return;
      img = new Image();
      img.fetchPriority = 'low';
      img.src = imageUrl(next.image);
    }, 400);

    return () => {
      clearTimeout(timer);
      // Abandon an in-flight prefetch so a fast arrow press cannot stack a
      // second full download in front of the one on screen.
      if (img) img.src = '';
    };
  }, [viewer, photoIndex, fullLoaded]);

  useGSAP(
    () => {
      gsap.from('.gallery-header', {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
      });

      gsap.from('.gallery-album-head', {
        opacity: 0,
        y: 18,
        duration: 0.5,
        stagger: 0.06,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
        scrollTrigger: { trigger: pageRef.current, start: 'top 80%' },
      });

      ScrollTrigger.batch('.gallery-photo', {
        onEnter: (elements) => {
          gsap.from(elements, {
            opacity: 0,
            y: 30,
            scale: 0.97,
            stagger: 0.05,
            duration: 0.5,
            ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
            overwrite: true,
          });
        },
        start: 'top 88%',
        once: true,
      });
    },
    { scope: pageRef }
  );

  return (
    <div ref={pageRef} className="max-w-6xl mx-auto px-4 lg:pr-24 py-24">
      <div className="gallery-header text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-ivory mb-2">
          Gallery
        </h2>
        <p className="text-sm text-gray-400">
          Screenshots from runs, rallies, and table nights
        </p>
        <div className="inline-flex items-center gap-2 mt-5 px-3.5 py-1.5 rounded-full border border-imperial-gold/30 bg-ink-charcoal/70">
          <span className="w-1.5 h-1.5 rounded-full bg-jade-accent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-imperial-gold">
            {total} {total === 1 ? 'Photo' : 'Photos'}
            {albumCount > 0 && ` · ${albumCount} ${albumCount === 1 ? 'Album' : 'Albums'}`}
          </span>
        </div>
      </div>

      <div className="space-y-14">
        {filled.map((album) => (
          <section key={album.id} aria-labelledby={`album-${album.id}`}>
            <div className="gallery-album-head mb-4 flex items-baseline justify-between gap-4 border-b border-imperial-gold/15 pb-2">
              <h3
                id={`album-${album.id}`}
                className="text-lg md:text-xl font-serif font-bold text-ivory"
              >
                {album.title || 'Untitled album'}
              </h3>
              <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.14em] text-imperial-gold/70">
                {album.photos.length} {album.photos.length === 1 ? 'photo' : 'photos'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {album.photos.slice(0, PREVIEW_COUNT).map((photo) => (
                  <figure
                    key={photo.id}
                    className="gallery-photo group relative aspect-video overflow-hidden rounded-xl border border-imperial-gold/20 bg-ink-charcoal transition-[border-color] duration-200 ease-out-strong hover:border-imperial-gold/45"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setViewer(album);
                        setPhotoIndex(album.photos.findIndex((p) => p.id === photo.id));
                      }}
                      className="block h-full w-full"
                    >
                      <Thumb
                        src={imageUrl(photo.thumb || photo.image)}
                        alt={photo.caption || album.title}
                        imgClassName="w-full h-full object-cover group-hover:scale-[1.03]"
                      />
                    </button>

                    {photo.caption && (
                      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-ink-black/90 to-transparent">
                        <span className="text-[11px] text-gray-300">{photo.caption}</span>
                      </figcaption>
                    )}
                  </figure>
                ))}
            </div>

            {/* A strip under the row rather than a fourth tile: a tile would sit
                alone on a second row and read as a photo. */}
            {album.photos.length > PREVIEW_COUNT && (
              <button
                type="button"
                onClick={() => {
                  setPhotoIndex(null);
                  setViewer(album);
                }}
                className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border border-imperial-gold/25 bg-ink-charcoal/40 px-4 py-3 backdrop-blur-sm transition-colors hover:border-imperial-gold/55 hover:bg-ink-charcoal/60"
              >
                <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-imperial-gold">
                  Show more
                </span>
                <span className="text-[10px] text-gray-400">
                  {album.photos.length - PREVIEW_COUNT} more · view all{' '}
                  {album.photos.length}
                </span>
              </button>
            )}
          </section>
        ))}
      </div>

      {empty && (
        <div className="mt-12 text-center">
          <p className="text-[11px] font-mono uppercase tracking-wider text-imperial-gold/80">
            Screenshots coming soon
          </p>
          <p className="mt-2 text-sm text-gray-400">
            We are still gathering the good ones. Got a run, a rally or a table
            night worth keeping?{' '}
            <a
              href={DEFAULT_CONTENT.links.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="text-imperial-gold underline decoration-imperial-gold/40 underline-offset-4 transition-colors hover:text-imperial-gold-bright hover:decoration-imperial-gold"
            >
              Share it in our Discord
            </a>
            .
          </p>
        </div>
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-[70] bg-ink-black"
          role="dialog"
          aria-modal="true"
          aria-label={`${viewer.title} album`}
          onClick={() => {
            setViewer(null);
            setPhotoIndex(null);
          }}
        >
          <div
            className="mx-auto flex h-full max-w-6xl flex-col px-4 py-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-imperial-gold/20 pb-3">
              <div className="min-w-0">
                <h2 className="truncate font-serif text-xl font-bold text-ivory">
                  {photoIndex === null ? viewer.title : viewer.photos[photoIndex].caption || viewer.title}
                </h2>
                <p className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.16em] text-imperial-gold/70">
                  {photoIndex === null
                    ? `${viewer.photos.length} ${viewer.photos.length === 1 ? 'photo' : 'photos'}`
                    : `${photoIndex + 1} / ${viewer.photos.length}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (photoIndex === null) {
                    setViewer(null);
                    setPhotoIndex(null);
                  } else {
                    setPhotoIndex(null);
                  }
                }}
                aria-label={photoIndex === null ? 'Close album' : 'Back to album'}
                className="shrink-0 rounded border border-imperial-gold/25 px-2.5 py-1 text-[10px] uppercase tracking-wider text-gray-400 transition-colors hover:border-imperial-gold/60 hover:text-imperial-gold"
              >
                {photoIndex === null ? 'Close' : 'Back'}
              </button>
            </div>

            {photoIndex === null ? (
              /* Thumbnails only. Loading full images here is what made opening
                 an album slow: every photo was decoded at full resolution. */
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {viewer.photos.map((photo, i) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setPhotoIndex(i)}
                      // Hover is a free head start: the full image begins on
                      // pointerenter, which usually covers the wait before the
                      // click lands.
                      onPointerEnter={() => warmFull(photo)}
                      onFocus={() => warmFull(photo)}
                      className="group relative aspect-video overflow-hidden rounded-lg border border-imperial-gold/20 bg-ink-charcoal transition-colors hover:border-imperial-gold/55"
                    >
                      <Thumb
                        src={imageUrl(photo.thumb || photo.image)}
                        alt={photo.caption || viewer.title}
                        imgClassName="h-full w-full object-cover group-hover:scale-[1.03]"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* One full image, never more. The box is sized by the frame and
                 not by the image: the first version let the <img> define the
                 size, so while the JPEG was still arriving the box was 0x0 and
                 the blurred placeholder inside it was invisible - a black
                 rectangle with a spinner, which is the wait it meant to hide. */
              <div className="relative flex h-full w-full items-center justify-center">
                <div className="relative flex h-full w-full items-center justify-center">
                  {/* Stays mounted underneath. It is never seen again once the
                      real image is opaque over it, and removing it on load
                      caused a visible dip to the dark overlay. */}
                  {viewer.photos[photoIndex].thumb && (
                    <img
                      src={imageUrl(viewer.photos[photoIndex].thumb)}
                      alt=""
                      aria-hidden
                      className="absolute max-h-full max-w-full scale-105 rounded-lg object-contain opacity-60 blur-2xl"
                    />
                  )}

                  <img
                    key={viewer.photos[photoIndex].id}
                    src={imageUrl(viewer.photos[photoIndex].image)}
                    alt={viewer.photos[photoIndex].caption || viewer.title}
                    decoding="async"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      // Fade only once the pixels are ready to paint, or the
                      // transition runs on an undecoded frame and stutters.
                      const done = () => setFullLoaded(true);
                      if (typeof img.decode === 'function') {
                        img.decode().then(done).catch(done);
                      } else {
                        done();
                      }
                    }}
                    className={`relative max-h-full max-w-full rounded-lg object-contain transition-opacity duration-300 ${
                      fullLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  />

                  {!fullLoaded && slowLoad && (
                    <span className="absolute bottom-3 flex items-center gap-2 rounded-full border border-imperial-gold/30 bg-ink-black/80 px-3 py-1.5 text-[10px] uppercase tracking-wider text-imperial-gold">
                      <span className="h-2.5 w-2.5 animate-spin rounded-full border border-imperial-gold/40 border-t-imperial-gold" />
                      Loading
                    </span>
                  )}
                </div>

                {viewer.photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoIndex(
                          (photoIndex - 1 + viewer.photos.length) % viewer.photos.length
                        )
                      }
                      aria-label="Previous photo"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-imperial-gold/45 bg-ink-black/85 p-3 text-imperial-gold shadow-lg shadow-black/50 transition-colors hover:border-imperial-gold/80 hover:bg-ink-black"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPhotoIndex((photoIndex + 1) % viewer.photos.length)}
                      aria-label="Next photo"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-imperial-gold/45 bg-ink-black/85 p-3 text-imperial-gold shadow-lg shadow-black/50 transition-colors hover:border-imperial-gold/80 hover:bg-ink-black"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
