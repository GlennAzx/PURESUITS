import { useEffect, useRef } from 'react';
import { registerTransition } from '../lib/transition';

/**
 * The overlay the page transition animates.
 *
 * A single empty element. The controller fades its opacity; nothing here
 * re-renders during a transition. All styling lives in styles/transition.css.
 */
export default function PageTransition() {
  const ref = useRef(null);

  useEffect(() => {
    registerTransition(ref.current);
    return () => registerTransition(null);
  }, []);

  return <div className="pgt" ref={ref} aria-hidden="true" />;
}
