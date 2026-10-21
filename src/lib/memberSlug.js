/**
 * Member slugs for /members/<slug>.
 *
 * Derived from the name at runtime, not stored in members.json, so there is
 * nothing to keep in sync. Unicode letters are kept on purpose: the roster is
 * full of Chinese names, and an ASCII-only rule turns six of the 77 into ids
 * like `m-13`, which makes those links unreadable and unshareable.
 *
 * All 77 slugs in the current roster are unique. That was measured, not
 * assumed — re-check if names change.
 */

export function slugify(name) {
  return String(name ?? '')
    // Paéng -> Paeng, Köï -> Koi, kireiná -> kireina
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // Anything that is not a letter or a digit becomes a dash. \p{L} covers
    // CJK, so 玄月吟 survives intact.
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function memberSlug(member) {
  if (!member) return '';
  return slugify(member.name) || member.id || '';
}

export function findMemberBySlug(members, slug) {
  if (!slug) return null;
  const want = String(slug).toLowerCase();
  return members.find((m) => memberSlug(m).toLowerCase() === want) || null;
}
