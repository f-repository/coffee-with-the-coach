// Turns a coach's weekly availability into bookable slots, removing anything
// already booked, removed by the coach, or clashing with their Google Calendar.
import { minutesOf, zonedParts, zonedToUtc } from './time.ts';

export type Rule = {
  weekday: number; // 0 = Sunday, in the coach's timezone
  start_time: string; // "HH:MM" or "HH:MM:SS"
  end_time: string;
  starts_on: string; // "YYYY-MM-DD"
  ends_on: string | null;
};

export type Interval = { start: string; end: string }; // ISO instants

export type SlotSettings = {
  timeZone: string;
  sessionMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  bookingWindowDays: number;
};

export type SlotInput = SlotSettings & {
  rules: Rule[];
  /** Start instants of single occurrences the coach removed. */
  exceptions: string[];
  /** Confirmed bookings. */
  bookings: Interval[];
  /** Busy times from Google Calendar. */
  busy: Interval[];
  now: Date;
};

const MINUTE = 60_000;
const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function computeSlots(input: SlotInput): Interval[] {
  const { timeZone, sessionMinutes, bufferMinutes, now } = input;
  const earliest = now.getTime() + input.minNoticeHours * 60 * MINUTE;
  const latest = now.getTime() + input.bookingWindowDays * DAY;
  const removed = new Set(input.exceptions.map((s) => new Date(s).getTime()));
  const buffer = bufferMinutes * MINUTE;

  // Anything that blocks a slot, widened by the buffer on both sides.
  const blocked = [...input.bookings, ...input.busy].map((b) => ({
    start: new Date(b.start).getTime() - buffer,
    end: new Date(b.end).getTime() + buffer,
  }));

  const slots = new Map<number, Interval>();
  const today = zonedParts(now, timeZone);

  for (let i = 0; ; i++) {
    // Walk calendar days in the coach's zone (noon UTC avoids DST edges).
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + i, 12));
    const [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
    if (zonedToUtc(y, m, day, 0, 0, timeZone).getTime() > latest) break;
    const dateStr = `${y}-${pad(m)}-${pad(day)}`;
    const weekday = d.getUTCDay();

    for (const rule of input.rules) {
      if (rule.weekday !== weekday) continue;
      if (dateStr < rule.starts_on || (rule.ends_on && dateStr > rule.ends_on)) continue;

      const windowEnd = minutesOf(rule.end_time);
      for (let t = minutesOf(rule.start_time); t + sessionMinutes <= windowEnd; t += sessionMinutes + bufferMinutes) {
        const start = zonedToUtc(y, m, day, Math.floor(t / 60), t % 60, timeZone).getTime();
        const end = start + sessionMinutes * MINUTE;
        if (start < earliest || start > latest) continue;
        if (removed.has(start)) continue;
        if (blocked.some((b) => start < b.end && end > b.start)) continue;
        slots.set(start, { start: new Date(start).toISOString(), end: new Date(end).toISOString() });
      }
    }
  }

  return [...slots.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s);
}

/** True if the slot is one the coach currently offers. */
export function isOffered(slots: Interval[], start: string) {
  const t = new Date(start).getTime();
  return slots.some((s) => new Date(s.start).getTime() === t);
}
