import { useEffect, useRef } from 'react';
import { registerTransition } from '../lib/transition';

/**
 * The overlay the page transition animates.
 *
 * A single element. The shuffle is a pre-rendered sprite in
 * public/transition/tiles.webp, played by stepping background-position; the
 * element itself only translates. Nothing here re-renders during a transition.
 */
export default function PageTransition() {
  const ref = useRef(null);

  useEffect(() => {
    registerTransition(ref.current);
    return () => registerTransition(null);
  }, []);

  return <div className="pgt" ref={ref} aria-hidden="true" />;
}
