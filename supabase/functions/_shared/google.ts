// Minimal Google Calendar client: token refresh, free/busy, create and cancel events.
import type { Interval } from './slots.ts';

const CAL = 'https://www.googleapis.com/calendar/v3';

export class GoogleError extends Error {}

export async function accessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new GoogleError(`token refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function call(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${CAL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok && res.status !== 410) throw new GoogleError(`${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 || res.status === 410 ? null : res.json();
}

export async function busyTimes(token: string, calendarId: string, from: Date, to: Date): Promise<Interval[]> {
  const body = await call(token, '/freeBusy', {
    method: 'POST',
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: calendarId }] }),
  });
  const cal = body.calendars[calendarId];
  if (cal?.errors?.length) throw new GoogleError(`freeBusy: ${JSON.stringify(cal.errors)}`);
  return cal?.busy ?? [];
}

export async function createEvent(
  token: string,
  calendarId: string,
  e: { requestId: string; summary: string; description: string; start: string; end: string; guestEmail: string; guestName: string },
): Promise<{ id: string; meetLink?: string }> {
  const event = await call(token, `/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: 'POST',
    body: JSON.stringify({
      summary: e.summary,
      description: e.description,
      start: { dateTime: e.start },
      end: { dateTime: e.end },
      attendees: [{ email: e.guestEmail, displayName: e.guestName }],
      conferenceData: { createRequest: { requestId: e.requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      reminders: { useDefault: true },
    }),
  });
  return { id: event.id, meetLink: event.hangoutLink };
}

export async function cancelEvent(token: string, calendarId: string, eventId: string) {
  await call(token, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: 'DELETE',
  });
}
