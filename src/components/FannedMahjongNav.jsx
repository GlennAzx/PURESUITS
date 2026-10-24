import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { PanelRightOpen, X, ChevronLeft } from 'lucide-react';
import MahjongTile from './MahjongTile';
import {
  HomeGlyph,
  PersonGlyph,
  HammerGlyph,
  GalleryGlyph,
} from './NavIcons';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', Icon: HomeGlyph, tone: 'wind' },
  { id: 'members', label: 'Members', Icon: PersonGlyph, tone: 'red' },
  { id: 'mahjong-guide', label: 'Mahjong Guide', glyph: '發', tone: 'green' },
  { id: 'builds', label: 'Builds', Icon: HammerGlyph, tone: 'wind' },
  { id: 'gallery', label: 'Gallery', Icon: GalleryGlyph, tone: 'blue' },
];

// --- Tune the fan here -----------------------------------------------------
const RADIUS = 150; // px from the handle to each tile centre
const SPREAD = 68; // degrees above and below horizontal
// The nav only closes once the pointer leaves this circle. Independent of
// RADIUS so the drop field stays generous even with a tight fan.
const RESET_RADIUS = 340;
// ---------------------------------------------------------------------------

const toRad = (deg) => (deg * Math.PI) / 180;

export default function FannedMahjongNav({ activePage, setActivePage }) {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef(null);
  const handleRef = useRef(null);
  const layerRef = useRef(null);

  // Close when the pointer leaves the enlarged drop field, on Escape,
  // or on a click outside the anchor.
  useEffect(() => {
    if (!isOpen) return;

    const onMove = (e) => {
      const el = handleRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) > RESET_RADIUS) {
        setIsOpen(false);
      }
    };

    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const onDocClick = (e) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDocClick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [isOpen]);

  useGSAP(
    () => {
      gsap.from(handleRef.current, {
        opacity: 0,
        x: 24,
        duration: 0.5,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
        delay: 1.05,
      });
    },
    { scope: anchorRef }
  );

  useGSAP(
    () => {
      if (!isOpen || !layerRef.current) return;
      gsap.from('.arc-tile', {
        scale: 0.9,
        opacity: 0,
        duration: 0.28,
        stagger: 0.04,
        ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
        // Clear inline styles so the CSS group-hover scale can take over
        clearProps: 'transform,opacity',
      });
    },
    { scope: anchorRef, dependencies: [isOpen] }
  );

  const choose = (id) => {
    setActivePage(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Scrim. No backdrop-filter here on purpose: a full-viewport blur over
          the playing hero video forces the compositor to re-blur the whole
          screen every frame of the fade, which is the main source of lag when
          the pane opens. A painted gradient costs nothing to animate. */}
      <div
        aria-hidden="true"
        className={`nav-scrim fixed inset-0 z-40 transition-opacity duration-200 pointer-events-none ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* On phones the handle drops to the bottom right: at its desktop position
          (vertically centred) it is a 48px rail sitting on the last letter of
          the PURESUIT wordmark at 320-430px. Moving the rail is a smaller
          compromise than shrinking the hero type, and it costs nothing on
          desktop where the wordmark is narrower than the viewport. */}
      <aside className="fixed right-0 top-0 bottom-0 z-50 flex items-end justify-end pb-24 pointer-events-none sm:items-center sm:pb-0">
        <div ref={anchorRef} className="relative pointer-events-auto">
          <div
            ref={layerRef}
            className={`absolute right-0 top-1/2 w-0 h-0 transition-opacity duration-200 ${
              isOpen ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={!isOpen}
          >
            {NAV_ITEMS.map((item, index) => {
              const t =
                NAV_ITEMS.length === 1 ? 0.5 : index / (NAV_ITEMS.length - 1);
              const angle = -SPREAD + t * (SPREAD * 2);
              const rad = toRad(angle);
              const dx = -RADIUS * Math.cos(rad);
              const dy = RADIUS * Math.sin(rad);
              const isActive = activePage === item.id;

              return (
                <div
                  key={item.id}
                  className={`absolute group ${isOpen ? 'hover:z-30' : ''}`}
                  style={{
                    left: `${dx}px`,
                    top: `${dy}px`,
                    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => choose(item.id)}
                    disabled={!isOpen}
                    tabIndex={isOpen ? 0 : -1}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                    className={`arc-tile relative block bg-transparent border-0 p-0 origin-center transition-transform duration-200 ease-out-strong group-hover:scale-110 ${
                      isOpen
                        ? 'pointer-events-auto cursor-pointer'
                        : 'pointer-events-none'
                    }`}
                  >
                    <MahjongTile
                      glyph={item.glyph}
                      icon={item.Icon ? <item.Icon /> : undefined}
                      tone={item.tone}
                      size="md"
                      className={
                        isActive ? 'ring-2 ring-imperial-gold rounded-[7px]' : ''
                      }
                    />

                    {isActive && (
                      <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-imperial-gold" />
                    )}

                    <span
                      className="hover-only absolute whitespace-nowrap px-2.5 py-1 bg-ink-charcoal border border-imperial-gold/40 rounded text-[11px] text-imperial-gold opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg"
                      style={{
                        right: '100%',
                        top: '50%',
                        marginRight: 12,
                        transform: `translateY(-50%) rotate(${-angle}deg)`,
                      }}
                    >
                      {item.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <button
            ref={handleRef}
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
            className="group relative flex flex-col items-center justify-center gap-1.5 w-12 hover:w-20 active:w-11 h-24 rounded-l-xl bg-ink-charcoal/95 border border-r-0 border-imperial-gold/35 text-imperial-gold cursor-pointer transition-[width,box-shadow,border-color,color,background-color] duration-200 ease-out-strong hover:border-imperial-gold hover:bg-ink-charcoal hover:text-imperial-gold-bright shadow-[-6px_0_18px_rgba(0,0,0,0.6)] hover:shadow-[-10px_0_30px_rgba(212,175,55,0.28)]"
          >
            {isOpen ? (
              <X size={16} />
            ) : (
              <PanelRightOpen
                size={16}
                className="transition-transform duration-200 group-hover:-translate-x-0.5"
              />
            )}
            <span className="text-[10px] font-serif font-bold tracking-[0.2em] [writing-mode:vertical-rl]">
              {isOpen ? 'CLOSE' : '牌 NAV'}
            </span>
            <ChevronLeft
              size={12}
              aria-hidden="true"
              className={`text-imperial-gold-bright transition-opacity duration-200 ${
                isOpen ? 'opacity-0' : 'opacity-0 group-hover:opacity-80'
              }`}
            />
          </button>
        </div>
      </aside>
    </>
  );
}
