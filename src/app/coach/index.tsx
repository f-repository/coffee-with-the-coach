import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { backendConfigured } from '../../api';
import { SIGN_IN_REDIRECT, SignInError, useCoach } from '../../coach/CoachContext';
import { BrandMark } from '../../components/Brand';
import { Button, TopBar, styles as ui } from '../../components/ui';
import { colors, fonts } from '../../theme';

const STEP_LABELS: Record<SignInError['step'], string> = {
  setup: 'Setup',
  start: 'Starting sign-in',
  google: 'Google sign-in',
  session: 'Creating your session',
  profile: 'Creating your coach profile',
};

export default function CoachSignIn() {
  const { session, profile, loading, signIn } = useCoach();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }
  if (session && profile) return <Redirect href="/coach/calendar" />;

  async function onSignIn() {
    setBusy(true);
    setProblem(null);
    try {
      const result = await signIn();
      if (result === 'cancelled') {
        setProblem(
          'Sign-in was closed before finishing. If you saw a "localhost" error page, add the return address below ' +
            'to Supabase → Authentication → URL Configuration → Redirect URLs.',
        );
      }
    } catch (e) {
      const step = e instanceof SignInError ? STEP_LABELS[e.step] : 'Sign-in';
      setProblem(`${step} failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <TopBar onBack={() => router.back()} center={<Text style={styles.navTitle}>Coach sign-in</Text>} />
      <ScrollView contentContainerStyle={styles.content}>
        <BrandMark size={64} radius={10} />
        <View style={{ gap: 8 }}>
          <Text style={ui.title}>Room for conversation.</Text>
          <Text style={[ui.body, { color: colors.coach.muted }]}>
            Sign in with the Google account whose calendar you use for coaching. We'll use it to check when you're busy
            and to add coffees to your calendar with a Google Meet link.
          </Text>
        </View>
        {backendConfigured ? (
          <Button label="Continue with Google" variant="dark" loading={busy} onPress={onSignIn} />
        ) : (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Coach sign-in will work once the booking backend is connected. See SETUP.md in the project.
            </Text>
          </View>
        )}
        {problem && (
          <View style={styles.problem}>
            <Text style={styles.problemText} selectable>
              {problem}
            </Text>
          </View>
        )}
        <Pressable onPress={() => router.replace('/')} style={{ alignSelf: 'center' }} accessibilityRole="link">
          <Text style={styles.link}>Back to booking</Text>
        </Pressable>
        {backendConfigured && (
          <View style={{ gap: 4 }}>
            <Text style={styles.hintLabel}>Return address (must be in Supabase Redirect URLs)</Text>
            <Text style={styles.hint} selectable>
              {SIGN_IN_REDIRECT}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.coach.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.navy },
  content: { paddingHorizontal: 24, paddingTop: 24, gap: 24 },
  notice: { backgroundColor: colors.coach.badge, borderRadius: 12, padding: 14 },
  noticeText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.navy },
  link: { fontFamily: fonts.regular, fontSize: 12, color: colors.link },
  problem: { backgroundColor: '#f8e7e8', borderRadius: 12, padding: 14 },
  problemText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.error },
  hintLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.coach.muted },
  hint: { fontFamily: fonts.regular, fontSize: 11, color: colors.navy },
});
