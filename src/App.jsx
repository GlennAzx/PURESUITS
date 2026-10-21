import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

import FannedMahjongNav from './components/FannedMahjongNav';
import HomePage from './pages/HomePage';
import MembersPage from './pages/MembersPage';
import MahjongGuidePage from './pages/MahjongGuidePage';
import BuildsPage from './pages/BuildsPage';
import GalleryPage from './pages/GalleryPage';
import { installRevealGuard } from './lib/revealGuard';

// Register GSAP plugins once at top level
gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Routing: real URLs, not React state alone.
 *
 * The page id lives in the path — `/`, `/members`, `/builds` — so a refresh
 * keeps the page, links are shareable, and Back/Forward work. State alone made
 * every reload boot at Home.
 *
 * `not_found_handling: "single-page-application"` in wrangler.jsonc is what
 * makes this work in production: Workers serves index.html for any unknown
 * path instead of a 404. Remove that and a direct visit to /members 404s.
 */
const PAGES = ['home', 'members', 'mahjong-guide', 'builds', 'gallery'];

const TITLES = {
  home: 'PURESUIT | 清一色 - Where Winds Meet Guild',
  members: 'Members | PURESUIT',
  'mahjong-guide': 'Mahjong Guide | PURESUIT',
  builds: 'Martial Path Guides | PURESUIT',
  gallery: 'Gallery | PURESUIT',
};

const pathFor = (page) => (page === 'home' ? '/' : `/${page}`);

function pageFromPath() {
  const seg = window.location.pathname.replace(/^\/+|\/+$/g, '');
  return PAGES.includes(seg) ? seg : 'home';
}

export default function App() {
  const [activePage, setActivePage] = useState(pageFromPath);
  const mainRef = useRef(null);
  const lenisRef = useRef(null);

  // Back / Forward. Without this the URL changes but the view does not.
  useEffect(() => {
    const onPop = () => setActivePage(pageFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Navigation: update the view and push a history entry.
  const navigate = useCallback((page) => {
    const next = PAGES.includes(page) ? page : 'home';
    setActivePage(next);
    const url = pathFor(next);
    if (window.location.pathname !== url) {
      window.history.pushState({ page: next }, '', url);
    }
  }, []);

  useEffect(() => {
    document.title = TITLES[activePage] ?? TITLES.home;
  }, [activePage]);

  // Initialize Lenis smooth scroll + sync with GSAP ScrollTrigger
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.1,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    // Sync Lenis scroll position to ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Tie Lenis into GSAP ticker (shared RAF loop)
    const onTick = (time) => {
      lenis.raf(time * 1000); // gsap ticker gives seconds, lenis wants ms
    };
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0); // prevent GSAP from compensating for lag

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  // Scroll to top on page change. Do NOT kill all ScrollTriggers here:
  // useGSAP already reverts each page's own animations on unmount. Killing
  // globally would also kill the triggers the new page just created, because
  // this effect runs after the child's useGSAP (layout effect).
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
    // Recalculate positions for the new page's content
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    // Safety net: if an entrance tween never completes, reveal what is on screen
    const removeGuard = installRevealGuard(2600);
    return () => {
      cancelAnimationFrame(id);
      removeGuard();
    };
  }, [activePage]);

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage setActivePage={navigate} />;
      case 'members':
        return <MembersPage />;
      case 'mahjong-guide':
        return <MahjongGuidePage />;
      case 'builds':
        return <BuildsPage />;
      case 'gallery':
        return <GalleryPage />;
      default:
        return <HomePage setActivePage={navigate} />;
    }
  };

  return (
    <div ref={mainRef} className="min-h-screen bg-ink-black text-gray-200">
      <FannedMahjongNav activePage={activePage} setActivePage={navigate} />
      <main className="pb-16">{renderPage()}</main>
    </div>
  );
}
