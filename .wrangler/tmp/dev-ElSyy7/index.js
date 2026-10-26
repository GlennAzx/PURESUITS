var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.js
var CONTENT_KEY = "content/site.json";
async function safeEqual(a, b) {
  const encoder = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b))
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i += 1) diff |= va[i] ^ vb[i];
  return diff === 0;
}
__name(safeEqual, "safeEqual");
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // The admin page must never read a cached copy of its own writes.
      "cache-control": "no-store"
    }
  });
}
__name(json, "json");
function bearer(request) {
  const header = request.headers.get("Authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : "";
}
__name(bearer, "bearer");
async function authorised(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const token = bearer(request);
  if (!token) return false;
  return safeEqual(token, env.ADMIN_TOKEN);
}
__name(authorised, "authorised");
async function readContent(env) {
  const object = await env.MEDIA.get(CONTENT_KEY);
  if (!object) return { events: [], schedule: [], links: {}, featured: null, rev: 0 };
  return JSON.parse(await object.text());
}
__name(readContent, "readContent");
async function writeContent(env, content) {
  const next = {
    ...content,
    rev: Number(content.rev || 0) + 1,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await env.MEDIA.put(CONTENT_KEY, JSON.stringify(next, null, 2), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      // Same reasoning as the upload script: this key is rewritten in place,
      // so an immutable header would freeze the old copy in every browser.
      cacheControl: "no-cache"
    }
  });
  return next;
}
__name(writeContent, "writeContent");
function revCheck(request, content) {
  const raw = request.headers.get("If-Match");
  if (!raw) return null;
  const current = Number(content.rev || 0);
  const claimed = Number(String(raw).replace(/"/g, "").trim());
  if (Number.isFinite(claimed) && claimed === current) return null;
  return json(
    {
      error: "stale",
      message: "Another admin saved a change first. Reload to see their version.",
      rev: current,
      updatedAt: content.updatedAt || null
    },
    409
  );
}
__name(revCheck, "revCheck");
var MAX_GALLERY_PHOTOS = 800;
var MAX_GALLERY_BYTES = 4 * 1024 * 1024 * 1024;
function validateEvent(raw, index) {
  if (!raw || typeof raw !== "object") throw new Error(`event ${index} is not an object`);
  const str = /* @__PURE__ */ __name((v, name, max = 400) => {
    if (v === void 0 || v === null) return "";
    if (typeof v !== "string") throw new Error(`event ${index}: ${name} must be text`);
    if (v.length > max) throw new Error(`event ${index}: ${name} is too long`);
    return v.trim();
  }, "str");
  const title = str(raw.title, "title", 120);
  if (!title) throw new Error(`event ${index}: title is required`);
  const date = str(raw.date, "date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`event ${index}: date must be YYYY-MM-DD`);
  }
  const time = str(raw.time, "time", 5);
  if (!/^\d{1,2}:\d{2}$/.test(time)) {
    throw new Error(`event ${index}: time must be HH:MM`);
  }
  const duration = Number(raw.durationMinutes);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 24 * 60) {
    throw new Error(`event ${index}: durationMinutes must be between 1 and 1440`);
  }
  return {
    id: str(raw.id, "id", 64) || `event-${Date.now()}-${index}`,
    title,
    description: str(raw.description, "description", 600),
    date,
    time,
    durationMinutes: Math.round(duration),
    location: str(raw.location, "location", 160),
    tag: str(raw.tag, "tag", 40) || "Event",
    link: str(raw.link, "link", 300)
  };
}
__name(validateEvent, "validateEvent");
var MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
function extensionFor(file) {
  const byName = /\.([a-z0-9]+)$/i.exec(file.name || "");
  if (byName) {
    const ext = byName[1].toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "avif", "gif"].includes(ext)) return ext;
  }
  const byType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif"
  }[file.type];
  return byType || null;
}
__name(extensionFor, "extensionFor");
async function handleUpload(request, env, url) {
  if (!await authorised(request, env)) {
    return json({ error: "invalid token" }, 401);
  }
  const kind = url.searchParams.get("kind");
  if (kind !== "gallery" && kind !== "members" && kind !== "builds") {
    return json({ error: "kind must be gallery, members or builds" }, 400);
  }
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "expected multipart/form-data" }, 400);
  }
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return json({ error: "no file field" }, 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return json({ error: `file is too large (max ${MAX_UPLOAD_BYTES / 1048576} MB)` }, 413);
  }
  if (file.type && !file.type.startsWith("image/")) {
    return json({ error: `not an image (${file.type})` }, 415);
  }
  const ext = extensionFor(file);
  if (!ext) return json({ error: "unsupported image type" }, 415);
  const key = `${kind}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || `image/${ext}`,
      cacheControl: "public, max-age=31536000, immutable"
    }
  });
  return json({ ok: true, key, bytes: file.size });
}
__name(handleUpload, "handleUpload");
async function handleApi(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/content" && request.method === "GET") {
    try {
      return json(await readContent(env));
    } catch (err) {
      return json({ error: `could not read content: ${err.message}` }, 500);
    }
  }
  if (url.pathname === "/api/upload" && request.method === "POST") {
    try {
      return await handleUpload(request, env, url);
    } catch (err) {
      return json({ error: `upload failed: ${err.message}` }, 500);
    }
  }
  if (url.pathname === "/api/auth" && request.method === "POST") {
    return await authorised(request, env) ? json({ ok: true }) : json({ error: "invalid token" }, 401);
  }
  if (url.pathname === "/api/featured" && request.method === "PUT") {
    if (!await authorised(request, env)) {
      return json({ error: "invalid token" }, 401);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "body is not valid JSON" }, 400);
    }
    const raw = body.featured;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return json({ error: "body must contain a featured object" }, 400);
    }
    const featured = {
      enabled: Boolean(raw.enabled),
      memberId: raw.memberId ? String(raw.memberId).slice(0, 64) : null,
      name: String(raw.name ?? "").trim().slice(0, 60),
      role: String(raw.role ?? "").trim().slice(0, 40),
      blurb: String(raw.blurb ?? "").trim().slice(0, 400),
      image: raw.image ? String(raw.image).slice(0, 300) : null,
      weekOf: raw.weekOf ? String(raw.weekOf).slice(0, 10) : null
    };
    if (featured.enabled && !featured.name) {
      return json({ error: "a featured member needs a name" }, 400);
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
  if (url.pathname === "/api/events" && request.method === "PUT") {
    if (!await authorised(request, env)) {
      return json({ error: "invalid token" }, 401);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "body is not valid JSON" }, 400);
    }
    if (!Array.isArray(body.events)) {
      return json({ error: "body must contain an events array" }, 400);
    }
    if (body.events.length > 60) {
      return json({ error: "too many events (max 60)" }, 400);
    }
    let events;
    try {
      events = body.events.map(validateEvent);
    } catch (err) {
      return json({ error: err.message }, 400);
    }
    try {
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
  if (url.pathname === "/api/images" && request.method === "PUT") {
    if (!await authorised(request, env)) {
      return json({ error: "invalid token" }, 401);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "body is not valid JSON" }, 400);
    }
    const clean = /* @__PURE__ */ __name((list, name, shape) => {
      if (list === void 0) return void 0;
      if (!Array.isArray(list)) throw new Error(`${name} must be an array`);
      if (list.length > 400) throw new Error(`${name} has too many entries`);
      return list.map((item, i) => shape(item, i));
    }, "clean");
    let gallery;
    try {
      gallery = clean(body.gallery, "gallery", (item, i) => {
        if (!item || typeof item !== "object") throw new Error(`gallery ${i} is not an object`);
        const rawPhotos = Array.isArray(item.photos) ? item.photos : item.image ? [{ id: `${item.id || `g-${i}`}-p1`, image: item.image }] : [];
        if (rawPhotos.length > 300) throw new Error(`album ${i} has too many photos`);
        const photos = rawPhotos.map((p, j) => {
          if (!p || typeof p !== "object") throw new Error(`album ${i} photo ${j} is not an object`);
          if (!p.image) throw new Error(`album ${i} photo ${j} has no image`);
          return {
            id: String(p.id || `p-${i}-${j}`).slice(0, 64),
            image: String(p.image).slice(0, 300),
            caption: p.caption ? String(p.caption).slice(0, 160) : "",
            // Small copy for grids. Absent on photos uploaded before thumbnails
            // existed; the site falls back to the full image for those.
            thumb: p.thumb ? String(p.thumb).slice(0, 300) : null,
            // Stored size, used to enforce the gallery budget. Older entries
            // have no figure; those count as 0 and are never rejected.
            bytes: Number.isFinite(Number(p.bytes)) ? Math.max(0, Math.round(Number(p.bytes))) : 0
          };
        });
        return {
          id: String(item.id || `g-${i}`).slice(0, 64),
          title: String(item.title || "").slice(0, 120),
          photos
        };
      });
    } catch (err) {
      return json({ error: err.message }, 400);
    }
    if (gallery !== void 0) {
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
            error: `gallery is over its storage budget (${(bytes / 1024 ** 3).toFixed(2)} GB of ${(MAX_GALLERY_BYTES / 1024 ** 3).toFixed(0)} GB). Delete some photos.`
          },
          413
        );
      }
    }
    try {
      const content = await readContent(env);
      const stale = revCheck(request, content);
      if (stale) return stale;
      if (gallery !== void 0) content.gallery = gallery;
      const saved = await writeContent(env, content);
      return json({ ok: true, gallery: saved.gallery, rev: saved.rev });
    } catch (err) {
      return json({ error: `could not save: ${err.message}` }, 500);
    }
  }
  if (url.pathname === "/api/members" && request.method === "PUT") {
    if (!await authorised(request, env)) {
      return json({ error: "invalid token" }, 401);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "body is not valid JSON" }, 400);
    }
    if (!Array.isArray(body.members)) {
      return json({ error: "body must contain a members array" }, 400);
    }
    if (body.members.length === 0) {
      return json({ error: "refusing to save an empty roster" }, 400);
    }
    if (body.members.length > 300) {
      return json({ error: "too many members (max 300)" }, 400);
    }
    const TIERS = ["guild_leader", "deputy", "commander", "member"];
    const seenIds = /* @__PURE__ */ new Set();
    const seenSlugs = /* @__PURE__ */ new Set();
    let members;
    try {
      members = body.members.map((raw, i) => {
        if (!raw || typeof raw !== "object") throw new Error(`member ${i} is not an object`);
        const name = String(raw.name ?? "").trim().slice(0, 60);
        if (!name) throw new Error(`member ${i}: name is required`);
        const id = String(raw.id ?? "").trim().slice(0, 64);
        if (!id) throw new Error(`member ${i}: id is required`);
        if (seenIds.has(id)) throw new Error(`duplicate id "${id}"`);
        seenIds.add(id);
        const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || id;
        if (seenSlugs.has(slug)) throw new Error(`duplicate name slug "${slug}"`);
        seenSlugs.add(slug);
        const tier = String(raw.tier ?? "member");
        if (!TIERS.includes(tier)) throw new Error(`member ${i}: unknown tier "${tier}"`);
        return {
          id,
          tier,
          name,
          role: String(raw.role ?? "").trim().slice(0, 40),
          avatar: raw.avatar ? String(raw.avatar).slice(0, 300) : null
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
  return json({ error: "not found" }, 404);
}
__name(handleApi, "handleApi");
async function serveMedia(request, env, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method not allowed", { status: 405 });
  }
  const key = decodeURIComponent(url.pathname.slice("/media/".length));
  if (!key || key.includes("..")) return new Response("bad key", { status: 400 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
__name(serveMedia, "serveMedia");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    if (url.pathname.startsWith("/media/")) {
      return serveMedia(request, env, url);
    }
    return env.ASSETS.fetch(request);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-wxPPnD/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-wxPPnD/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
