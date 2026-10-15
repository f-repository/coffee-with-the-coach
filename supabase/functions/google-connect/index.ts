// POST /google-connect { refreshToken, googleEmail } → store the signed-in
// coach's Google Calendar refresh token (sent once by the app after sign-in).
import { adminClient, corsHeaders, json, requireUser } from '../_shared/coach.ts';
import { accessToken } from '../_shared/google.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = adminClient();
  const userId = await requireUser(db, req);
  if (!userId) return json({ error: 'Not signed in' }, 401);

  const { refreshToken, googleEmail } = await req.json().catch(() => ({}));
  if (typeof refreshToken !== 'string' || !refreshToken) return json({ error: 'refreshToken is required' }, 400);

  // Make sure the token actually works before saving it.
  try {
    await accessToken(refreshToken);
  } catch {
    return json({ error: 'Google rejected this sign-in. Please try again.' }, 400);
  }

  const { data: coach } = await db.from('coaches').select('id').eq('id', userId).maybeSingle();
  if (!coach) return json({ error: 'Create your coach profile first' }, 409);

  const { error } = await db
    .from('google_tokens')
    .upsert({ coach_id: userId, refresh_token: refreshToken, google_email: googleEmail ?? null, updated_at: new Date().toISOString() });
  if (error) return json({ error: 'Could not save connection' }, 500);
  await db.from('coaches').update({ calendar_connected: true }).eq('id', userId);
  return json({ connected: true });
});
