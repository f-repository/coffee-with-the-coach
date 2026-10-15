import { createEventInCalendarAsync } from 'expo-calendar/legacy';
import { Redirect, router } from 'expo-router';
import { CalendarCheck, CalendarPlus, Check } from 'lucide-react-native';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBooking } from '../booking/BookingContext';
import { BrandMark } from '../components/Brand';
import { AppointmentCard, Button, Progress, TopBar, styles as ui } from '../components/ui';
import { colors, fonts, radius } from '../theme';

export default function Confirmed() {
  const { coach, slot, timeZone, details, booking, reset } = useBooking();
  if (!coach || !slot || !details || !booking) return <Redirect href="/" />;

  const firstName = details.name.split(/\s+/)[0];

  function done() {
    reset();
    router.dismissAll();
    router.replace('/');
  }

  async function addToCalendar() {
    if (!slot) return;
    if (Platform.OS === 'web') {
      Alert.alert('Add to calendar', 'Use the invite in your email to add this to your calendar.');
      return;
    }
    try {
      await createEventInCalendarAsync({
        title: `Coffee with ${coach!.firstName}`,
        startDate: new Date(slot.start),
        endDate: new Date(slot.end),
        notes: `Our focus: ${details!.topic}`,
        location: booking!.meetLink ?? 'Google Meet (link in your invite)',
      });
    } catch {
      Alert.alert("Couldn't open your calendar", 'The invite in your email can be added instead.');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <TopBar center={<Text style={styles.navTitle}>Coffee with the Coach</Text>} right={{ label: 'Done', onPress: done }} />

      <ScrollView contentContainerStyle={styles.content}>
        <Progress step={3} label="ALL SET" />

        <View style={styles.success}>
          <View style={styles.seal}>
            <BrandMark size={60} radius={6} />
            <View style={styles.sealCheck}>
              <Check size={14} color={colors.white} strokeWidth={2.5} />
            </View>
          </View>
          <Text style={styles.heading}>The coffee's on.</Text>
          <Text style={styles.message}>
            {`You're booked in, ${firstName}. A little time for you, and a fresh perspective with ${coach.firstName}.`}
          </Text>
        </View>

        <AppointmentCard
          coachFirstName={coach.firstName}
          slot={slot}
          timeZone={timeZone}
          footer="Online via Google Meet · link in your invite"
          style={{ backgroundColor: colors.bg.details }}
        />

        <View style={styles.destination}>
          <View style={styles.badge}>
            <CalendarCheck size={13} color={colors.blue} strokeWidth={1.75} />
            <Text style={styles.badgeText}>{`Added to ${coach.firstName}'s Google Calendar`}</Text>
          </View>
          <Text style={styles.destText}>{`Your invite and Google Meet link are on their way to ${details.email}.`}</Text>
          <Text style={styles.topic}>{`Our focus: ${details.topic}`}</Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.noteHeading}>Come as you are.</Text>
          <Text style={[ui.body, { fontSize: 13, lineHeight: 20.8 }]}>
            Bring a coffee and one thing you'd like to explore. No prep, no pressure — just a conversation.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <Button label="Add to my calendar" icon={CalendarPlus} variant="dark" onPress={addToCalendar} />
          <Button
            label="Reschedule or cancel"
            variant="outline"
            onPress={() => Alert.alert('Reschedule or cancel', 'Rescheduling from the app is coming in a later build.')}
          />
        </View>

        <Text style={styles.reference}>{`BOOKING ${booking.reference} · A CONFIRMATION IS IN YOUR EMAIL`}</Text>

        <View style={styles.footer}>
          <BrandMark size={28} />
          <Text style={styles.footerText}>WPI LEADERSHIP</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.confirmed },
  navTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.navy },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 24 },
  success: { alignItems: 'center', gap: 14, paddingTop: 8 },
  seal: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealCheck: {
    position: 'absolute',
    left: 62,
    top: 60,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { fontFamily: fonts.serif, fontSize: 35, color: colors.navy },
  message: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22.4, color: colors.muted, textAlign: 'center' },
  destination: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.soft,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { fontFamily: fonts.medium, fontSize: 11, color: colors.blue },
  destText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19.5, color: colors.navy },
  topic: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  noteHeading: { fontFamily: fonts.serif, fontSize: 21, color: colors.navy },
  reference: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, textAlign: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 12 },
  footerText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.footer },
});
