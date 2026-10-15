// Coach session: Google sign-in (which also grants calendar access), the coach's
// profile row, and helpers shared by the coach tabs.
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { callFunction } from '../api';
import { deviceTimeZone } from '../lib/time';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
].join(' ');

export type CoachProfile = {
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
  calendar_connected: boolean;
  active: boolean;
};

type CoachState = {
  session: Session | null;
  profile: CoachProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (changes: Partial<CoachProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const CoachContext = createContext<CoachState | null>(null);

function slugify(text: string) {
  const base = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${base || 'coach'}-${Math.random().toString(36).slice(2, 6)}`;
}

async function loadProfile(userId: string) {
  const { data, error } = await supabase!.from('coaches').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as CoachProfile | null;
}

/** First sign-in creates a draft profile from the Google account. */
async function ensureProfile(user: User) {
  const existing = await loadProfile(user.id);
  if (existing) return existing;
  const name: string = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Coach';
  const { data, error } = await supabase!
    .from('coaches')
    .insert({
      id: user.id,
      slug: slugify(name),
      name,
      first_name: user.user_metadata?.given_name || name.split(' ')[0],
      time_zone: deviceTimeZone(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as CoachProfile;
}

export function CoachProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) setProfile(await loadProfile(data.session.user.id).catch(() => null));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session) setProfile(await loadProfile(session.user.id));
  }, [session]);

  const signIn = useCallback(async () => {
    if (!supabase) throw new Error('The booking backend is not set up yet.');
    const redirectTo = Linking.createURL('coach/auth');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        scopes: CALENDAR_SCOPES,
        // Offline access + consent so Google returns a refresh token every time.
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return; // cancelled

    const params = new URL(result.url).searchParams;
    const code = params.get('code');
    if (!code) throw new Error(params.get('error_description') ?? 'Google sign-in did not complete.');

    const { data: auth, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;

    let coach = await ensureProfile(auth.user);
    const refreshToken = auth.session.provider_refresh_token;
    if (refreshToken) {
      await callFunction('google-connect', {
        method: 'POST',
        token: auth.session.access_token,
        body: JSON.stringify({ refreshToken, googleEmail: auth.user.email }),
      });
      coach = (await loadProfile(auth.user.id)) ?? coach;
    }
    setSession(auth.session);
    setProfile(coach);
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (changes: Partial<CoachProfile>) => {
      if (!supabase || !profile) return;
      const { data, error } = await supabase.from('coaches').update(changes).eq('id', profile.id).select('*').single();
      if (error) throw error;
      setProfile(data as CoachProfile);
    },
    [profile],
  );

  const value = useMemo(
    () => ({ session, profile, loading, signIn, signOut, updateProfile, refreshProfile }),
    [session, profile, loading, signIn, signOut, updateProfile, refreshProfile],
  );
  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

export function useCoach() {
  const ctx = useContext(CoachContext);
  if (!ctx) throw new Error('useCoach must be used inside CoachProvider');
  return ctx;
}
