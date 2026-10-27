/**
 * Worker for the PURESUIT site.
 *
 * The site itself is static assets. This Worker exists for one reason: static
 * hosting cannot accept a write. The admin page needs to add, edit and delete
 * events on the live site with no build and no deploy, so something has to
 * write to the R2 bucket that holds the content.
 *
 * Routes:
 *   GET  /api/content  - the current content JSON (public; it is public anyway)
 *   POST /api/auth     - check a token without changing anything
 *   PUT  /api/events   - replace the events array (requires the admin token)
 *
 * Everything else falls through to the static assets.
 *
 * Auth is a single bearer token held as a Worker secret. It is never sent to
 * the browser in the bundle: the admin page asks the visitor to paste it, keeps
 * it in localStorage, and sends it per request. A token in the bundle would be
 * readable by anyone who views source.
 */

const CONTENT_KEY = 'content/site.json';

/** Compare two strings without leaking length or content through timing. */
async function safeEqual(a, b) {
  const encoder = new TextEncoder();
  // Hash first so the comparison is always over equal-length input.
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i += 1) diff |= va[i] ^ vb[i];
  return diff === 0;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // The admin page must never read a cached copy of its own writes.
      'cache-control': 'no-store',
    },
  });
}

/** Pull the bearer token out of the Authorization header. */
function bearer(request) {
  const header = request.headers.get('Authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : '';
}

async function authorised(request, env) {
  // With no secret configured the API is closed, not open. Failing closed
  // matters: a missing secret must not turn every visitor into an admin.
  if (!env.ADMIN_TOKEN) return false;
  const token = bearer(request);
  if (!token) return false;
  return safeEqual(token, env.ADMIN_TOKEN);
}

async function readContent(env) {
  const object = await env.MEDIA.get(CONTENT_KEY);
  if (!object) return { events: [], schedule: [], links: {}, featured: null, rev: 0 };
  return JSON.parse(await object.text());
}

/**
 * Write the content file and bump its revision.
 *
 * Two admins can have the page open at once. Each save replaces whole sections
 * of this one file, so a save built from an older copy would silently undo the
 * other person's work. `rev` is what lets a save say which version it was built
 * from; see revCheck().
 *
 * @returns {Promise<object>} The stored object, with the new rev.
 */
async function writeContent(env, content) {
  const next = {
    ...content,
    rev: Number(content.rev || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  await env.MEDIA.put(CONTENT_KEY, JSON.stringify(next, null, 2), {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8',
      // Same reasoning as the upload script: this key is rewritten in place,
      // so an immutable header would freeze the old copy in every browser.
      cacheControl: 'no-cache',
    },
  });
  return next;
}

/**
 * Refuse a save built from an older copy of the content file.
 *
 * The header is `If-Match: <rev>`, the value the admin loaded. A mismatch means
 * someone saved in between, so this save would undo their change. Returning 409
 * with the current rev lets the panel say who changed what instead of quietly
 * overwriting it.
 *
 * No header means no check, so an older admin build keeps working.
 */
function revCheck(request, content) {
  const raw = request.headers.get('If-Match');
  if (!raw) return null;

  const current = Number(content.rev || 0);
  const claimed = Number(String(raw).replace(/"/g, '').trim());
  if (Number.isFinite(claimed) && claimed === current) return null;

  return json(
    {
      error: 'stale',
      message: 'Another admin saved a change first. Reload to see their version.',
      rev: current,
      updatedAt: content.updatedAt || null,
    },
    409
  );
}

// Storage limits for gallery photos, sized against the R2 free tier: 10 GB
// stored and 1M writes a month. 4 GB leaves room for the hero video, the BGM
// and growth, and 800 photos at the ~400 KB the admin compresses to is about
// 320 MB, so the byte cap is the one that can actually bite.
const MAX_GALLERY_PHOTOS = 800;
const MAX_GALLERY_BYTES = 4 * 1024 * 1024 * 1024;

/** Shape-check one event. Returns a clean object or throws. */
function validateEvent(raw, index) {
  if (!raw || typeof raw !== 'object') throw new Error(`event ${index} is not an object`);

  const str = (v, name, max = 400) => {
    if (v === undefined || v === null) return '';
    if (typeof v !== 'string') throw new Error(`event ${index}: ${name} must be text`);
    if (v.length > max) throw new Error(`event ${index}: ${name} is too long`);
    return v.trim();
  };

  const title = str(raw.title, 'title', 120);
  if (!title) throw new Error(`event ${index}: title is required`);

  const date = str(raw.date, 'date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`event ${index}: date must be YYYY-MM-DD`);
  }

  const time = str(raw.time, 'time', 5);
  if (!/^\d{1,2}:\d{2}$/.test(time)) {
    throw new Error(`event ${index}: time must be HH:MM`);
  }

  const duration = Number(raw.durationMinutes);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 24 * 60) {
    throw new Error(`event ${index}: durationMinutes must be between 1 and 1440`);
  }

  return {
    id: str(raw.id, 'id', 64) || `event-${Date.now()}-${index}`,
    title,
    description: str(raw.description, 'description', 600),
    date,
    time,
    durationMinutes: Math.round(duration),
    location: str(raw.location, 'location', 160),
    tag: str(raw.tag, 'tag', 40) || 'Event',
    link: str(raw.link, 'link', 300),
  };
}

/**
 * Shape-check one recurring schedule entry. Returns a clean object or throws.
 *
 * Stored in the same shape the site already reads: `time` as {h,m} and
 * `weekdays` as numbers where 0 = Sunday, so old and new entries look alike in
 * the JSON file.
 */
function validateScheduleEntry(raw, index) {
  if (!raw || typeof raw !== 'object') throw new Error(`schedule ${index} is not an object`);

  const str = (v, name, max = 400) => {
    if (v === undefined || v === null) return '';
    if (typeof v !== 'string') throw new Error(`schedule ${index}: ${name} must be text`);
    if (v.length > max) throw new Error(`schedule ${index}: ${name} is too long`);
    return v.trim();
  };

  const name = str(raw.name, 'name', 120);
  if (!name) throw new Error(`schedule ${index}: name is required`);

  // Accept "21:30" or {h,m}; always store {h,m}.
  let h;
  let m;
  if (raw.time && typeof raw.time === 'object') {
    h = Number(raw.time.h);
    m = Number(raw.time.m);
  } else {
    const text = str(raw.time, 'time', 5);
    if (!/^\d{1,2}:\d{2}$/.test(text)) throw new Error(`schedule ${index}: time must be HH:MM`);
    [h, m] = text.split(':').map(Number);
  }
  if (!Number.isInteger(h) || h < 0 || h > 23) throw new Error(`schedule ${index}: hour must be 0-23`);
  if (!Number.isInteger(m) || m < 0 || m > 59) throw new Error(`schedule ${index}: minute must be 0-59`);

  const duration = raw.durationMinutes === undefined ? 60 : Number(raw.durationMinutes);
  if (!Number.isFinite(duration) || duration < 0 || duration > 24 * 60) {
    throw new Error(`schedule ${index}: durationMinutes must be between 0 and 1440`);
  }

  const cadence = raw.cadence === 'daily' ? 'daily' : 'weekly';

  const weekdays = Array.isArray(raw.weekdays)
    ? [...new Set(
        raw.weekdays
          .map((d) => Number(d))
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      )].sort((a, b) => a - b)
    : [];

  if (cadence === 'weekly' && weekdays.length === 0) {
    throw new Error(`schedule ${index}: a weekly event needs at least one weekday`);
  }

  const entry = {
    id: str(raw.id, 'id', 64) || `schedule-${index}`,
    name,
    category: str(raw.category, 'category', 40) || 'Event',
    cadence,
    time: { h, m },
    weekdays: cadence === 'daily' ? [] : weekdays,
    durationMinutes: Math.round(duration),
    description: str(raw.description, 'description', 400),
  };

  // Per-day start times are an existing feature of the JSON. Carry them through
  // rather than dropping them on the next save.
  if (raw.timeByWeekday && typeof raw.timeByWeekday === 'object' && !Array.isArray(raw.timeByWeekday)) {
    const byDay = {};
    for (const [day, value] of Object.entries(raw.timeByWeekday)) {
      const d = Number(day);
      if (!Number.isInteger(d) || d < 0 || d > 6) continue;
      const text = String(value);
      if (!/^\d{1,2}:\d{2}$/.test(text)) continue;
      const [hh, mm] = text.split(':').map(Number);
      byDay[d] = { h: hh, m: mm };
    }
    if (Object.keys(byDay).length) entry.timeByWeekday = byDay;
  }

  return entry;
}

/**
 * Store an uploaded image and return its R2 key.
 *
 * The key, not a full URL, is what gets saved into content. The site turns a
 * bare key into a URL through media(), so the bucket domain lives in exactly
 * one place and moving to another domain does not rewrite stored records.
 *
 * Filenames are made unique on purpose. A replaced image gets a NEW key rather
 * than overwriting the old one, because the bucket serves images with a one-year
 * immutable cache: reusing a key would leave every browser showing the old
 * picture for a year, with no way to purge it.
 */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function extensionFor(file) {
  const byName = /\.([a-z0-9]+)$/i.exec(file.name || '');
  if (byName) {
    const ext = byName[1].toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(ext)) return ext;
  }
  const byType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
  }[file.type];
  return byType || null;
}

async function handleUpload(request, env, url) {
  if (!(await authorised(request, env))) {
    return json({ error: 'invalid token' }, 401);
  }

  const kind = url.searchParams.get('kind');
  if (kind !== 'gallery' && kind !== 'members' && kind !== 'builds') {
    return json({ error: 'kind must be gallery, members or builds' }, 400);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'expected multipart/form-data' }, 400);
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return json({ error: 'no file field' }, 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return json({ error: `file is too large (max ${MAX_UPLOAD_BYTES / 1048576} MB)` }, 413);
  }
  if (file.type && !file.type.startsWith('image/')) {
    return json({ error: `not an image (${file.type})` }, 415);
  }

  const ext = extensionFor(file);
  if (!ext) return json({ error: 'unsupported image type' }, 415);

  const key = `${kind}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || `image/${ext}`,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  // `bytes` is the size the server actually stored, so the admin can show real
  // usage without trusting a number sent by the browser.
  return json({ ok: true, key, bytes: file.size });
}

async function handleApi(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/content' && request.method === 'GET') {
    try {
      return json(await readContent(env));
    } catch (err) {
      return json({ error: `could not read content: ${err.message}` }, 500);
    }
  }

  if (url.pathname === '/api/upload' && request.method === 'POST') {
    try {
      return await handleUpload(request, env, url);
    } catch (err) {
      return json({ error: `upload failed: ${err.message}` }, 500);
    }
  }

  if (url.pathname === '/api/auth' && request.method === 'POST') {
    return (await authorised(request, env))
      ? json({ ok: true })
      : json({ error: 'invalid token' }, 401);
  }

  // Kaki of the Week: one featured member shown on the landing page. A single
  // object rather than a list, because there is only ever one.
  if (url.pathname === '/api/featured' && request.method === 'PUT') {
    if (!(await authorised(request, env))) {
      return json({ error: 'invalid token' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'body is not valid JSON' }, 400);
    }

    const raw = body.featured;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return json({ error: 'body must contain a featured object' }, 400);
    }

    const featured = {
      enabled: Boolean(raw.enabled),
      memberId: raw.memberId ? String(raw.memberId).slice(0, 64) : null,
      name: String(raw.name ?? '').trim().slice(0, 60),
      role: String(raw.role ?? '').trim().slice(0, 40),
      blurb: String(raw.blurb ?? '').trim().slice(0, 400),
      image: raw.image ? String(raw.image).slice(0, 300) : null,
      weekOf: raw.weekOf ? String(raw.weekOf).slice(0, 10) : null,
    };

    // A featured card with no name is a blank space on the landing page. Refuse
    // it while it is still an obvious mistake.
    if (featured.enabled && !featured.name) {
      return json({ error: 'a featured member needs a name' }, 400);
    }

    try {
      const content = await readContent(env);
      const stale = revCheck(request, content);
      if (stale) return stale;
      content.featured = featured;
      const saved = await writeContent(env, content);
      return json({ ok: true, featured: saved.featured, rev: saved.rev });
    } catch (err) {
      return json({ error: `could not save: ${err.message}` }, 500);
    }
  }

  if (url.pathname === '/api/events' && request.method === 'PUT') {
    if (!(await authorised(request, env))) {
      return json({ error: 'invalid token' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'body is not valid JSON' }, 400);
    }

    if (!Array.isArray(body.events)) {
      return json({ error: 'body must contain an events array' }, 400);
    }
    if (body.events.length > 60) {
      return json({ error: 'too many events (max 60)' }, 400);
    }

    let events;
    try {
      events = body.events.map(validateEvent);
    } catch (err) {
      return json({ error: err.message }, 400);
    }

    try {
      // Read-modify-write so the schedule and links in the same file survive.
      const content = await readContent(env);
      const stale = revCheck(request, content);
      if (stale) return stale;
      content.events = events;
      const saved = await writeContent(env, content);
      return json({ ok: true, events, rev: saved.rev });
    } catch (err) {
      return json({ error: `could not save: ${err.message}` }, 500);
    }
  }

  // Save the weekly schedule shown on the home page. Same read-modify-write as
  // /api/events, so events and links in the same file survive.
  if (url.pathname === '/api/schedule' && request.method === 'PUT') {
    if (!(await authorised(request, env))) {
      return json({ error: 'invalid token' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'body is not valid JSON' }, 400);
    }

    if (!Array.isArray(body.schedule)) {
      return json({ error: 'body must contain a schedule array' }, 400);
    }
    if (body.schedule.length > 40) {
      return json({ error: 'too many schedule entries (max 40)' }, 400);
    }

    let schedule;
    try {
      schedule = body.schedule.map(validateScheduleEntry);
    } catch (err) {
      return json({ error: err.message }, 400);
    }

    try {
      const content = await readContent(env);
      const stale = revCheck(request, content);
      if (stale) return stale;
      content.schedule = schedule;
      const saved = await writeContent(env, content);
      return json({ ok: true, schedule: saved.schedule, rev: saved.rev });
    } catch (err) {
      return json({ error: `could not save: ${err.message}` }, 500);
    }
  }

  // Save the gallery and member-portrait lists. Same read-modify-write as
  // /api/events so the schedule, events and links in the same file survive.
  if (url.pathname === '/api/images' && request.method === 'PUT') {
    if (!(await authorised(request, env))) {
      return json({ error: 'invalid token' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'body is not valid JSON' }, 400);
    }

    const clean = (list, name, shape) => {
      if (list === undefined) return undefined;
      if (!Array.isArray(list)) throw new Error(`${name} must be an array`);
      if (list.length > 400) throw new Error(`${name} has too many entries`);
      return list.map((item, i) => shape(item, i));
    };

    let gallery;
    try {
      gallery = clean(body.gallery, 'gallery', (item, i) => {
        if (!item || typeof item !== 'object') throw new Error(`gallery ${i} is not an object`);

        // An album is a header plus a list of photos. Content saved before
        // albums existed stored one image per slot, so an item with `image` and
        // no `photos` is read as a single-photo album. Without this an older
        // content file would lose every picture on the next save.
        const rawPhotos = Array.isArray(item.photos)
          ? item.photos
          : item.image
            ? [{ id: `${item.id || `g-${i}`}-p1`, image: item.image }]
            : [];

        if (rawPhotos.length > 300) throw new Error(`album ${i} has too many photos`);

        const photos = rawPhotos.map((p, j) => {
          if (!p || typeof p !== 'object') throw new Error(`album ${i} photo ${j} is not an object`);
          if (!p.image) throw new Error(`album ${i} photo ${j} has no image`);
          return {
            id: String(p.id || `p-${i}-${j}`).slice(0, 64),
            image: String(p.image).slice(0, 300),
            caption: p.caption ? String(p.caption).slice(0, 160) : '',
            // Small copy for grids. Absent on photos uploaded before thumbnails
            // existed; the site falls back to the full image for those.
            thumb: p.thumb ? String(p.thumb).slice(0, 300) : null,
            // Stored size, used to enforce the gallery budget. Older entries
            // have no figure; those count as 0 and are never rejected.
            bytes: Number.isFinite(Number(p.bytes)) ? Math.max(0, Math.round(Number(p.bytes))) : 0,
          };
        });

        return {
          id: String(item.id || `g-${i}`).slice(0, 64),
          title: String(item.title || '').slice(0, 120),
          photos,
        };
      });
    } catch (err) {
      return json({ error: err.message }, 400);
    }

    // Budget check. Counting photos here and summing the sizes the server
    // recorded keeps the gallery inside the R2 free tier whatever the client
    // claims.
    if (gallery !== undefined) {
      const photos = gallery.reduce((n, a) => n + a.photos.length, 0);
      if (photos > MAX_GALLERY_PHOTOS) {
        return json(
          { error: `gallery is full (${MAX_GALLERY_PHOTOS} photos max, ${photos} requested)` },
          400
        );
      }
      const bytes = gallery.reduce(
        (n, a) => n + a.photos.reduce((m, p) => m + (p.bytes || 0), 0),
        0
      );
      if (bytes > MAX_GALLERY_BYTES) {
        return json(
          {
            error: `gallery is over its storage budget (${(bytes / 1024 ** 3).toFixed(2)} GB of ${(
              MAX_GALLERY_BYTES / 1024 ** 3
            ).toFixed(0)} GB). Delete some photos.`,
          },
          413
        );
      }
    }

    try {
      const content = await readContent(env);
      const stale = revCheck(request, content);
      if (stale) return stale;

      // Only the gallery. Member portraits moved to /api/members with the rest
      // of the roster; accepting a member list here let a caller write a
      // two-field stub over real names.
      if (gallery !== undefined) content.gallery = gallery;
      const saved = await writeContent(env, content);
      return json({ ok: true, gallery: saved.gallery, rev: saved.rev });
    } catch (err) {
      return json({ error: `could not save: ${err.message}` }, 500);
    }
  }

  // Save the full member roster. Separate from /api/images because this is the
  // source of truth for who is in the guild, not just which portrait they use;
  // a bad write here can empty the Members page, so it validates hard.
  if (url.pathname === '/api/members' && request.method === 'PUT') {
    if (!(await authorised(request, env))) {
      return json({ error: 'invalid token' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'body is not valid JSON' }, 400);
    }

    if (!Array.isArray(body.members)) {
      return json({ error: 'body must contain a members array' }, 400);
    }
    if (body.members.length === 0) {
      // An empty roster is almost certainly a mistake, and it would take the
      // whole page down. Refuse it explicitly.
      return json({ error: 'refusing to save an empty roster' }, 400);
    }
    if (body.members.length > 300) {
      return json({ error: 'too many members (max 300)' }, 400);
    }

    const TIERS = ['guild_leader', 'deputy', 'commander', 'member'];
    const seenIds = new Set();
    const seenSlugs = new Set();
    let members;
    try {
      members = body.members.map((raw, i) => {
        if (!raw || typeof raw !== 'object') throw new Error(`member ${i} is not an object`);

        const name = String(raw.name ?? '').trim().slice(0, 60);
        if (!name) throw new Error(`member ${i}: name is required`);

        const id = String(raw.id ?? '').trim().slice(0, 64);
        if (!id) throw new Error(`member ${i}: id is required`);
        if (seenIds.has(id)) throw new Error(`duplicate id "${id}"`);
        seenIds.add(id);

        // /members/<slug> resolves by name, so two members with the same name
        // would fight over one URL. Catch it here rather than in production.
        const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || id;
        if (seenSlugs.has(slug)) throw new Error(`duplicate name slug "${slug}"`);
        seenSlugs.add(slug);

        const tier = String(raw.tier ?? 'member');
        if (!TIERS.includes(tier)) throw new Error(`member ${i}: unknown tier "${tier}"`);

        return {
          id,
          tier,
          name,
          role: String(raw.role ?? '').trim().slice(0, 40),
          avatar: raw.avatar ? String(raw.avatar).slice(0, 300) : null,
        };
      });
    } catch (err) {
      return json({ error: err.message }, 400);
    }

    try {
      const content = await readContent(env);
      const stale = revCheck(request, content);
      if (stale) return stale;
      content.members = members;
      const saved = await writeContent(env, content);
      return json({ ok: true, members, rev: saved.rev });
    } catch (err) {
      return json({ error: `could not save: ${err.message}` }, 500);
    }
  }

  return json({ error: 'not found' }, 404);
}

/**
 * Read-only media route.
 *
 * Production serves images from the media.puresuit.net custom domain, so this
 * is only used in development, where a local `wrangler dev` has no such domain
 * and `/media` is the only way for the page to load what it just uploaded.
 */
async function serveMedia(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405 });
  }

  const key = decodeURIComponent(url.pathname.slice('/media/'.length));
  if (!key || key.includes('..')) return new Response('bad key', { status: 400 });

  const object = await env.MEDIA.get(key);
  if (!object) return new Response('not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  // Same policy as an upload: a key is written once and never reused, so it is
  // safe to cache for a year. Without this every local reload re-read the bucket.
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    if (url.pathname.startsWith('/media/')) {
      return serveMedia(request, env, url);
    }

    // Everything else is the static site.
    return env.ASSETS.fetch(request);
  },
};
