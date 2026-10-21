import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import RadialPathMenu from '../components/RadialPathMenu';

export default function BuildsPage() {
  const pageRef = useRef(null);

  useGSAP(
    () => {
      // Header entrance
      gsap.from('.builds-header', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
        scrollTrigger: {
          trigger: '.builds-header',
          start: 'top 85%',
          once: true,
        },
      });
    },
    { scope: pageRef }
  );

  // `main` in App.jsx carries pb-16, so the viewport minus 4rem is the real
  // available height. Without the subtraction every page scrolls 64px.
  return (
    <div
      ref={pageRef}
      className="max-w-5xl mx-auto px-4 lg:pr-24 py-[clamp(16px,3vh,96px)] min-h-[calc(100svh-4rem)] flex flex-col gap-6"
    >
      <div className="builds-header border-b border-imperial-gold/30 pb-4">
        <h2 className="text-3xl font-serif font-bold text-ivory mb-2">
          Martial Path Guides
        </h2>
        <p className="text-sm text-gray-400">
          pew pew
        </p>
      </div>

      {/* The ring is the page now. Centre it in whatever height is left under
          the header, so a tall viewport does not leave a void at the bottom. */}
      <div className="flex-1 grid place-items-center">
        <RadialPathMenu />
      </div>
    </div>
  );
}
