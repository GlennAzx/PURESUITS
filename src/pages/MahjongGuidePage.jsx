import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { DEFAULT_CONTENT } from '../lib/siteContent';

const SECTIONS = [
  {
    title: '1. Voiding a Suit (定缺 - Ding Que)',
    content: (
      <>
        At the start of the match, every player declares one suit (Characters,
        Bamboo, or Dots) to discard entirely.{' '}
        <strong>
          You cannot declare Hu (win) if you still hold any tile of your chosen
          voided suit.
        </strong>{' '}
        Discard them immediately during the opening rounds.
      </>
    ),
  },
  {
    title: '2. Bloody Battle Mechanics (血战到底)',
    content: (
      <>
        Unlike traditional Mahjong where the round ends on the first winner, in
        Bloody Battle{' '}
        <strong>
          the winner takes their payout and exits the table
        </strong>
        . The remaining three players continue playing until three people have
        declared Hu or the wall is completely exhausted.
      </>
    ),
  },
  {
    title: '3. Wind & Rain Cashouts (刮风下雨)',
    content: (
      <>
        <p>
          Calling a Kong (杠) triggers immediate copper payouts from the table
          without waiting for the round to end:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
          <li>
            <strong>Concealed Kong (下雨):</strong> Collect double payouts from
            all 3 active players.
          </li>
          <li>
            <strong>Exposed Kong (刮风):</strong> Collect a single payout from
            the player who discarded the tile.
          </li>
        </ul>
      </>
    ),
  },
];

export default function MahjongGuidePage() {
  const pageRef = useRef(null);

  useGSAP(
    () => {
      // Header entrance
      gsap.from('.mj-header', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
        scrollTrigger: {
          trigger: '.mj-header',
          start: 'top 85%',
          once: true,
        },
      });

      // Batch entrance for rule sections
      ScrollTrigger.batch('.mj-section', {
        onEnter: (elements) => {
          gsap.from(elements, {
            opacity: 0,
            y: 40,
            scale: 0.97,
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
    <div ref={pageRef} className="max-w-4xl mx-auto px-4 lg:pr-24 py-24 space-y-12">
      <div className="mj-header border-b border-imperial-gold/30 pb-4">
        <h2 className="text-3xl font-serif font-bold text-ivory mb-2">
          Where Winds Meet: Sichuan Bloody Battle (血战到底)
        </h2>
        <p className="text-sm text-gray-400">
          Rules, win conditions, and tile-discard strategy
        </p>
      </div>

      <div className="mj-notice rounded-xl border border-imperial-gold/25 bg-ink-charcoal/60 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-jade-accent"
            aria-hidden="true"
          />
          <span className="text-[10px] uppercase tracking-[0.18em] text-jade-accent">
            Work in progress
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          The rules below are correct and already in use. The remaining details
          are being verified in-game, and will be added here as they are
          confirmed.
        </p>

        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Full builds are available in the{' '}
          <a
            href={DEFAULT_CONTENT.links.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="text-imperial-gold underline decoration-imperial-gold/40 underline-offset-4 transition-colors duration-200 ease-out-strong hover:text-imperial-gold-bright hover:decoration-imperial-gold/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-imperial-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-charcoal"
          >
            guild Discord
          </a>{' '}
          in the meantime.
        </p>
      </div>

      <div className="space-y-6 text-gray-300 leading-relaxed text-sm">
        {SECTIONS.map((section, i) => (
          <section
            key={i}
            className="mj-section bg-ink-charcoal border border-imperial-gold/20 rounded-xl p-6 transition-[border-color] duration-200 ease-out-strong hover:border-imperial-gold/40"
          >
            <h3 className="text-lg font-serif font-bold text-imperial-gold mb-2">
              {section.title}
            </h3>
            <div>{section.content}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
