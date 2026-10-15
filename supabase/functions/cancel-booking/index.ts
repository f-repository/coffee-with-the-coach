// POST /cancel-booking { bookingId } → the coach cancels one of their bookings.
// The Google event is removed (the guest is notified) and the slot reopens.
import { adminClient, corsHeaders, googleToken, json, requireUser, type CoachRow } from '../_shared/coach.ts';
import { cancelEvent } from '../_shared/google.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = adminClient();
  const userId = await requireUser(db, req);
  if (!userId) return json({ error: 'Not signed in' }, 401);

  const { bookingId } = await req.json().catch(() => ({}));
  const { data: booking } = await db
    .from('bookings')
    .select('id, coach_id, status, google_event_id')
    .eq('id', bookingId)
    .eq('coach_id', userId)
    .maybeSingle();
  if (!booking) return json({ error: 'Booking not found' }, 404);
  if (booking.status === 'cancelled') return json({ cancelled: true });

  if (booking.google_event_id) {
    const { data: coach } = await db.from('coaches').select('*').eq('id', userId).single();
    try {
      const token = await googleToken(db, userId);
      if (token) await cancelEvent(token, (coach as CoachRow).calendar_id, booking.google_event_id);
    } catch (e) {
      console.error('cancel: calendar', e);
      return json({ error: 'Could not remove the calendar event' }, 502);
    }
  }

  await db.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', booking.id);
  return json({ cancelled: true });
});
