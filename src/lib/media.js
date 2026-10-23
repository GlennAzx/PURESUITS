/**
 * Where media files live.
 *
 * Heavy media (hero footage, gallery images and clips) is NOT committed to this
 * repository. Git keeps every version of every binary forever, so a single
 * 40 MB clip bloats every future clone even after it is deleted. Workers static
 * assets also cap a single file at 25 MiB.
 *
 * So media is served from a Cloudflare R2 bucket and referenced by URL.
 *
 * ── Configuring ────────────────────────────────────────────────────────────
 * Set VITE_MEDIA_BASE in `.env.local` (local) and in the Workers build
 * environment (deployed), with no trailing slash:
 *
 *   VITE_MEDIA_BASE=https://media.puresuit.net
 *
 * If it is unset, media() falls back to the site's own origin, so any file
 * still present in `public/` keeps working. That fallback is what lets the site
 * run before the bucket exists.
 *
 * ── Why a function and not a constant ──────────────────────────────────────
 * Every media URL in the app goes through media(). Moving buckets, adding a
 * custom domain, or reverting to local files is then one environment variable,
 * not a search and replace across components.
 */

const RAW_BASE = import.meta.env.VITE_MEDIA_BASE ?? '';

/** The configured base with any trailing slash removed. '' means same-origin. */
export const MEDIA_BASE = RAW_BASE.replace(/\/+$/, '');

/** True when media is served from a remote bucket rather than from public/. */
export const USING_REMOTE_MEDIA = MEDIA_BASE !== '';

/**
 * Build a URL for a media file.
 *
 * @param {string} path - Key within the bucket, e.g. 'hero/wwm.mp4'.
 *   A leading slash is optional.
 * @returns {string} An absolute URL when VITE_MEDIA_BASE is set, otherwise a
 *   root-relative path.
 *
 * Absolute URLs are passed through untouched, so a one-off external asset can
 * be dropped in without special-casing the caller.
 */
export function media(path) {
  if (!path) return '';
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
  const clean = path.replace(/^\/+/, '');
  return MEDIA_BASE ? `${MEDIA_BASE}/${clean}` : `/${clean}`;
}

/**
 * Media keys used by the app.
 *
 * Keep every key here rather than inline in components: this list doubles as
 * the manifest of what the bucket must contain, and `scripts/upload-media.mjs`
 * reads the same paths.
 */
export const MEDIA = {
  heroVideo: 'hero/wwm-hero.mp4',
  heroPoster: 'hero/wwm-hero-poster.jpg',
  bgm: 'audio/bgm-temple.mp3',
  // Editable content: events, weekly schedule and link URLs. Changing this
  // file does NOT need a deploy — see docs/MEDIA.md.
  siteContent: 'content/site.json',
};
