import React, { useState, useEffect, useRef } from 'react';
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

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const mainRef = useRef(null);
  const lenisRef = useRef(null);

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
        return <HomePage setActivePage={setActivePage} />;
      case 'members':
        return <MembersPage />;
      case 'mahjong-guide':
        return <MahjongGuidePage />;
      case 'builds':
        return <BuildsPage />;
      case 'gallery':
        return <GalleryPage />;
      default:
        return <HomePage setActivePage={setActivePage} />;
    }
  };

  return (
    <div ref={mainRef} className="min-h-screen bg-ink-black text-gray-200">
      <FannedMahjongNav activePage={activePage} setActivePage={setActivePage} />
      <main className="pb-16">{renderPage()}</main>
    </div>
  );
}
