// GET /availability?coach=<slug> → open slots for that coach.
import { adminClient, corsHeaders, json, offeredSlots, type CoachRow } from '../_shared/coach.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const slug = new URL(req.url).searchParams.get('coach');
  if (!slug) return json({ error: 'coach is required' }, 400);

  const db = adminClient();
  const { data: coach } = await db.from('coaches').select('*').eq('slug', slug).eq('active', true).maybeSingle();
  if (!coach) return json({ error: 'Coach not found' }, 404);

  const durationParam = new URL(req.url).searchParams.get('duration');
  const duration = durationParam ? Number(durationParam) : coach.session_minutes;
  if (![30, 60].includes(duration)) return json({ error: 'duration must be 30 or 60' }, 400);

  try {
    return json({ slots: await offeredSlots(db, coach as CoachRow, duration) });
  } catch (e) {
    console.error('availability', slug, e);
    return json({ error: 'Could not load available times' }, 502);
  }
});
