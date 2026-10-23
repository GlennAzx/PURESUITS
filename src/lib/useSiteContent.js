import { useEffect, useState } from 'react';
import { DEFAULT_CONTENT, fetchContent } from './siteContent';

/**
 * Loads the remote content file once per page load.
 *
 * Starts from DEFAULT_CONTENT so the first paint already has the schedule —
 * no empty flash, no layout jump. When the fetch lands, the content is swapped
 * in. If the fetch fails, fetchContent resolves to the defaults and the page
 * looks exactly as it did before the file existed.
 *
 * @returns {{content: object, loaded: boolean}}
 */
export default function useSiteContent() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchContent().then((next) => {
      // The page can unmount before the fetch resolves, for example when a
      // visitor navigates away immediately.
      if (!alive) return;
      setContent(next);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { content, loaded };
}
