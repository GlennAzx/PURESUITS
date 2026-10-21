import React, { useEffect, useRef } from 'react';

// Pips on a 3x3 grid, index 0 top-left, 8 bottom-right.
// Keys are positions, because the CSS face transforms select on them.
// Opposite faces sum to 7, like a real die: 1/6, 3/4, 5/2.
const FACES = [
  { key: 'front', pips: [4], red: true },                        // 1
  { key: 'back', pips: [0, 2, 3, 5, 6, 8], red: false },         // 6
  { key: 'right', pips: [0, 4, 8], red: false },                 // 3
  { key: 'left', pips: [0, 2, 6, 8], red: true },                // 4
  { key: 'top', pips: [0, 2, 4, 6, 8], red: false },             // 5
  { key: 'bottom', pips: [0, 8], red: false },                   // 2
];

/**
 * A die that follows the pointer and rolls in the direction of travel.
 *
 * The real cursor is hidden while this is active, so the die IS the cursor.
 * Skipped entirely on coarse pointers (touch) and under reduced-motion.
 *
 * No React state on purpose: the position and spin are written straight to
 * style from one requestAnimationFrame loop. Re-rendering 60 times a second
 * would be the obvious way to make this lag.
 *
 * The loop stops when the die has settled, and the next pointermove restarts
 * it. An always-on rAF for a decoration is a waste of battery.
 */
export default function DiceCursor() {
  const wrapRef = useRef(null);
  const cubeRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cube = cubeRef.current;
    if (!wrap || !cube) return undefined;

    const fine = window.matchMedia('(pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || calm.matches) return undefined;

    const size = 26;
    const half = size / 2;

    let px = -100;
    let py = -100;
    let tx = -100;
    let ty = -100;
    let rx = -16;
    let ry = 24;
    let hasMoved = false;
    let idleAt = 0;
    let snapped = false;
    let snapRx = rx;
    let snapRy = ry;
    let raf = 0;
    let running = false;

    const draw = () => {
      wrap.style.transform = `translate3d(${px - half}px, ${py - half}px, 0)`;
      cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const tick = (now) => {
      const dx = tx - px;
      const dy = ty - py;
      const speed = Math.hypot(dx, dy);

      // Follow the pointer with a short lag, so the die has weight.
      // 0.38 measured at ~10px behind a pointer moving in 200px steps. Lower
      // values (0.22) trailed 32-45px and read as a broken cursor.
      px += dx * 0.38;
      py += dy * 0.38;

      if (speed > 0.6) {
        // Roll: moving right turns the die about Y, moving down about X.
        rx += dy * 0.5;
        ry -= dx * 0.5;
        idleAt = now;
        snapped = false;
      } else if (now - idleAt > 110) {
        // Settled: ease the nearest face square to the viewer.
        if (!snapped) {
          snapRx = Math.round(rx / 90) * 90;
          snapRy = Math.round(ry / 90) * 90;
          snapped = true;
        }
        rx += (snapRx - rx) * 0.16;
        ry += (snapRy - ry) * 0.16;
      }

      draw();

      const done =
        snapped &&
        Math.abs(snapRx - rx) < 0.02 &&
        Math.abs(snapRy - ry) < 0.02 &&
        speed < 0.05;

      if (done) {
        stop();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const onMove = (event) => {
      tx = event.clientX;
      ty = event.clientY;

      if (!hasMoved) {
        // Jump to the pointer on first movement: sliding in from -100,-100
        // looks like a bug.
        px = tx;
        py = ty;
        hasMoved = true;
        wrap.style.opacity = '1';
        document.documentElement.classList.add('dice-cursor-on');
      }

      idleAt = performance.now();
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    // Hiding the real cursor is session-wide, so drop the die and the class
    // together if the pointer leaves for a touch screen or a mouse unplugs.
    const onLeave = () => {
      wrap.style.opacity = '0';
    };
    const onEnter = () => {
      if (hasMoved) wrap.style.opacity = '1';
    };

    draw();
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerenter', onEnter);

    return () => {
      stop();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerenter', onEnter);
      document.documentElement.classList.remove('dice-cursor-on');
    };
  }, []);

  return (
    <div className="dice-cursor" ref={wrapRef} aria-hidden="true">
      <div className="dice-cursor__cube" ref={cubeRef}>
        {FACES.map((face) => (
          <div
            key={face.key}
            className={`dice-face dice-face--${face.key}${face.red ? ' dice-face--red' : ''}`}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="dice-cell">
                {face.pips.includes(i) ? <i className="dice-pip" /> : null}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
