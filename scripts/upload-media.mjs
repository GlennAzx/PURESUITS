#!/usr/bin/env node
/**
 * Upload media to the R2 bucket.
 *
 *   node scripts/upload-media.mjs <file-or-directory> [bucket-prefix]
 *
 * Examples:
 *   node scripts/upload-media.mjs ./media/wwm-hero.mp4 hero
 *   node scripts/upload-media.mjs ./media/gallery gallery
 *
 * Wraps `wrangler r2 object put`. Wrangler is already authenticated for this
 * project, so there are no API keys to manage here.
 *
 * Why a script and not raw wrangler calls:
 *   - sets the right Content-Type per extension (wrangler does not guess, and a
 *     video served as application/octet-stream will not stream or seek)
 *   - sets a long immutable Cache-Control, so the CDN and the browser keep the
 *     file instead of re-fetching a 16 MB video on every visit
 *   - walks a directory and keeps its structure
 *
 * Uploading does NOT require a site deploy. That is the point of R2: new
 * gallery files appear without rebuilding or redeploying the Worker.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, extname, relative, posix, sep } from 'node:path';

const BUCKET = 'puresuit-media';

// Windows resolves `npx` to npx.cmd; see the shell flag at the call site.
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// A wrong Content-Type on a video breaks streaming and seeking in Safari.
const TYPES = {
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

// One year, immutable. Safe because a changed asset gets a new filename.
const CACHE = 'public, max-age=31536000, immutable';

/**
 * Editable content must NOT be cached like an asset.
 *
 * A JSON file is rewritten in place under the same key, so an immutable
 * header would pin the old copy in every browser for a year and the whole
 * point — edit without a deploy — would break. `no-cache` still lets
 * Cloudflare store it, but forces a revalidation, so an edit is live on the
 * next load and a 304 keeps the cost near zero.
 */
const CACHE_EDITABLE = 'no-cache';

/** Files a human edits and re-uploads under the same name. */
function isEditable(key) {
  return /^content\//.test(key) || key.endsWith('.json');
}

function filesUnder(target) {
  if (statSync(target).isFile()) return [target];
  const out = [];
  for (const entry of readdirSync(target)) {
    out.push(...filesUnder(join(target, entry)));
  }
  return out;
}

function keyFor(file, root, prefix) {
  const rel = statSync(root).isFile()
    ? file.split(sep).pop()
    : relative(root, file).split(sep).join(posix.sep);
  return prefix ? `${prefix.replace(/\/+$/, '')}/${rel}` : rel;
}

const [target, prefix = ''] = process.argv.slice(2);

if (!target) {
  console.error('usage: node scripts/upload-media.mjs <file-or-directory> [bucket-prefix]');
  process.exit(1);
}

let files;
try {
  files = filesUnder(target);
} catch {
  console.error(`not found: ${target}`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`no files under ${target}`);
  process.exit(1);
}

console.log(`Uploading ${files.length} file(s) to r2://${BUCKET}\n`);

let failed = 0;
for (const file of files) {
  const key = keyFor(file, target, prefix);
  const type = TYPES[extname(file).toLowerCase()];
  const sizeMb = (statSync(file).size / 1024 / 1024).toFixed(2);

  if (!type) {
    // Counted as a failure on purpose. The first version skipped and still
    // printed "All uploads succeeded", which is exactly the kind of false
    // success that hides a broken deploy.
    failed += 1;
    console.error(`  SKIP  ${key} — unknown file type, add it to TYPES`);
    continue;
  }

  // With shell: true the OS re-splits the command on spaces, so every value
  // that can contain a space (the path, and Cache-Control) must be quoted.
  const q = (v) => `"${String(v).replace(/"/g, '\\"')}"`;
  const args = [
    'wrangler', 'r2', 'object', 'put', q(`${BUCKET}/${key}`),
    '--file', q(file),
    '--content-type', q(type),
    '--cache-control', q(isEditable(key) ? CACHE_EDITABLE : CACHE),
    // REQUIRED. Without --remote wrangler writes to a LOCAL simulated bucket
    // in .wrangler/state and still prints success, so the upload silently
    // never reaches R2.
    '--remote',
  ];

  try {
    // shell: true is required on Windows — npx is npx.cmd there, and
    // execFileSync cannot launch a .cmd without a shell (spawnSync ENOENT).
    execFileSync(NPX, args, { stdio: 'pipe', shell: process.platform === 'win32' });
    console.log(`  OK    ${key}  (${sizeMb} MB, ${type})`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${key}`);
    console.error(`        ${(err.stderr?.toString() || err.message).trim().split('\n').slice(-3).join('\n        ')}`);
  }
}

console.log(failed ? `\n${failed} upload(s) failed.` : '\nAll uploads succeeded.');
process.exit(failed ? 1 : 0);
