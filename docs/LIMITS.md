# Free-tier limits and what the site does about them

Checked against Cloudflare's docs on 2026-10-25. Figures are the free plan.

## R2 free tier

| Resource | Free allowance | What uses it here |
|---|---|---|
| Storage | 10 GB-month | Gallery photos, member portraits, hero video, BGM |
| Class A (writes) | 1 million / month | Image uploads, content saves |
| Class B (reads) | 10 million / month | Every image the CDN does not already have |
| Egress | Free | All image delivery |

## Workers free plan

| Resource | Free allowance | What uses it here |
|---|---|---|
| Requests | 100,000 / day | Page HTML and the `/api/*` calls |
| CPU time | 10 ms / request | JSON read-modify-write and image put |
| Request body | 100 MB (account plan) | Uploads, capped at 8 MB by the Worker |
| Static asset file | 25 MiB | Build output only, never media |

## Which limit is reached first

**Storage.** Everything else has large headroom.

| Scenario | Photos before 10 GB |
|---|---|
| Uncompressed phone screenshot, ~5.6 MB | about 1,800 |
| Compressed by the admin, ~0.4 MB typical | about 25,000 |
| Compressed, worst case measured (pure noise), 1.1 MB | about 9,000 |

**Class B reads** come next: 10 million a month is roughly 330,000 page views of
a 30-photo gallery, and fewer when the CDN has the image cached. Images are
served from `media.puresuit.net`, so they do not touch the Worker request
allowance.

## Guards now in place

| Guard | Value | Where |
|---|---|---|
| Client compression | 1920 px long edge, JPEG q0.82 | `src/lib/image.js` |
| Per-file hard cap | 8 MB | `worker/index.js` |
| Photo count cap | 800 | `worker/index.js` |
| Total gallery bytes | 4 GB | `worker/index.js` |

The Worker enforces the count and byte caps on save, using the size it recorded
at upload time, so a client cannot talk its way past them. The admin shows a
meter with the same figures.

Compression measured on a 3200x1800 upload: 5.64 MB in, 1.09 MB out at
1920x1080, and that source was pure noise, which is the worst case for JPEG. A
real screenshot does better.

## Known gap

Removing a photo or an album deletes its reference, not the R2 object. The bytes
stay in the bucket and count against the 10 GB forever. The count cap only
counts referenced photos, so this is the one path that can grow without showing
up in the meter.

Until an object is deleted on removal, the manual cleanup is the R2 dashboard:
list the `gallery/` prefix and remove keys no longer referenced in
`content/site.json`.

## Concurrency

Multiple admins share one content file. Each save carries `If-Match: <rev>`. The
Worker bumps `rev` on every write and answers 409 when the revision is stale, so
a save built from an older copy is refused rather than allowed to overwrite
someone else's work. The admin shows a reload banner and keeps the local text.
