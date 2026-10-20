// Guild event schedule. All times are Singapore Time (UTC+8). SGT has no DST.

const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// CONFIRM THESE TWO TIMES. You gave exact times for Breaking Army & Showdown
// but not for Guild Party or Heroes Realm. These are placeholders.
// ---------------------------------------------------------------------------
const GUILD_PARTY = { h: 21, m: 0 };     // 9:00pm daily
const HEROES_REALM = { h: 21, m: 0 };    // ASSUMPTION: Monday run
const HEROES_REALM_FRIDAY = { h: 22, m: 0 }; // second run, after Guild Party

// Weekday numbers: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
// durationMinutes: how long an event stays "ongoing" after it starts.
// Set these to the real run lengths when you know them.
export const EVENTS = [
  {
    id: 'guild-party',
    name: 'Guild Party',
    category: 'Social',
    cadence: 'daily',
    time: GUILD_PARTY,
    durationMinutes: 60,
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
    durationMinutes: 45,
    description:
      'Server-wide organised PvP. Two runs every week, Wednesday and Saturday at 9:30pm.',
  },
  {
    id: 'heroes-realm',
    name: 'Guild Heroes Realm / Normal Heroes Realm',
    category: 'PvE',
    cadence: 'weekly',
    weekdays: [1, 5],
    time: HEROES_REALM,
    // Friday's run happens after Guild Party, so it needs its own time.
    timeByWeekday: { 5: HEROES_REALM_FRIDAY },
    durationMinutes: 90,
    description:
      'Weekly Heroes Realm clear on Monday, with a second run on Friday straight after Guild Party.',
  },
];

function sgtParts(nowMs) {
  const d = new Date(nowMs + SGT_OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    mo: d.getUTCMonth(),
    day: d.getUTCDate(),
    dow: d.getUTCDay(),
  };
}

function epochForSGT(y, mo, day, h, m) {
  return Date.UTC(y, mo, day, h, m, 0, 0) - SGT_OFFSET_MS;
}

/** Start time for a given weekday, honouring any per-day override. */
function timeForWeekday(event, dow) {
  return event.timeByWeekday?.[dow] || event.time;
}

/**
 * Next UTC epoch (ms) this event starts, or Infinity if none found.
 */
export function nextOccurrence(event, nowMs = Date.now()) {
  const { y, mo, day, dow } = sgtParts(nowMs);

  if (event.cadence === 'daily') {
    const today = epochForSGT(y, mo, day, event.time.h, event.time.m);
    if (today > nowMs) return today;
    return epochForSGT(y, mo, day + 1, event.time.h, event.time.m);
  }

  for (let d = 0; d <= 7; d++) {
    const candidateDow = (dow + d) % 7;
    if (!event.weekdays.includes(candidateDow)) continue;
    const tw = timeForWeekday(event, candidateDow);
    const t = epochForSGT(y, mo, day + d, tw.h, tw.m);
    if (t > nowMs) return t;
  }

  return Infinity;
}

/**
 * The start epoch of an occurrence that is running right now, or null.
 * An event is "ongoing" from its start time until start + durationMinutes.
 */
export function activeOccurrence(event, nowMs = Date.now()) {
  const durationMs = (event.durationMinutes || 0) * 60000;
  if (durationMs <= 0) return null;

  const { y, mo, day, dow } = sgtParts(nowMs);

  if (event.cadence === 'daily') {
    for (const offset of [0, -1]) {
      const start = epochForSGT(y, mo, day + offset, event.time.h, event.time.m);
      if (start <= nowMs && nowMs < start + durationMs) return start;
    }
    return null;
  }

  // weekly: look back up to 7 days for a matching weekday still running
  for (let back = 0; back <= 7; back++) {
    const candidateDow = (dow - back + 7) % 7;
    if (!event.weekdays.includes(candidateDow)) continue;
    const tw = timeForWeekday(event, candidateDow);
    const start = epochForSGT(y, mo, day - back, tw.h, tw.m);
    if (start <= nowMs && nowMs < start + durationMs) return start;
  }

  return null;
}

export function splitCountdown(ms) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: totalSeconds <= 0,
  };
}

/** "Wed 21:30" style label in SGT. */
export function formatSGT(epochMs) {
  if (!Number.isFinite(epochMs)) return '\u2014';
  const d = new Date(epochMs + SGT_OFFSET_MS);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${days[d.getUTCDay()]} ${hh}:${mm}`;
}

/** Short cadence label, e.g. "Daily" or "Wed & Sat". */
export function cadenceLabel(event) {
  if (event.cadence === 'daily') return 'Daily';
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return event.weekdays.map((d) => names[d]).join(' & ');
}
