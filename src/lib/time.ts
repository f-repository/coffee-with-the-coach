// Timezone helpers built on Intl, so slots can be stored as UTC and shown in any zone.

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

const partsCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

export function zonedParts(date: Date, timeZone: string): Parts {
  const out: Record<string, number> = {};
  for (const p of partsFormatter(timeZone).formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour % 24, minute: out.minute };
}

/** Minutes the zone is ahead of UTC at the given instant. */
export function offsetMinutes(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
}

/** The UTC instant of a wall-clock time in a zone. */
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let ts = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  ts = guess - offsetMinutes(new Date(ts), timeZone) * 60000;
  return new Date(ts);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" for the instant as seen in the zone. */
export function dateKey(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function formatTime(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** e.g. "Tuesday, 20 October" or with year "Tue, 20 October 2026" */
export function formatDay(date: Date, timeZone: string, { short = false, year = false } = {}) {
  const weekday = formatDate(date, timeZone, { weekday: short ? 'short' : 'long' });
  const rest = formatDate(date, timeZone, { day: 'numeric', month: 'long', year: year ? 'numeric' : undefined });
  return `${weekday}, ${rest}`;
}

export function formatDate(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, ...opts }).format(date);
}

/** e.g. "Eastern Time · EDT (UTC-4)" */
export function timeZoneLabel(timeZone: string, at = new Date()) {
  const name = (style: 'long' | 'short') =>
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: style })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
  const long = name('long').replace(/ (Standard|Daylight|Summer) Time$/, ' Time');
  const mins = offsetMinutes(at, timeZone);
  const sign = mins < 0 ? '-' : '+';
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  const utc = mins === 0 ? 'UTC' : `UTC${sign}${h}${m ? ':' + pad(m) : ''}`;
  return `${long} · ${name('short')} (${utc})`;
}

export function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
}

export const TIME_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
];
