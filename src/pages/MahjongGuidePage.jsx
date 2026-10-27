import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { DEFAULT_CONTENT } from '../lib/siteContent';
import {
  FIRST_GAME,
  GLOSSARY,
  SETS,
  WINNING,
  SCORING,
  END_OF_GAME,
} from '../data/mahjongGuide';
import MahjongTile, { TileRow, run, pong, kong, pair } from '../components/GuideTile';
import AnnotatedShot from '../components/AnnotatedShot';

// Real screenshots for the beginner steps, with the important parts ringed.
// The marks are drawn by hand on the screenshots themselves, so there are no
// overlay coordinates here: the image is the annotation.
const SHOTS = {
  2: {
    src: '/guides/missing-suit-annotated.webp',
    alt: 'The Choose Your Missing Suit panel, with the panel title circled',
    marks: [],
    caption:
      'The opening panel. Pick the suit whose tiles you hold fewest of, as the line under the title suggests. The three cards are Ten Thousand, Dot and Bamboo.',
  },
  4: {
    src: '/guides/greyed-tiles-annotated.webp',
    alt: 'A hand in progress with the declared missing suit drawn as greyed tiles, boxed in the marked screenshot',
    marks: [],
    caption:
      "Bamboo is this player's missing suit, and every Bamboo tile in the boxed run is grey instead of cream. Those tiles cannot form a set, and the hand cannot win until they are gone.",
  },
};

// One sample tile per suit, and the three set shapes, as the game draws them.
const SUIT_SAMPLES = { Bamboo: 2, Characters: 1, Dots: 1 };
const SUIT_KEYS = { Bamboo: 'bamboo', Characters: 'characters', Dots: 'dots' };
const SET_EXAMPLES = {
  Chi: run('bamboo', 2),
  Pong: pong('dots', 5),
  Kong: kong('characters', 1),
};

// A legal 14-tile hand: three runs and a pong in bamboo and dots, plus a pair.
const EXAMPLE_HAND = [
  ...run('bamboo', 2),
  ...run('bamboo', 5),
  ...run('dots', 7),
  ...pong('dots', 1),
  ...pair('dots', 5),
];


/** Colour the multiplier badge by tier, so a ×128 reads as rare at a glance. */
function badgeClass(mult) {
  if (mult >= 32) return 'border-imperial-gold/60 bg-imperial-gold/15 text-imperial-gold';
  if (mult >= 8) return 'border-jade-accent/50 bg-jade-accent/10 text-jade-accent';
  return 'border-gray-600/40 bg-ink-black/40 text-gray-400';
}

