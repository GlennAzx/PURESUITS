import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Images } from 'lucide-react';
import galleryData from '../data/gallery.json';

export default function GalleryPage() {
  const pageRef = useRef(null);
  const filled = galleryData.filter((g) => g.image).length;

  useGSAP(
    () => {
      gsap.from('.gallery-header', {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
      });

      ScrollTrigger.batch('.gallery-slot', {
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
      <div className="gallery-header text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-ivory mb-2">
          Gallery
        </h2>
        <p className="text-sm text-gray-400">
          Screenshots from runs, rallies, and table nights
        </p>
        <div className="inline-flex items-center gap-2 mt-5 px-3.5 py-1.5 rounded-full border border-imperial-gold/30 bg-ink-charcoal/70">
          <span className="w-1.5 h-1.5 rounded-full bg-jade-accent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-imperial-gold">
            {galleryData.length} Slots
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {galleryData.map((item) => (
          <figure
            key={item.id}
            className="gallery-slot group relative aspect-video rounded-xl overflow-hidden border border-imperial-gold/20 bg-ink-charcoal transition-[border-color] duration-200 ease-out-strong hover:border-imperial-gold/45"
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 ease-out-strong group-hover:scale-[1.03]"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600">
                <Images size={26} className="opacity-50" />
                <span className="text-[10px] uppercase tracking-wider">
                  Empty slot
                </span>
              </div>
            )}

            <figcaption className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-ink-black/90 to-transparent">
              <span className="text-[11px] text-gray-300">{item.title}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {filled === 0 && (
        <p className="text-center text-[11px] text-gray-600 mt-8 font-mono">
          Add image paths to src/data/gallery.json to fill these slots.
        </p>
      )}
    </div>
  );
}
