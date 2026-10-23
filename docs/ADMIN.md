# Admin — editing events on the live site

Open **`https://puresuit.net/admin`** and paste the admin token.

There is no build and no deploy. Every action saves immediately and is visible
on the public site on the next page load.

The page is not linked from the navigation. It is reached by typing the URL.

## What you can do

| Action | How |
|---|---|
| Add | **New event**, fill the form, **Add event** |
| Edit | Pencil icon on a row, change fields, **Save changes** |
| Delete | Bin icon on a row, confirm |

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
