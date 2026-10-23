/**
 * Site content that can change without a redeploy.
 *
 * Events, the weekly schedule and the link URLs live in one JSON file in the
 * R2 bucket (see docs/MEDIA.md). The page fetches it at runtime and merges it
 * over the defaults below.
 *
 * Why a remote JSON file rather than code:
 *   - git keeps every version of every file, so a typo fix in a schedule means
 *     a commit and a deploy for a one-word change
 *   - a guild officer cannot edit source code, but can edit JSON
 *   - Workers Builds has no copy of .env.local, so every content change through
 *     git risks a deploy that quietly loses the media base
 *
 * The fetch is deliberately non-fatal. If the bucket is unreachable, or the
 * JSON is malformed, the page falls back to DEFAULT_CONTENT and still works.
 * A schedule is not worth a blank screen.
 */

import { media, MEDIA } from './media';

/** Fallback used when the remote content cannot be read. */
export const DEFAULT_CONTENT = {
  events: [],
  schedule: [
    {
      id: 'guild-party',
      name: 'Guild Party',
      category: 'Social',
      cadence: 'daily',
      time: { h: 21, m: 0 },
      durationMinutes: 15,
      description:
        'Daily guild gathering. Everyone logs in, shares tea, and banks the day\u2019s rewards together.',
    },
    {
      id: 'breaking-army',
      name: 'Breaking Army & Showdown',
      category: 'PvP',
      cadence: 'weekly',
      weekdays: [3, 6],
      time: { h: 21, m: 30 },
      durationMinutes: 120,
      description:
        'Boss clears and Guild Arena PvPs. Two runs every week, Wednesday and Saturday at 9:30pm.',
    },
    {
      id: 'heroes-realm',
      name: 'Guild Heroes Realm / Normal Heroes Realm',
      category: 'PvE',
      cadence: 'weekly',
      weekdays: [1, 5],
      time: { h: 21, m: 30 },
      durationMinutes: 90,
      description:
        'Weekly Heroes Realm clear on Monday, with a second run on Friday straight after Guild Party.',
    },
    {
      id: 'guild-vs-guild-league',
      name: 'Guild vs Guild League',
      category: 'PvP',
      cadence: 'weekly',
      weekdays: [6, 0],
      time: { h: 20, m: 30 },
      durationMinutes: 30,
      description: 'Guild vs Guild - League Ranking.',
    },
    {
      id: 'guild-vs-guild',
      name: 'Guild vs Guild',
      category: 'PvP',
      cadence: 'weekly',
      weekdays: [6, 0],
      time: { h: 21, m: 30 },
      durationMinutes: 120,
      description: 'Guild vs Guild - 4 runs total weekly.',
    },
  ],
  links: {
    discord: 'https://discord.gg/QrnhSzcYkb',
    github: 'https://github.com/GlennAzx/PURESUITS',
    // Replace with the Stripe payment link. Empty hides the support button.
    support: '',
  },
};

const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

const WEEKDAY_NAMES = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/**
 * Accept "21:30", "21:30:00" or {h,m} and return {h,m}.
 * Written so the JSON can stay readable for a human editor.
 */
function parseTime(value) {
  if (!value) return { h: 0, m: 0 };
  if (typeof value === 'object') {
    return { h: Number(value.h) || 0, m: Number(value.m) || 0 };
  }
  const [h, m] = String(value).split(':');
  return { h: Number(h) || 0, m: Number(m) || 0 };
}

/**
 * Accept ["wed","sat"], [3,6] or "wed,sat" and return ISO-free day numbers
 * where 0 = Sunday, matching Date.getUTCDay().
 */
function parseWeekdays(value) {
  if (!value) return [];
  const list = Array.isArray(value)
    ? value
    : String(value).split(/[,\s]+/).filter(Boolean);

  return list
    .map((d) => {
      if (typeof d === 'number') return d;
      const n = Number(d);
      if (Number.isFinite(n)) return n;
      return WEEKDAY_NAMES[String(d).trim().toLowerCase()];
    })
    .filter((d) => Number.isFinite(d) && d >= 0 && d <= 6);
}