export default function MahjongGuidePage() {
  const pageRef = useRef(null);

  useGSAP(
    () => {
      gsap.from('.mj-header', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
      });

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
        start: 'top 88%',
        once: true,
      });
    },
    { scope: pageRef }
  );

  return (
    <div ref={pageRef} className="mx-auto max-w-4xl space-y-10 px-4 py-24 lg:pr-24">
      <header className="mj-header border-b border-imperial-gold/30 pb-4">
        <h2 className="mb-2 font-serif text-3xl font-bold text-ivory">
          Mahjong, as we play it
        </h2>
        <p className="text-sm text-gray-400">
          Sichuan rules, four sets and a pair, scored by pattern. Transcribed
          from the in-game guide.
        </p>
      </header>

      {/* The whole game in three lines, for someone who has never played. */}

      <section className="mj-section rounded-xl border border-imperial-gold/25 bg-ink-charcoal/70 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Objective', 'Four sets and one pair'],
            ['Suits', 'Two of the three, at most'],
            ['Scoring', 'Patterns multiply, unless one replaces another'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-imperial-gold/15 bg-ink-black/30 p-3">
              <p className="text-[9.5px] uppercase tracking-[0.18em] text-jade-accent/90">
                {label}
              </p>
              <p className="mt-1 text-sm text-ivory">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mj-section">
        <h3 className="mb-3 font-serif text-xl font-bold text-imperial-gold">
          Tiles and sets
        </h3>
        <p className="mb-3 text-sm text-gray-400">
          Three suits, ranks 1 to 9, four copies of each: 108 tiles. No winds,
          dragons or flowers are in play.
        </p>

        <div className="space-y-2 rounded-xl border border-imperial-gold/15 bg-ink-charcoal/50 p-3">
          {[
            ['Bamboo', 'bamboo'],
            ['Characters', 'characters'],
            ['Dots', 'dots'],
          ].map(([label, suit]) => (
            <div key={suit} className="flex items-center gap-3">
              <span className="w-[74px] shrink-0 text-[10px] uppercase tracking-[0.14em] text-gray-500">
                {label}
              </span>
              <div className="flex flex-wrap gap-[3px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((rank) => (
                  <MahjongTile key={rank} suit={suit} rank={rank} width={32} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <h4 className="mb-2 mt-5 text-[10px] uppercase tracking-[0.18em] text-jade-accent/90">
            The three kinds of set
          </h4>
          <ul className="space-y-2 text-sm text-gray-300">
            {SETS.map((set) => (
              <li
                key={set.name}
                className="flex items-center gap-3 rounded-lg border border-imperial-gold/15 bg-ink-charcoal/60 px-2.5 py-2"
              >
                <TileRow tiles={SET_EXAMPLES[set.name]} width={30} gap="gap-1" className="w-[132px] shrink-0" />
                <span>
                  <span className="text-ivory">{set.name}</span>
                  <span className="ml-2 text-[11px] text-gray-500">{set.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mj-section">
        <h3 className="mb-3 font-serif text-xl font-bold text-imperial-gold">
          How a hand wins
        </h3>
        <ul className="space-y-2 text-sm leading-relaxed text-gray-300">
          {WINNING.map((line, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-jade-accent/70" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-xl border border-imperial-gold/15 bg-ink-black/30 p-3">
          <p className="mb-2 text-[9.5px] uppercase tracking-[0.18em] text-jade-accent/90">
            A typical winning hand
          </p>
          <TileRow
            tiles={EXAMPLE_HAND}
            width={40}
            gap="gap-1"
            className="flex-wrap"
          />
          <p className="mt-2 text-[11px] text-gray-500">
            One common shape: three runs, one pong and a pair, in two suits. Any
            mix of runs and pongs completes the four sets — this is an example,
            not the only way to win. Higher-scoring hands use the same
            four-sets-and-a-pair frame. The Seven Pairs family is the exception: seven pairs,
            no sets at all.
          </p>
        </div>
      </section>

      <section className="mj-section">
        <h3 className="mb-2 font-serif text-xl font-bold text-imperial-gold">
          Your first game
        </h3>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-gray-400">
          This is how a first round actually plays out. Steps 2 to 5 cover the
          one thing that confuses every new player: the missing suit.
        </p>

        <ol className="space-y-2.5">
          {FIRST_GAME.map((item) => (
            <li
              key={item.step}
              className="rounded-xl border border-imperial-gold/15 bg-ink-charcoal/60 p-3 sm:p-4"
            >
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-imperial-gold/30 font-mono text-[11px] text-imperial-gold">
                  {item.step}
                </span>

                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-ivory">{item.title}</h4>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-gray-400">
                    {item.body}
                  </p>

                  {item.callout && (
                    <p className="mt-2 inline-flex rounded-md border border-jade-accent/30 bg-jade-accent/5 px-2 py-1 font-mono text-[10.5px] text-jade-accent/90">
                      In game: &ldquo;{item.callout}&rdquo;
                    </p>
                  )}

                  {SHOTS[item.step] && (
                    <div className="mt-3">
                      <AnnotatedShot {...SHOTS[item.step]} />
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mj-section">
        <h3 className="mb-3 font-serif text-xl font-bold text-imperial-gold">
          Where the tiles go
        </h3>
        <ul className="space-y-3 text-sm leading-relaxed text-gray-300">
          <li>
            <span className="font-semibold text-ivory">Your hand.</span> The tiles in front of
            you. The other players see the backs of those tiles, never the faces.
          </li>
          <li>
            <span className="font-semibold text-ivory">Discards.</span> Each player throws tiles
            into the space in front of themselves, face up. The gold box marks the opposite
            player's discard pile. A discarded tile is turned to face the player who threw it,
            so it looks upside down to you.
          </li>
          <li>
            <span className="font-semibold text-ivory">Claimed sets.</span> A pong or kong taken
            from a discard is placed face up at that player's right. You can never take a discard
            to finish a run. The orange circle marks the opposite player's pong — three 七萬,
            claimed and locked. Everyone can see them, and they no longer sit in the hidden hand.
          </li>
          <li>
            <span className="font-semibold text-ivory">The wall.</span> The stacked rows in the
            middle of the table. The round ends when three players have a winning hand, or when
            every tile has been drawn. Two ways to see how much is left: the stack itself gets
            shorter, and the game prints the count at the top left of the screen. The green ring
            marks it —{' '}
            <span className="font-mono text-[11.5px] text-jade-accent/90">Deck:53</span> in the
            screenshot below.
          </li>
        </ul>

        <div className="mt-4">
          <AnnotatedShot
            src="/guides/table-layout-annotated.webp"
            alt="The table with the opposite player's pong ringed in orange, their discard pile boxed in gold, and the remaining tile count ringed in green at the top left"
            marks={[]}
            caption="Gold: that player's discards. Orange: the pong they claimed. Green: the number of tiles left in the wall."
          />
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-gray-400">
          Every seat lays its discards and claimed sets out in its own orientation, so the table
          reads differently depending on where you sit.
        </p>
      </section>

      <section className="mj-section">
        <h3 className="mb-3 font-serif text-xl font-bold text-imperial-gold">
          End of the round
        </h3>
        <ul className="space-y-2 text-sm leading-relaxed text-gray-300">
          {END_OF_GAME.map((line, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-imperial-gold/60" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mj-section">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-imperial-gold/20 pb-2">
          <h3 className="font-serif text-xl font-bold text-imperial-gold">Scoring</h3>
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
            {SCORING.length} patterns · multipliers multiply
          </p>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-gray-400">
          A winning hand can match several patterns at once, and their
          multipliers multiply: Pure Suit at x4 together with All Pongs at x2
          pays x8. Where the game says a pattern &ldquo;does not count as&rdquo;
          another, only the higher one is scored.
        </p>

        <ol className="space-y-2">
          {SCORING.map((row) => (
            <li
              key={row.name}
              className="flex gap-3 rounded-xl border border-imperial-gold/15 bg-ink-charcoal/60 p-3 transition-colors hover:border-imperial-gold/35 sm:gap-4 sm:p-4"
            >
              <span
                className={`mt-0.5 h-fit shrink-0 rounded-md border px-2 py-1 font-mono text-[11px] ${badgeClass(row.mult)}`}
              >
                ×{row.mult}
              </span>

              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-ivory">{row.name}</h4>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-gray-400">
                  {row.desc}
                  {row.partial && (
                    <span className="text-gray-600"> (the guide page cuts off here)</span>
                  )}
                </p>

                {row.sets ? (
                  <div className="mt-2.5 flex flex-wrap items-end gap-1.5 sm:gap-2">
                    {row.sets.map((set, i) => (
                      <TileRow key={i} tiles={set} width={34} gap="gap-[2px]" />
                    ))}
                  </div>
                ) : (
                  <p className="mt-1.5 text-[11px] italic text-gray-600">
                    No fixed hand — the pattern depends on how the win happens.
                  </p>
                )}

                {row.excludes.length > 0 && (
                  <p className="mt-1.5 text-[10.5px] uppercase tracking-wider text-gray-600">
                    Does not stack with:{' '}
                    <span className="normal-case tracking-normal text-gray-500">
                      {row.excludes.join(' · ')}
                    </span>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mj-section">
        <h3 className="mb-3 font-serif text-xl font-bold text-imperial-gold">
          Words you will hear
        </h3>
        <dl className="grid gap-2 sm:grid-cols-2">
          {GLOSSARY.map((entry) => (
            <div
              key={entry.term}
              className="rounded-lg border border-imperial-gold/15 bg-ink-charcoal/50 px-3 py-2"
            >
              <dt className="text-[12.5px] font-semibold text-ivory">{entry.term}</dt>
              <dd className="mt-0.5 text-[11.5px] leading-relaxed text-gray-400">
                {entry.meaning}
              </dd>
              {entry.tiles ? (
                <TileRow tiles={entry.tiles} width={32} gap="gap-1" className="mt-2" />
              ) : null}
            </div>
          ))}
        </dl>
      </section>

      <p className="mj-section text-[11px] leading-relaxed text-gray-600">
        Rules transcribed from the in-game guide. Something wrong or missing?{' '}
        <a
          href={DEFAULT_CONTENT.links.discord}
          target="_blank"
          rel="noopener noreferrer"
          className="text-imperial-gold/80 underline decoration-imperial-gold/30 underline-offset-4 transition-colors hover:text-imperial-gold"
        >
          Tell us in Discord
        </a>
        .
      </p>
    </div>
  );
}
