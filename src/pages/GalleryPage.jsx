import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import galleryData from '../data/gallery.json';
import { imageUrl } from '../lib/media';
import { DEFAULT_CONTENT } from '../lib/siteContent';
import { toAlbums, countPhotos } from '../lib/gallery';

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
  const albums = toAlbums(content?.gallery?.length ? content.gallery : galleryData);
  const total = countPhotos(albums);

  // Only albums that actually hold a photo are rendered. An empty album is an
  // admin placeholder, not something to show a visitor, and rendering six empty
  // sections beside a "coming soon" notice said the same thing twice.
  const filled = albums.filter((a) => a.photos.length > 0);
  const albumCount = filled.length;

  // `content` is null until the first fetch resolves. Keeping the notice behind
  // that stops it flashing on every visit before the real data arrives.
  const empty = total === 0 && content !== null && content !== undefined;

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
                {album.photos.map((photo) => (
                  <figure
                    key={photo.id}
                    className="gallery-photo group relative aspect-video overflow-hidden rounded-xl border border-imperial-gold/20 bg-ink-charcoal transition-[border-color] duration-200 ease-out-strong hover:border-imperial-gold/45"
                  >
                    <a
                      href={imageUrl(photo.image)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full w-full"
                    >
                      <img
                        src={imageUrl(photo.image)}
                        alt={photo.caption || album.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 ease-out-strong group-hover:scale-[1.03]"
                      />
                    </a>

                    {photo.caption && (
                      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-ink-black/90 to-transparent">
                        <span className="text-[11px] text-gray-300">{photo.caption}</span>
                      </figcaption>
                    )}
                  </figure>
                ))}
            </div>
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
    </div>
  );
}
