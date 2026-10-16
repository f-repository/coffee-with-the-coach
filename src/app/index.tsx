import { router } from 'expo-router';
import { ArrowRight, CalendarCheck, ChevronDown, Clock, Menu, Video } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DURATION_OPTIONS, useBooking } from '../booking/BookingContext';
import { BrandMark, HeroImage } from '../components/Brand';
import { Button, OptionSheet } from '../components/ui';
import { colors, fonts, radius } from '../theme';

export default function Welcome() {
  const { coaches, coachesError, reloadCoaches, coach, setCoach, durationMinutes, setDurationMinutes } = useBooking();
  const [picking, setPicking] = useState(false);
  const [pickingDuration, setPickingDuration] = useState(false);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.nav}>
        <View style={styles.wordmark}>
          <BrandMark size={26} />
          <Text style={styles.brand}>COFFEE WITH THE COACH</Text>
        </View>
        <Menu size={20} color={colors.navy} strokeWidth={2} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <HeroImage height={225} />

        <View style={styles.content}>
          <Text style={styles.headline}>Elevate your Leadership, One Cup at a Time</Text>
          <Text style={styles.intro}>
            A relaxed, one-to-one conversation over coffee to unpack what's on your mind and map out a clear path forward.
          </Text>

          <View style={{ gap: 10 }}>
            <Text style={styles.label}>Choose a coach</Text>
            {coach ? (
              <Pressable
                style={styles.dropdown}
                onPress={() => setPicking(true)}
                accessibilityRole="button"
                accessibilityLabel={`Coach: ${coach.name}. Change coach`}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.coachName}>{coach.name}</Text>
                  <Text style={styles.coachCredential}>{coach.credential}</Text>
                </View>
                <ChevronDown size={17} color={colors.navy} strokeWidth={2} />
              </Pressable>
            ) : (
              <Pressable style={styles.dropdown} onPress={reloadCoaches} disabled={!coachesError} accessibilityRole="button">
                {coachesError ? (
                  <Text style={styles.coachCredential}>Couldn't load coaches. Tap to try again.</Text>
                ) : coaches ? (
                  <Text style={styles.coachCredential}>No coaches are taking bookings right now.</Text>
                ) : (
                  <ActivityIndicator color={colors.blue} />
                )}
              </Pressable>
            )}
          </View>

          <View style={{ gap: 10 }}>
            <Text style={styles.label}>Session length</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setPickingDuration(true)}
              accessibilityRole="button"
              accessibilityLabel={`Session length: ${durationMinutes} minutes. Change session length`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.coachName}>{durationMinutes} minutes</Text>
              </View>
              <ChevronDown size={17} color={colors.navy} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.facts}>
            <Fact icon={<Clock size={18} color={colors.navy} strokeWidth={1.75} />} label={`${durationMinutes} minutes`} />
            <Fact icon={<Video size={18} color={colors.navy} strokeWidth={1.75} />} label="Online" />
          </View>

          <Button label="Find a time for your coffee" icon={ArrowRight} variant="dark" disabled={!coach} onPress={() => router.push('/time')} />

          {coach && (
            <View style={styles.reassurance}>
              <CalendarCheck size={14} color={colors.mutedStrong} strokeWidth={1.75} />
              <Text style={styles.small}>{`Live availability from ${coach.firstName}'s calendar`}</Text>
            </View>
          )}

          <Pressable
            onPress={() => router.push('/coach')}
            accessibilityRole="link"
            style={{ alignSelf: 'center' }}
          >
            <Text style={styles.coachLink}>Are you a coach? Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>

      <OptionSheet
        visible={picking}
        title="Choose a coach"
        options={(coaches ?? []).map((c) => c.id)}
        selected={coach?.id ?? null}
        renderLabel={(id) => coaches!.find((c) => c.id === id)!.name}
        onSelect={(id) => setCoach(coaches!.find((c) => c.id === id)!)}
        onClose={() => setPicking(false)}
      />

      <OptionSheet
        visible={pickingDuration}
        title="Session length"
        options={DURATION_OPTIONS.map(String)}
        selected={String(durationMinutes)}
        renderLabel={(m) => `${m} minutes`}
        onSelect={(m) => setDurationMinutes(Number(m))}
        onClose={() => setPickingDuration(false)}
      />
    </SafeAreaView>
  );
}

function Fact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.fact}>
      {icon}
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.welcome },
  nav: { height: 52, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brand: { fontFamily: fonts.semibold, fontSize: 12, color: colors.navy },
  content: { paddingHorizontal: 24, paddingTop: 26, gap: 18 },
  headline: { fontFamily: fonts.serif, fontSize: 31, lineHeight: 34, color: colors.navy, marginRight: -17 },
  intro: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22.4, color: colors.mutedStrong },
  label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.mutedStrong },
  dropdown: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.navy },
  coachCredential: { fontFamily: fonts.regular, fontSize: 12, color: colors.mutedStrong },
  facts: {
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  fact: { alignItems: 'center', gap: 7 },
  factLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.navy },
  reassurance: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  small: { fontFamily: fonts.regular, fontSize: 11, color: colors.mutedStrong },
  coachLink: { fontFamily: fonts.regular, fontSize: 12, color: colors.link },
});
