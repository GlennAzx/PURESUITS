import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

import FannedMahjongNav from './components/FannedMahjongNav';
import DiceCursor from './components/DiceCursor';
import HomePage from './pages/HomePage';
import MembersPage from './pages/MembersPage';
import MahjongGuidePage from './pages/MahjongGuidePage';
import BuildsPage from './pages/BuildsPage';
import GalleryPage from './pages/GalleryPage';
import NotFoundPage from './pages/NotFoundPage';
import Loader from './components/Loader';
import PageTransition from './components/PageTransition';
import { playTransition } from './lib/transition';
import { installRevealGuard } from './lib/revealGuard';
import { setLenis } from './lib/scroll';

// Register GSAP plugins once at top level
gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Routing: the page id lives in the path, and a member can add one more
 * segment — /members/awooyin — which scrolls that tile into view.
 *
 * `not_found_handling: "single-page-application"` in wrangler.jsonc is what
 * makes this work in production: Workers serves index.html for any unknown
 * path. Remove it and /members/awooyin 404s.
 */
const PAGES = ['home', 'members', 'mahjong-guide', 'builds', 'gallery'];

const TITLES = {
  home: 'PURESUIT | 清一色 - Where Winds Meet Guild',
  members: 'Members | PURESUIT',
  'mahjong-guide': 'Mahjong Guide | PURESUIT',
  builds: 'Martial Path Guides | PURESUIT',
  gallery: 'Gallery | PURESUIT',
  'not-found': '404 | PURESUIT',
};

// Boot buffer: the full branded beat on a cold load or a refresh.
//
// Deliberately NOT shown on in-app route changes. A page transition is a
// different problem and gets its own overlay (see
// .hermes/plans/2026-10-22_page-transition-overlay.md). Do not re-add a nav
// buffer here — it delays every click for something that is not loading.
const BOOT_MS = 2500;

const pathFor = (page, slug) => {
  if (page === 'home') return '/';
  if (page === 'members' && slug) return `/members/${encodeURIComponent(slug)}`;
  // 'not-found' is never a navigation target, only a render result, so it has
  // no path of its own — the URL the visitor typed stays in the bar.
  if (page === 'not-found') return window.location.pathname;
  return `/${page}`;
};

function parseRoute() {
  const segs = window.location.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
  // An unknown first segment is a 404, not the home page. Falling back to home
  // served the front page with a 200 for every typo, which hides broken links
  // from everyone including us.
  let page;
  if (segs.length === 0) page = 'home';
  else if (PAGES.includes(segs[0])) page = segs[0];
  else page = 'not-found';
  const slug = page === 'members' && segs[1] ? segs[1] : null;
  // source tells the members page how the slug arrived. 'click' scrolls to the
  // tile; 'load' means the URL was typed, shared or refreshed, and that must
  // return to the top of the page instead.
  return { page, slug, source: 'load' };
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);
  const mainRef = useRef(null);
  const lenisRef = useRef(null);
  const activePage = route.page;

  // Back / Forward. Without this the URL changes but the view does not.
  useEffect(() => {
    // Back/Forward already changed the URL, so only the state is committed.
    const onPop = () => playTransition(() => setRoute(parseRoute()));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Navigation: update the view and push a history entry.
  const navigate = useCallback((page, slug = null) => {
    const next = PAGES.includes(page) ? page : 'home';
    const nextSlug = next === 'members' ? slug : null;
    const url = pathFor(next, nextSlug);

    // The state update and the history push happen INSIDE the transition, at
    // the instant the tile wall covers the screen, so the swap is never seen.
    playTransition(() => {
      setRoute({ page: next, slug: nextSlug, source: nextSlug ? 'click' : 'load' });
      if (window.location.pathname !== url) {
        window.history.pushState({ page: next, slug: nextSlug }, '', url);
      }
    });
  }, []);

  // Clicking outside a member drops the slug from the URL but does not move the
  // page. replaceState, not pushState: an outside click is not a navigation.
  const clearSlug = useCallback(() => {
    setRoute((r) => (r.slug ? { page: r.page, slug: null, source: 'load' } : r));
    if (window.location.pathname !== '/members') {
      window.history.replaceState({ page: 'members', slug: null }, '', '/members');
    }
  }, []);

  // A slug that arrived from the URL — typed, shared, or a refresh — is not a
  // navigation target. The page stays at the top and the slug is dropped, so a
  // refresh always lands on the plain list.
  useEffect(() => {
    if (route.page === 'members' && route.slug && route.source === 'load') {
      window.history.replaceState({ page: 'members', slug: null }, '', '/members');
      setRoute({ page: 'members', slug: null, source: 'load' });
    }
  }, [route]);

  useEffect(() => {
    document.title = TITLES[activePage] ?? TITLES.home;
  }, [activePage]);

  // Initialize Lenis smooth scroll + sync with GSAP ScrollTrigger
  useEffect(() => {
    // scrollRestoration is set to 'manual' by an inline script in index.html,
    // not here: ScrollTrigger captures the value at import time and restores it
    // later, so setting it from React only gets undone.
    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.1,
      smoothWheel: true,
    });
    lenisRef.current = lenis;
    setLenis(lenis);

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
      setLenis(null);
      lenis.destroy();
    };
  }, []);

  // Scroll to top when the PAGE changes — keyed on activePage, deliberately not
  // on the whole route. Keying on the route meant that consuming a member slug
  // changed `route` and yanked the view back to the top, cancelling the very
  // scroll the deep link had just started.
  // Do NOT kill all ScrollTriggers here: useGSAP already reverts each page's
  // own animations on unmount, and killing globally would also kill the
  // triggers the new page just created.
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
        return (
          <MembersPage
            focusSlug={route.slug}
            focusSource={route.source}
            onOpenMember={(slug) => navigate('members', slug)}
            onClearSlug={clearSlug}
          />
        );
      case 'mahjong-guide':
        return <MahjongGuidePage />;
      case 'builds':
        return <BuildsPage />;
      case 'gallery':
        return <GalleryPage />;
      case 'not-found':
        return <NotFoundPage onNavigate={navigate} />;
      default:
        return <HomePage setActivePage={navigate} />;
    }
  };

  return (
    <div ref={mainRef} className="page-shell min-h-screen bg-ink-black text-gray-200">
      <Loader ms={BOOT_MS} />
      <PageTransition />
      <DiceCursor />
      <FannedMahjongNav activePage={activePage} setActivePage={navigate} />
      <main className="pb-16">{renderPage()}</main>
    </div>
  );
}
