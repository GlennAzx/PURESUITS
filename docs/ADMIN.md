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
| Set a portrait | Open a member, **Portrait**, pick a file, then crop |
| Reorder | Drag the handle on the left of a row, then release |

The roster moves out of the built bundle and into `content/site.json` the first
time it is saved here. Until then the tab reads the bundled `members.json`, so it
works on a site that has never been edited.

Names must be unique. `/members/<slug>` is derived from the name, so two members
with the same name would fight over one URL; the Worker rejects that and says
which slug clashed. An empty roster is also rejected — it is almost always a
mistake and it would take the whole Members page down.

### Gallery tab

Albums. Each album is one section on the public Gallery page: an editable header
plus as many photos as you like.

| Action | How |
|---|---|
| Add an album | **New album**, then rename its header |
| Rename a header | Type in the header field, click away to save |
| Add photos | **Add photos** on an album — select one file or many |
| Remove one photo | The ✕ on the thumbnail (appears on hover) |
| Delete an album | The bin icon on the album row |

Deleting an album removes the section from the site. The image files stay in R2;
they are simply no longer referenced.

Photos are stored as uploaded, with no resize or crop. The portrait crop step
does not apply to gallery images.

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


## Portrait cropping

Picking a portrait opens a crop step. Drag the image to position it and use the
slider to zoom. The frame is the tile window's real ratio, and the result is
saved as a 480 x 696 JPEG.

This matters because the tile window is 194 x 281 (ratio 0.6899). Before the
crop step, uploads were stored untouched and the browser centred them with
`object-fit: cover`, so an off-centre face lost the top of its head and the
three shipped portraits were each losing about 18% of their width.

The saved file is also much smaller. A 3000 x 2000 upload of 3.9 MB becomes a
117 KB portrait, because the tiles never render wider than 232 px.

Gallery uploads do not have a crop step. They are 16:9 slots and are still
centre-cropped by CSS.


## Reordering the roster

The roster is grouped the same way the Members page renders it: Leadership,
Command, Members. Drag the handle on the left of a row to move that member up or
down inside its group. The new order saves on release and is live on the next
page load.

A drag cannot cross a group. Which group a member belongs to is their tier, so
promoting someone is the **Tier** field in the edit form, not a side effect of
dropping them in another list.

Reordering is off while the search box has text, because a filtered list has
gaps and dropping into it would be ambiguous. Clear the search to drag.

The drag uses pointer events, not HTML5 drag-and-drop. HTML5 drag does not fire
on touch screens, so a phone could not reorder at all.


## Gallery content shape

```json
"gallery": [
  { "id": "g-01", "title": "Guild Group Photo",
    "photos": [ { "id": "p-1", "image": "gallery/1792915537-8b2c58e1.jpg", "caption": "" } ] }
]
```

Content saved before albums existed stored one `image` per slot. `toAlbums()` in
`src/lib/gallery.js` reads such an entry as a single-photo album, and the Worker
does the same on write, so an older content file keeps its pictures.


## Several people using the panel

Each save carries the revision it was built from. If someone else saved first,
the Worker refuses the write and the panel shows a reload banner. Your typing is
kept, but the change is not applied until you reload and redo it.

The panel also checks for other people's saves: on a 20-second timer, on window
focus, and when the tab becomes visible. A background tab costs nothing.

There is no queue and no lock. Two admins editing different albums at the same
moment will still collide, because the whole gallery is saved as one value. The
loser is told, which is the part that matters.

## Gallery photo limits

Photos are compressed in the browser to a 1920 px long edge at JPEG q0.82 before
upload. The admin shows a meter of photos used and bytes used.

| Limit | Value |
|---|---|
| Photos | 800 |
| Total bytes | 4 GB |
| One upload | 8 MB |

The Worker enforces these, not the browser, so the caps hold even if the page is
bypassed. See `docs/LIMITS.md` for why these numbers and which free-tier limit
arrives first.
