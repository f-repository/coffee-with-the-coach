// Booking API used by the customer screens.
//
// With EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY set, this calls
// the Supabase functions in /supabase/functions. Without them it falls back to
// sample data so the app can still be tried.
import { zonedParts, zonedToUtc } from '../lib/time';
import type { Booking, BookingRequest, Coach, Slot } from './types';

export * from './types';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const backendConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const TOPICS = [
  'Career next chapter',
  'Leading a team',
  'Navigating change',
  'Difficult conversations',
  'Growth and development',
  'Something else',
];

/** Thrown when the chosen time was taken or withdrawn before booking finished. */
export class SlotTakenError extends Error {}

export async function callFunction<T>(name: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...rest } = init;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    ...rest,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...rest.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 409 && body.error === 'slot_taken') throw new SlotTakenError();
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export async function getCoaches(): Promise<Coach[]> {
  if (!backendConfigured) return SAMPLE_COACHES;
  return (await callFunction<{ coaches: Coach[] }>('coaches')).coaches;
}

/** Open slots for a coach, as UTC start/end times. */
export async function getAvailability(coachId: string, durationMinutes = 30): Promise<Slot[]> {
  if (!backendConfigured) return sampleAvailability(coachId, durationMinutes);
  const q = encodeURIComponent(coachId);
  return (await callFunction<{ slots: Slot[] }>(`availability?coach=${q}&duration=${durationMinutes}`)).slots;
}

export async function createBooking(req: BookingRequest): Promise<Booking> {
  if (!backendConfigured) {
    await delay(600);
    return { reference: 'CW-SAMPLE' };
  }
  const res = await callFunction<{ reference: string; meetLink: string | null }>('book', {
    method: 'POST',
    body: JSON.stringify(req),
  });
  return { reference: res.reference, meetLink: res.meetLink ?? undefined };
}

// Sample data (used only when no backend is configured) ------------------------

const SAMPLE_COACHES: Coach[] = [
  {
    id: 'david-tripp',
    name: 'David Tripp',
    firstName: 'David',
    credential: 'President and CEO of WPI',
    timeZone: 'America/New_York',
    sessionMinutes: 30,
  },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sampleAvailability(coachId: string, durationMinutes: number): Promise<Slot[]> {
  const coach = SAMPLE_COACHES.find((c) => c.id === coachId);
  if (!coach) throw new Error(`Unknown coach ${coachId}`);
  await delay(300);

  const tz = coach.timeZone;
  const today = zonedParts(new Date(), tz);
  const slots: Slot[] = [];
  for (let i = 1; i <= 60; i++) {
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + i, 12));
    const weekday = d.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
    [9, 10, 11, 14, 15].forEach((hour, idx) => {
      if ((day + idx * 3) % 4 === 0) return;
      const start = zonedToUtc(y, m, day, hour, 0, tz);
      const end = new Date(start.getTime() + durationMinutes * 60000);
      slots.push({ start: start.toISOString(), end: end.toISOString() });
    });
  }
  return slots;
}
