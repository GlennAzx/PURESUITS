# Admin — editing events on the live site

Open **`https://puresuit.net/admin`** and paste the admin token.

There is no build and no deploy. Every action saves immediately and is visible
on the public site on the next page load.

The page is not linked from the navigation. It is reached by typing the URL.

## What you can do

The page has three tabs: **Events**, **Members** and **Gallery**.

### Events tab

| Action | How |
|---|---|
| Add | **New event**, fill the form, **Add event** |
| Edit | Pencil icon on a row, change fields, **Save changes** |
| Delete | Bin icon on a row, confirm |

### Members tab

The roster itself: add, edit and remove members, and set each portrait.

| Action | How |
|---|---|
| Add | **New member**, fill name/role/tier, **Add member** |
| Edit | Pencil on a row, change the fields, **Save changes** |
| Remove | Bin icon, confirm — this is live immediately |
| Set a portrait | Open a member, **Portrait**, pick a file |

The roster moves out of the built bundle and into `content/site.json` the first
time it is saved here. Until then the tab reads the bundled `members.json`, so it
works on a site that has never been edited.

Names must be unique. `/members/<slug>` is derived from the name, so two members
with the same name would fight over one URL; the Worker rejects that and says
which slug clashed. An empty roster is also rejected — it is almost always a
mistake and it would take the whole Members page down.

### Gallery tab

Gallery screenshots, uploaded straight to R2.

| Action | How |
|---|---|
| Add/replace a gallery image | **Upload** or **Replace** on a slot, pick a file |
| Clear a gallery slot | **Clear** on a filled slot |

Changes are live on the next page load. Replacing an image writes a NEW file to
the bucket instead of overwriting: images are served with a one-year immutable
cache, so reusing a filename would leave the old picture in every browser with
no way to purge it.

Only members whose portrait was changed are stored. The other members keep the
portrait shipped in the repo, so the saved list stays small.

Limits: images up to 8 MB, formats jpg/png/webp/avif/gif.

Delete asks for confirmation because it removes the event from the live site at
once. There is no undo and no draft state.

## Fields

| Field | Required | Notes |
|---|---|---|
| Title | yes | Card heading |
| Date | yes | Picker. Interpreted as **guild time, UTC+8** |
| Start time | yes | **Guild time, UTC+8** |
| Duration (minutes) | yes | How long the card counts as live. 1–1440 |
| Tag | no | Small label. Defaults to `Event` |
| Location | no | Free text. Hidden when empty |
| Description | no | One or two sentences |
| Details link | no | Must start with `https://` |

Times are guild time. A visitor who switches the page to "My time" gets them
converted. Writing a visitor-local time here would be wrong for everyone else.

## How it works

```
browser  →  PUT /api/events  →  Worker  →  R2 content/site.json
```

- `worker/index.js` handles `/api/*`. Everything else is still static assets.
- `PUT /api/events` requires `Authorization: Bearer <token>`, checks every field,
  then rewrites the `events` array in `content/site.json`. The schedule and links
  in the same file are preserved.
- The token is a Worker **secret** (`ADMIN_TOKEN`). It is never in the bundle, so
  viewing the source reveals nothing.
- With no secret configured the API refuses every write. An unset secret must
  not turn every visitor into an admin.

## The token

Stored in the browser's `localStorage` after the first unlock. **Sign out** clears it.

To set or rotate it:

```bash
npx wrangler secret put ADMIN_TOKEN
```

The Worker picks up the new value on its next deploy of the secret; no code
change is needed. Rotating it logs out every device still holding the old one.

A leaked token can write events. Rotate it. It cannot read anything private —
the content file is public anyway.

## Limitations worth knowing

- **No rate limiting.** Guessing the token is impractical (192 bits), but nothing
  slows repeated attempts. Add a rate limit rule in Cloudflare if this ever
  attracts attention.
- **Single editor, no history.** Two people saving at once: the last write wins,
  because each write replaces the whole array. R2 object versioning would give
  history back.
- **Events only.** The weekly schedule and the link URLs are still edited by
  uploading `content/site.json`. Extending the API to cover them is the same
  pattern — add a route and a field check in `worker/index.js`.


## How image storage works

```
browser -> POST /api/upload?kind=gallery|members -> Worker -> R2 object
        -> PUT /api/images -> content/site.json (stores the R2 KEY)
```

The content file stores a bare key such as `gallery/1792857612017-edd0f781.jpg`,
not a full URL. The page turns a bare key into a URL with `imageUrl()` in
`src/lib/media.js`, so the bucket domain lives in one place. Legacy paths that
start with `/` (the portraits shipped in `public/members/`) pass through
untouched and keep working.

`siteContent.js` passes `gallery` and `members` through unchanged. They are not
reshaped like events, because the Worker already validated them on write.


## The roster in R2

`content/site.json` holds `members` as a full list once edited:

```json
{ "id": "m-47", "tier": "commander", "name": "Ophiron", "role": "Command", "avatar": null }
```

Valid tiers: `guild_leader`, `deputy`, `commander`, `member`. `avatar` is either
an R2 key from an upload, a legacy `/members/*.png` path, or `null`.

The Members page uses this list when it is present and falls back to the bundled
`src/data/members.json` when it is not. That fallback is why the page still works
if the bucket is unreachable.

Slugs are derived from the name at request time (see `src/lib/memberSlug.js`), so
adding a member needs no extra field. Renaming someone changes their URL.
