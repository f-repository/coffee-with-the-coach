// Shared server helpers: database client, HTTP responses, and loading a coach's
// currently offered slots.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { accessToken, busyTimes } from './google.ts';
import { computeSlots, type Interval } from './slots.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

/** Service-role client: bypasses RLS, server only. */
export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

/** The signed-in coach's user id, from the request's bearer token. */
export async function requireUser(db: SupabaseClient, req: Request): Promise<string | null> {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  return data.user?.id ?? null;
}

export type CoachRow = {
  id: string;
  slug: string;
  name: string;
  first_name: string;
  credential: string;
  time_zone: string;
  session_minutes: number;
  buffer_minutes: number;
  min_notice_hours: number;
  booking_window_days: number;
  calendar_id: string;
  active: boolean;
};

export function publicCoach(c: CoachRow) {
  return {
    id: c.slug,
    name: c.name,
    firstName: c.first_name,
    credential: c.credential,
    timeZone: c.time_zone,
    sessionMinutes: c.session_minutes,
  };
}

export async function googleToken(db: SupabaseClient, coachId: string) {
  const { data } = await db.from('google_tokens').select('refresh_token').eq('coach_id', coachId).maybeSingle();
  if (!data) return null;
  return accessToken(data.refresh_token);
}

/**
 * Slots the coach offers right now. A coach without a connected Google Calendar
 * offers nothing, since conflicts can't be checked.
 */
export async function offeredSlots(db: SupabaseClient, coach: CoachRow, durationMinutes = coach.session_minutes, now = new Date()): Promise<Interval[]> {
  const token = await googleToken(db, coach.id);
  if (!token) return [];

  const until = new Date(now.getTime() + coach.booking_window_days * 86_400_000);
  const [rules, exceptions, bookings, busy] = await Promise.all([
    db.from('availability_rules').select('weekday, start_time, end_time, starts_on, ends_on').eq('coach_id', coach.id),
    db.from('availability_exceptions').select('start_at').eq('coach_id', coach.id).gte('start_at', now.toISOString()),
    db
      .from('bookings')
      .select('start_at, end_at')
      .eq('coach_id', coach.id)
      .eq('status', 'confirmed')
      .gte('end_at', now.toISOString()),
    busyTimes(token, coach.calendar_id, now, until),
  ]);
  for (const r of [rules, exceptions, bookings]) if (r.error) throw r.error;

  return computeSlots({
    timeZone: coach.time_zone,
    sessionMinutes: durationMinutes,
    bufferMinutes: coach.buffer_minutes,
    minNoticeHours: coach.min_notice_hours,
    bookingWindowDays: coach.booking_window_days,
    rules: rules.data!,
    exceptions: exceptions.data!.map((e) => e.start_at),
    bookings: bookings.data!.map((b) => ({ start: b.start_at, end: b.end_at })),
    busy,
    now,
  });
}
