import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { backendConfigured } from '../../api';
import { useCoach } from '../../coach/CoachContext';
import { BrandMark } from '../../components/Brand';
import { Button, TopBar, styles as ui } from '../../components/ui';
import { colors, fonts } from '../../theme';

export default function CoachSignIn() {
  const { session, profile, loading, signIn } = useCoach();
  const [busy, setBusy] = useState(false);

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
    try {
      await signIn();
    } catch (e) {
      Alert.alert("Couldn't sign in", e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <TopBar onBack={() => router.back()} center={<Text style={styles.navTitle}>Coach sign-in</Text>} />
      <View style={styles.content}>
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
        <Pressable onPress={() => router.replace('/')} style={{ alignSelf: 'center' }} accessibilityRole="link">
          <Text style={styles.link}>Back to booking</Text>
        </Pressable>
      </View>
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
});
