import { useEffect } from 'react';

/**
 * 404.
 *
 * A 白板 (white dragon) tile — the blank one. The joke lands for anyone who
 * plays: you drew the blank tile, there is nothing on this face.
 *
 * Before this existed, parseRoute() silently fell back to Home, so a typo in
 * the URL showed the front page with the hero video and a 200. That hides
 * broken links instead of reporting them.
 */
export default function NotFoundPage({ onNavigate }) {
  useEffect(() => {
    document.title = '404 | PURESUIT';
  }, []);

  return (
    <section className="nf">
      <div className="nf__tile" aria-hidden="true">
        <div className="nf__face" />
      </div>

      <p className="nf__code">404 · 白板</p>
      <h1 className="nf__title">A blank tile</h1>
      <p className="nf__body">
        Nothing is drawn on this face. The page you asked for is not part of the
        wall.
      </p>

      <div className="nf__actions">
        <button type="button" className="nf__btn" onClick={() => onNavigate('home')}>
          Back to the table
        </button>
        <button
          type="button"
          className="nf__btn nf__btn--ghost"
          onClick={() => onNavigate('members')}
        >
          See the roster
        </button>
      </div>
    </section>
  );
}
