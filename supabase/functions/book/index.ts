// POST /book → claim a slot, then put it on the coach's Google Calendar with a
// Meet link and an invite to the guest.
import { adminClient, corsHeaders, googleToken, json, offeredSlots, type CoachRow } from '../_shared/coach.ts';
import { createEvent } from '../_shared/google.ts';
import { isOffered } from '../_shared/slots.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  coachId?: string;
  duration?: number;
  slot?: { start?: string };
  timeZone?: string;
  name?: string;
  email?: string;
  phone?: string;
  topic?: string;
  notes?: string;
};

function reference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'CW-' + [...bytes].map((b) => chars[b % chars.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const b = (await req.json().catch(() => ({}))) as Body;
  const name = b.name?.trim();
  const email = b.email?.trim();
  const topic = b.topic?.trim();
  const notes = b.notes?.trim() || null;
  if (!b.coachId || !b.slot?.start || !name || !email || !EMAIL_RE.test(email) || !topic) {
    return json({ error: 'Missing or invalid details' }, 400);
  }
  if (name.length > 120 || topic.length > 120 || (notes && notes.length > 500)) {
    return json({ error: 'Details too long' }, 400);
  }

  const db = adminClient();
  const { data } = await db.from('coaches').select('*').eq('slug', b.coachId).eq('active', true).maybeSingle();
  if (!data) return json({ error: 'Coach not found' }, 404);
  const coach = data as CoachRow;

  const duration = b.duration ?? coach.session_minutes;
  if (![30, 60].includes(duration)) return json({ error: 'duration must be 30 or 60' }, 400);

  // Re-check against live availability (rules, bookings and Google Calendar).
  let slots;
  try {
    slots = await offeredSlots(db, coach, duration);
  } catch (e) {
    console.error('book: availability', e);
    return json({ error: 'Could not check availability' }, 502);
  }
  if (!isOffered(slots, b.slot.start)) return json({ error: 'slot_taken' }, 409);

  const start = new Date(b.slot.start);
  const end = new Date(start.getTime() + duration * 60_000);

  // Claim the slot. The unique index means only one concurrent request wins.
  const { data: booking, error } = await db
    .from('bookings')
    .insert({
      coach_id: coach.id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      reference: reference(),
      guest_name: name,
      guest_email: email,
      guest_phone: b.phone?.trim() || null,
      guest_time_zone: b.timeZone ?? null,
      topic,
      notes,
    })
    .select('id, reference')
    .single();
  if (error) {
    if (error.code === '23505') return json({ error: 'slot_taken' }, 409);
    console.error('book: insert', error);
    return json({ error: 'Could not save booking' }, 500);
  }

  try {
    const token = await googleToken(db, coach.id);
    if (!token) throw new Error('coach calendar not connected');
    const event = await createEvent(token, coach.calendar_id, {
      requestId: booking.id,
      summary: `Coffee with the Coach: ${name}`,
      description: [
        `Topic: ${topic}`,
        notes ? `Notes: ${notes}` : '',
        `Email: ${email}`,
        b.phone ? `Phone: ${b.phone.trim()}` : '',
        `Booking ${booking.reference}`,
      ]
        .filter(Boolean)
        .join('\n'),
      start: start.toISOString(),
      end: end.toISOString(),
      guestEmail: email,
      guestName: name,
    });
    await db.from('bookings').update({ google_event_id: event.id, meet_link: event.meetLink ?? null }).eq('id', booking.id);
    return json({ reference: booking.reference, meetLink: event.meetLink ?? null });
  } catch (e) {
    // Free the slot again if the calendar event couldn't be created.
    console.error('book: calendar', e);
    await db.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', booking.id);
    return json({ error: 'Could not add the booking to the calendar' }, 502);
  }
});
