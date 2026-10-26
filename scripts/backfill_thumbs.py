#!/usr/bin/env python3
"""
Backfill gallery thumbnails.

Photos uploaded before thumbnails existed have only a full-size file, so every
grid draws a 400-500 KB image. This walks the gallery, makes a 480 px copy of
each photo that has no `thumb`, uploads it, and saves the key back into content.

Safe to re-run: photos that already have a thumb are skipped, and the content
write is guarded by If-Match, so a concurrent edit in /admin aborts the save
instead of overwriting it.

Usage:
    python scripts/backfill_thumbs.py --base https://puresuit.net --dry-run
    python scripts/backfill_thumbs.py --base https://puresuit.net
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
import urllib.error
import urllib.request

from PIL import Image

THUMB_EDGE = 480
THUMB_QUALITY = 72  # Pillow takes 0-100, unlike the browser's 0-1
FULL_EDGE = 1440
FULL_QUALITY = 76


def token_from_repo() -> str:
    """The secrets file is a note with the token somewhere inside it, so pick the
    first line that looks like a token rather than assuming the whole file is one."""
    path = os.path.join(os.path.dirname(__file__), "..", ".secrets", "admin-token.txt")
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            text = line.strip()
            if len(text) >= 16 and all(c.isalnum() or c in "-_" for c in text):
                return text
    raise SystemExit(f"no token found in {path}")


def request(url: str, method: str = "GET", *, token: str | None = None,
            data: bytes | None = None, content_type: str | None = None,
            extra: dict | None = None) -> tuple[int, bytes]:
    req = urllib.request.Request(url, method=method, data=data)
    # Cloudflare answers 403 to the default Python user-agent.
    req.add_header("User-Agent", "puresuit-backfill/1.0")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if content_type:
        req.add_header("Content-Type", content_type)
    for key, value in (extra or {}).items():
        req.add_header(key, value)
    try:
        with urllib.request.urlopen(req, timeout=90) as res:
            return res.status, res.read()
    except urllib.error.HTTPError as err:
        return err.code, err.read()


def encode(img: Image.Image, edge: int, quality: int) -> bytes:
    scale = min(1.0, edge / max(img.size))
    size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
    out = io.BytesIO()
    img.resize(size, Image.LANCZOS).save(out, "JPEG", quality=quality, optimize=True)
    return out.getvalue()


def upload(base: str, token: str, blob: bytes, name: str) -> str:
    boundary = "----backfill"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{name}"\r\n'
        "Content-Type: image/jpeg\r\n\r\n"
    ).encode() + blob + f"\r\n--{boundary}--\r\n".encode()

    status, payload = request(
        f"{base}/api/upload?kind=gallery", "POST", token=token, data=body,
        content_type=f"multipart/form-data; boundary={boundary}",
    )
    if status != 200:
        raise RuntimeError(f"upload failed ({status}): {payload[:200]}")
    return json.loads(payload)["key"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8787")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--token", help="admin token; defaults to the one in .secrets/")
    ap.add_argument("--shrink", action="store_true",
                    help=f"also re-encode full images above {FULL_EDGE}px")
    args = ap.parse_args()

    token = args.token or token_from_repo()
    base = args.base.rstrip("/")

    status, payload = request(f"{base}/api/content")
    if status != 200:
        print(f"could not read content ({status})")
        return 1
    content = json.loads(payload)
    rev = content.get("rev", 0)
    gallery = content.get("gallery") or []

    # With --shrink, oversized full images are re-encoded too, so a photo that
    # was uploaded at 1920 is not left three times heavier than a new one.
    pending = [
        (album, photo)
        for album in gallery
        for photo in album.get("photos", [])
        if photo.get("image") and (not photo.get("thumb") or args.shrink)
    ]

    total = sum(len(a.get("photos", [])) for a in gallery)
    print(f"rev {rev}: {total} photos, {len(pending)} need a thumbnail")
    if not pending:
        return 0
    if args.dry_run:
        for album, photo in pending:
            print(f"  would backfill {photo['id']} in {album['title']}")
        return 0

    media_base = "https://media.puresuit.net" if "puresuit.net" in base else f"{base}/media"
    done = 0
    for album, photo in pending:
        url = f"{media_base}/{photo['image']}"
        code, raw = request(url)
        if code != 200:
            print(f"  skip {photo['id']}: image fetch {code}")
            continue
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        before = len(raw) // 1024

        if args.shrink and max(img.size) > FULL_EDGE:
            full = encode(img, FULL_EDGE, FULL_QUALITY)
            if len(full) < len(raw):
                full_key = upload(base, token, full, "photo.jpg")
                photo["image"] = full_key
                photo["bytes"] = len(full)
                print(f"  {photo['id']}: full {before} KB -> {len(full) // 1024} KB")
                before = len(full) // 1024

        thumb = encode(img, THUMB_EDGE, THUMB_QUALITY)
        photo["thumb"] = upload(base, token, thumb, "thumb.jpg")
        done += 1
        print(f"  {photo['id']}: thumb {len(thumb) // 1024} KB")

    body = json.dumps({"gallery": gallery}, ensure_ascii=False).encode()
    status, payload = request(
        f"{base}/api/images", "PUT", token=token, data=body,
        content_type="application/json; charset=utf-8",
        extra={"If-Match": str(rev)},
    )
    if status != 200:
        print(f"save failed ({status}): {payload[:300]}")
        print("no content change was made; the uploaded thumbnails are unused")
        return 1
    print(f"saved: {done} thumbnails attached, new rev {json.loads(payload).get('rev')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
