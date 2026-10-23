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

async function handleApi(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/content' && request.method === 'GET') {
    try {
      return json(await readContent(env));
    } catch (err) {
      return json({ error: `could not read content: ${err.message}` }, 500);
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
