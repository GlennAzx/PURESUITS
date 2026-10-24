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
  if (!object) return { events: [], schedule: [], links: {} };
  return JSON.parse(await object.text());
}

async function writeContent(env, content) {
  await env.MEDIA.put(CONTENT_KEY, JSON.stringify(content, null, 2), {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8',
      // Same reasoning as the upload script: this key is rewritten in place,
      // so an immutable header would freeze the old copy in every browser.
      cacheControl: 'no-cache',
    },
  });
}

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

  return json({ ok: true, key });
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
      content.events = events;
      await writeContent(env, content);
      return json({ ok: true, events });
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
    let members;
    try {
      gallery = clean(body.gallery, 'gallery', (item, i) => {
        if (!item || typeof item !== 'object') throw new Error(`gallery ${i} is not an object`);
        return {
          id: String(item.id || `g-${i}`).slice(0, 64),
          title: String(item.title || '').slice(0, 120),
          // A bare R2 key, or null for an empty slot.
          image: item.image ? String(item.image).slice(0, 300) : null,
        };
      });
      members = clean(body.members, 'members', (item, i) => {
        if (!item || typeof item !== 'object') throw new Error(`member ${i} is not an object`);
        return {
          id: String(item.id || `m-${i}`).slice(0, 64),
          avatar: item.avatar ? String(item.avatar).slice(0, 300) : null,
        };
      });
    } catch (err) {
      return json({ error: err.message }, 400);
    }

    try {
      const content = await readContent(env);
      if (gallery !== undefined) content.gallery = gallery;
      if (members !== undefined) content.members = members;
      await writeContent(env, content);
      return json({ ok: true, gallery: content.gallery, members: content.members });
    } catch (err) {
      return json({ error: `could not save: ${err.message}` }, 500);
    }
  }

  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    // Everything else is the static site.
    return env.ASSETS.fetch(request);
  },
};
