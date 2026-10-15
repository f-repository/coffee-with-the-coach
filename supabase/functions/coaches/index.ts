// GET /coaches → active coaches customers can book with.
import { adminClient, corsHeaders, json, publicCoach, type CoachRow } from '../_shared/coach.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = adminClient();
  const { data, error } = await db.from('coaches').select('*').eq('active', true).order('name');
  if (error) return json({ error: 'Could not load coaches' }, 500);
  return json({ coaches: (data as CoachRow[]).map(publicCoach) });
});
