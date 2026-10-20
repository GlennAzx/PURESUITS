import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import buildsData from '../data/builds.json';

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

      // Batch entrance for build cards
      ScrollTrigger.batch('.build-card', {
        onEnter: (elements) => {
          gsap.from(elements, {
            opacity: 0,
            y: 40,
            scale: 0.95,
            stagger: 0.06,
            duration: 0.55,
            ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
            overwrite: true,
          });
        },
        start: 'top 85%',
        once: true,
      });
    },
    { scope: pageRef }
  );

  return (
    <div ref={pageRef} className="max-w-5xl mx-auto px-4 lg:pr-24 py-24 space-y-10">
      <div className="builds-header border-b border-imperial-gold/30 pb-4">
        <h2 className="text-3xl font-serif font-bold text-ivory mb-2">
          Martial Path Compendium
        </h2>
        <p className="text-sm text-gray-400">
          Discipline rotations, weapons, and stance synergies
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {buildsData.map((build) => (
          <div
            key={build.id}
            className="build-card bg-ink-charcoal border border-imperial-gold/20 rounded-xl p-6 space-y-4 transition-[border-color,transform] duration-200 ease-out-strong hover:border-imperial-gold/50 hover:scale-[1.02] will-change-transform"
          >
            <div>
              <span className="text-[11px] font-bold text-imperial-gold uppercase tracking-wider">
                {build.role}
              </span>
              <h3 className="text-xl font-serif font-bold text-ivory mt-1">
                {build.discipline}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Weapons: {build.weapons}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-800 text-xs">
              <p className="text-gray-300">
                <strong className="text-ivory">Stance Rotation: </strong>
                {build.rotation}
              </p>
              <p className="text-gray-300">
                <strong className="text-ivory">Internal Passives: </strong>
                {build.internalPassives}
              </p>
            </div>

            <div className="pt-2">
              <span className="text-[11px] font-semibold text-gray-400 block mb-1.5">
                Mystic Arts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {build.mysticArts.map((art, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded bg-jade-deep text-imperial-gold border border-imperial-gold/30"
                  >
                    {art}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
