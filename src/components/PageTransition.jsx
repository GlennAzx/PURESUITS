import { useEffect, useRef } from 'react';
import { registerTransition } from '../lib/transition';

/**
 * The overlay the page transition animates.
 *
 * One element. The tile wall is painted by CSS gradients in
 * src/styles/transition.css, so this stays cheap to mount and never re-renders.
 */
export default function PageTransition() {
  const ref = useRef(null);

  useEffect(() => {
    registerTransition(ref.current);
    return () => registerTransition(null);
  }, []);

  return <div className="pgt" ref={ref} aria-hidden="true" />;
}
