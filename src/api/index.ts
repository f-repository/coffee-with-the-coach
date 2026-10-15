// Booking API used by the screens.
//
// This is a mock for milestone 1: it invents availability on weekdays so the
// flow can be tried end to end. In milestone 2 these functions call the backend,
// which reads free/busy from the coach's Google Calendar and creates the event.
import { zonedParts, zonedToUtc } from '../lib/time';
import type { Booking, BookingRequest, Coach, Slot } from './types';

export * from './types';

export const COACHES: Coach[] = [
  {
    id: 'david-tripp',
    name: 'David Tripp',
    firstName: 'David',
    credential: 'President and CEO of WPI',
    timeZone: 'America/New_York',
    sessionMinutes: 30,
  },
];

export const TOPICS = [
  'Career next chapter',
  'Leading a team',
  'Navigating change',
  'Difficult conversations',
  'Growth and development',
  'Something else',
];

const SLOT_HOURS = [9, 10, 11, 14, 15];
const BOOKING_WINDOW_DAYS = 60;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Open slots for a coach from tomorrow through the booking window. */
export async function getAvailability(coachId: string): Promise<Slot[]> {
  const coach = COACHES.find((c) => c.id === coachId);
  if (!coach) throw new Error(`Unknown coach ${coachId}`);
  await delay(300);

  const tz = coach.timeZone;
  const today = zonedParts(new Date(), tz);
  const slots: Slot[] = [];
  for (let i = 1; i <= BOOKING_WINDOW_DAYS; i++) {
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + i, 12));
    const weekday = d.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
    SLOT_HOURS.forEach((hour, idx) => {
      // Pretend some times are already busy so days look realistic.
      if ((day + idx * 3) % 4 === 0) return;
      const start = zonedToUtc(y, m, day, hour, 0, tz);
      const end = new Date(start.getTime() + coach.sessionMinutes * 60000);
      slots.push({ start: start.toISOString(), end: end.toISOString() });
    });
  }
  return slots;
}

export async function createBooking(req: BookingRequest): Promise<Booking> {
  await delay(600);
  const d = new Date(req.slot.start);
  const ref = `CW-${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}${Math.floor(Math.random() * 90 + 10)}`;
  return { reference: ref };
}
