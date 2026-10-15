// Coach data access. Row level security limits every query to the signed-in coach.
import { callFunction } from '../api';
import { supabase } from '../lib/supabase';

export type Rule = {
  id: string;
  weekday: number; // 0 = Sunday
  start_time: string; // "HH:MM:SS"
  end_time: string;
};

export type CoachBooking = {
  id: string;
  start_at: string;
  end_at: string;
  reference: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  topic: string;
  notes: string | null;
  meet_link: string | null;
};

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Display order: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const hhmm = (t: string) => t.slice(0, 5);

function db() {
  if (!supabase) throw new Error('Backend not configured');
  return supabase;
}

export async function listRules(): Promise<Rule[]> {
  const { data, error } = await db().from('availability_rules').select('id, weekday, start_time, end_time').order('start_time');
  if (error) throw error;
  return data as Rule[];
}

export async function addRules(coachId: string, weekdays: number[], start: string, end: string) {
  const { error } = await db()
    .from('availability_rules')
    .insert(weekdays.map((weekday) => ({ coach_id: coachId, weekday, start_time: start, end_time: end })));
  if (error) throw error;
}

export async function deleteRule(id: string) {
  const { error } = await db().from('availability_rules').delete().eq('id', id);
  if (error) throw error;
}

/** Remove one occurrence of a repeating slot. */
export async function removeSlot(coachId: string, start: string) {
  const { error } = await db().from('availability_exceptions').insert({ coach_id: coachId, start_at: start });
  if (error) throw error;
}

export async function upcomingBookings(): Promise<CoachBooking[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const { data, error } = await db()
    .from('bookings')
    .select('id, start_at, end_at, reference, guest_name, guest_email, guest_phone, topic, notes, meet_link')
    .eq('status', 'confirmed')
    .gte('start_at', startOfToday.toISOString())
    .order('start_at');
  if (error) throw error;
  return data as CoachBooking[];
}

export async function cancelBooking(bookingId: string) {
  const { data } = await db().auth.getSession();
  await callFunction('cancel-booking', {
    method: 'POST',
    token: data.session?.access_token,
    body: JSON.stringify({ bookingId }),
  });
}

/** "Mon–Fri · 09:00–15:00" when every window matches, else a count. */
export function summarizeRules(rules: Rule[]) {
  if (!rules.length) return 'No weekly hours yet';
  const times = new Set(rules.map((r) => `${hhmm(r.start_time)}–${hhmm(r.end_time)}`));
  const days = WEEK_ORDER.filter((d) => rules.some((r) => r.weekday === d));
  if (times.size === 1 && rules.length === days.length) {
    const idx = days.map((d) => WEEK_ORDER.indexOf(d));
    const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    const dayText =
      consecutive && days.length > 2
        ? `${WEEKDAY_SHORT[days[0]]}–${WEEKDAY_SHORT[days[days.length - 1]]}`
        : days.map((d) => WEEKDAY_SHORT[d]).join(', ');
    return `${dayText} · ${[...times][0]}`;
  }
  return `${rules.length} weekly windows`;
}