/** Epoch milliseconds for a date plus time written in SGT. */
export function epochFromSGTDate(dateStr, time) {
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  if (!y || !mo || !d) return NaN;
  const { h, m } = parseTime(time);
  return Date.UTC(y, mo - 1, d, h, m, 0, 0) - SGT_OFFSET_MS;
}

/** Shape one recurring event from the JSON into the object the cards expect. */
function normaliseScheduleItem(raw, index) {
  const time = parseTime(raw.time);
  const weekdays = parseWeekdays(raw.weekdays);

  // Per-day time overrides are accepted as { "5": "21:30" }.
  const timeByWeekday = {};
  for (const [day, value] of Object.entries(raw.timeByWeekday || {})) {
    timeByWeekday[Number(day)] = parseTime(value);
  }

  return {
    id: raw.id || `schedule-${index}`,
    name: raw.name || 'Untitled event',
    category: raw.category || 'Event',
    cadence: raw.cadence === 'daily' ? 'daily' : 'weekly',
    time,
    weekdays,
    ...(Object.keys(timeByWeekday).length ? { timeByWeekday } : {}),
    durationMinutes: Number(raw.durationMinutes) || 0,
    description: raw.description || '',
  };
}

/**
 * Shape one one-off event. Unlike a recurring event this has a fixed start.
 * `startsAt` is derived so the page never has to parse dates at render time.
 */
function normaliseEvent(raw, index) {
  const startsAt = epochFromSGTDate(raw.date, raw.time);
  return {
    id: raw.id || `event-${index}`,
    title: raw.title || raw.name || 'Untitled event',
    description: raw.description || '',
    tag: raw.tag || 'Event',
    date: raw.date,
    time: parseTime(raw.time),
    startsAt,
    durationMinutes: Number(raw.durationMinutes) || 120,
    link: raw.link || '',
    // Hidden once it has finished, unless the editor pins it.
    pinned: raw.pinned === true,
  };
}

/**
 * Merge remote JSON over the defaults.
 *
 * Each list is replaced wholesale rather than merged item by item: an editor
 * who deletes an event expects it to disappear, not to fall back to the
 * bundled copy.
 */
export function normaliseContent(raw) {
  const base = DEFAULT_CONTENT;
  if (!raw || typeof raw !== 'object') return base;

  const schedule = Array.isArray(raw.schedule)
    ? raw.schedule.map(normaliseScheduleItem)
    : base.schedule;

  const events = Array.isArray(raw.events)
    ? raw.events.map(normaliseEvent).filter((e) => Number.isFinite(e.startsAt))
    : base.events;

  return {
    schedule,
    events,
    links: { ...base.links, ...(raw.links || {}) },
  };
}

/**
 * Read the remote content file.
 *
 * `cache: 'no-cache'` revalidates with the bucket instead of trusting a local
 * copy, so an edit shows up on the next load without waiting for a cache
 * expiry. The file is a few kilobytes; revalidation is usually a 304.
 *
 * @returns {Promise<object>} Normalised content. Never rejects.
 */
export async function fetchContent() {
  const url = media(MEDIA.siteContent);
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return normaliseContent(await res.json());
  } catch (err) {
    // Loud in the console, quiet on the page. Falling back keeps the schedule
    // visible, which is the whole point of the section.
    console.warn(`[content] using bundled defaults — ${err.message}`);
    return DEFAULT_CONTENT;
  }
}

/** One-off events that have not finished yet, soonest first. */
export function upcomingEvents(events, now) {
  return events
    .filter((e) => e.startsAt + e.durationMinutes * 60000 > now)
    .sort((a, b) => a.startsAt - b.startsAt);
}

/** True while a one-off event is inside its run window. */
export function isEventLive(event, now) {
  return (
    event.startsAt <= now &&
    now < event.startsAt + event.durationMinutes * 60000
  );
}
