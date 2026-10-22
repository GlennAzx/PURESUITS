/**
 * Calendar export.
 *
 * Two jobs:
 *
 * 1. formatTime(epochMs, mode) — the time label, in SGT or in the visitor's
 *    own zone. `mode` comes from useTimeMode().
 * 2. .ics generation — one event file per occurrence, so "remind me" works
 *    rather than only "when is it".
 *
 * All epoch maths, no local Date getters for the SGT path. The SGT module
 * exists precisely because local constructors reintroduce the DST bug.
 */

const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Wed 21:30" in SGT, or "Wed 14:30" in the visitor's zone. */
export function formatTime(epochMs, mode = 'sgt') {
  if (!Number.isFinite(epochMs)) return '\u2014';
  if (mode === 'local') {
    const d = new Date(epochMs);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${DAYS[d.getDay()]} ${hh}:${mm}`;
  }
  const d = new Date(epochMs + SGT_OFFSET_MS);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${DAYS[d.getUTCDay()]} ${hh}:${mm}`;
}

/** Suffix for the label: "SGT" or the visitor's zone abbreviation. */
export function zoneLabel(mode = 'sgt') {
  if (mode !== 'local') return 'SGT';
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(
      new Date()
    );
    return parts.find((p) => p.type === 'timeZoneName')?.value || 'local';
  } catch {
    return 'local';
  }
}

/** 20261024T120000Z */
function icsStamp(epochMs) {
  const d = new Date(epochMs);
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

/** RFC 5545 says fold content lines at 75 octets. Names here are short, but a
 *  long description would otherwise break some clients. */
function fold(line) {
  if (line.length <= 74) return line;
  const out = [];
  let rest = line;
  out.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length > 0) {
    out.push(' ' + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  return out.join('\r\n');
}

/** Escape the characters RFC 5545 reserves. */
const esc = (s) =>
  String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');

/**
 * Build an .ics body for one occurrence of an event.
 * Repeats are not encoded as RRULE — each occurrence is its own file, which is
 * simpler and means the visitor gets exactly the run they pressed the button on.
 */
export function buildICS(event, startMs) {
  const endMs = startMs + (event.durationMinutes || 60) * 60000;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PURESUIT//Guild Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}-${startMs}@puresuit.net`,
    `DTSTAMP:${icsStamp(Date.now())}`,
    `DTSTART:${icsStamp(startMs)}`,
    `DTEND:${icsStamp(endMs)}`,
    fold(`SUMMARY:${esc(event.name)}`),
    fold(`DESCRIPTION:${esc(event.description)}`),
    fold('LOCATION:Where Winds Meet'),
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    fold(`DESCRIPTION:${esc(event.name)} starts in 15 minutes`),
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

/** Trigger a download in the browser. */
export function downloadICS(event, startMs) {
  const blob = new Blob([buildICS(event, startMs)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `puresuit-${event.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the click a tick to start before the URL is revoked.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
