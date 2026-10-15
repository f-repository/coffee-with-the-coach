import { router, useFocusEffect } from 'expo-router';
import { CalendarDays, Check, CircleAlert } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAvailability, type Slot } from '../../../api';
import { useCoach } from '../../../coach/CoachContext';
import { CoachHeader } from '../../../coach/CoachHeader';
import { cancelBooking, listRules, summarizeRules, upcomingBookings, type CoachBooking, type Rule } from '../../../coach/data';
import { OptionSheet, styles as ui } from '../../../components/ui';
import { dateKey, formatDay, formatTime, timeZoneLabel } from '../../../lib/time';
import { colors, fonts, radius } from '../../../theme';

type AgendaItem = { start: string; end: string; booking?: CoachBooking };

export default function CoachCalendar() {
  const { session, profile, signIn } = useCoach();
  const [rules, setRules] = useState<Rule[]>([]);
  const [bookings, setBookings] = useState<CoachBooking[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [pickingDay, setPickingDay] = useState(false);

  const tz = profile?.time_zone ?? 'America/New_York';

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const [r, b] = await Promise.all([listRules(), upcomingBookings()]);
      setRules(r);
      setBookings(b);
      setSlots(profile.active && profile.calendar_connected ? await getAvailability(profile.slug).catch(() => []) : []);
    } catch (e) {
      Alert.alert("Couldn't load your calendar", e instanceof Error ? e.message : 'Please try again.');
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Days with anything on them, for the day picker.
  const byDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    const add = (item: AgendaItem) => {
      const k = dateKey(new Date(item.start), tz);
      map.set(k, [...(map.get(k) ?? []), item]);
    };
    bookings.forEach((b) => add({ start: b.start_at, end: b.end_at, booking: b }));
    slots.forEach((s) => add(s));
    for (const items of map.values()) items.sort((a, b) => a.start.localeCompare(b.start));
    return map;
  }, [bookings, slots, tz]);
  const days = useMemo(() => [...byDay.keys()].sort(), [byDay]);
  const shownDay = day && byDay.has(day) ? day : days[0] ?? null;
  const items = (shownDay && byDay.get(shownDay)) || [];

  if (!profile) return null;

  function confirmCancel(b: CoachBooking) {
    Alert.alert(
      `Cancel coffee with ${b.guest_name}?`,
      'The calendar event is removed and they get a cancellation email. The time becomes available again.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(b.id);
              await load();
            } catch (e) {
              Alert.alert("Couldn't cancel", e instanceof Error ? e.message : 'Please try again.');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <CoachHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={{ gap: 6 }}>
          <Text style={ui.title}>Room for conversation.</Text>
          <Text style={styles.subtitle}>Your calendar, with a little breathing space.</Text>
        </View>

        {!profile.active && (
          <Pressable style={styles.warning} onPress={() => router.navigate('/coach/profile')} accessibilityRole="button">
            <CircleAlert size={16} color={colors.navy} strokeWidth={1.75} />
            <Text style={styles.warningText}>You're not taking bookings yet. Turn on "Accepting bookings" in Profile.</Text>
          </Pressable>
        )}

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>Google Calendar</Text>
            <View style={[styles.badge, !profile.calendar_connected && { backgroundColor: '#f8e7e8' }]}>
              {profile.calendar_connected ? (
                <Check size={13} color={colors.blue} strokeWidth={2} />
              ) : (
                <CircleAlert size={13} color={colors.error} strokeWidth={2} />
              )}
              <Text style={[styles.badgeText, !profile.calendar_connected && { color: colors.error }]}>
                {profile.calendar_connected ? 'Connected' : 'Not connected'}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>{session?.user.email}</Text>
          <Text style={styles.small}>
            Checks your primary calendar for busy times and hides any coffee slot that clashes. New bookings are saved
            to the same calendar with a Google Meet link.
          </Text>
          <View style={styles.row}>
            <Text style={[styles.small, { fontSize: 10 }]}>
              {profile.calendar_connected ? 'Busy times are checked live' : 'Connect to start taking bookings'}
            </Text>
            <Pressable onPress={() => signIn().catch((e) => Alert.alert("Couldn't connect", String(e?.message ?? e)))}>
              <Text style={styles.action}>{profile.calendar_connected ? 'Manage connection' : 'Connect'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View style={[styles.row, { alignItems: 'baseline' }]}>
            <Text style={styles.sectionTitle}>Your booking window</Text>
            <Pressable onPress={() => router.navigate('/coach/availability')} hitSlop={8}>
              <Text style={[styles.action, { fontSize: 12 }]}>Edit rules</Text>
            </Pressable>
          </View>
          <View style={styles.rulesCard}>
            <RuleRow label="Days & hours" value={summarizeRules(rules)} />
            <RuleRow label="Session / buffer" value={`${profile.session_minutes} min / ${profile.buffer_minutes} min`} />
            <RuleRow
              label="Notice / booking horizon"
              value={`${profile.min_notice_hours} hours / ${profile.booking_window_days} days`}
            />
            <RuleRow label="Slot start times" value={`Every ${profile.session_minutes + profile.buffer_minutes} minutes`} />
            <View style={styles.divider} />
            <Text style={[styles.small, { color: colors.muted }]}>{timeZoneLabel(tz)}</Text>
            <Text style={[styles.small, { color: colors.blue }]}>
              Only offer slots when the session and buffer are free. Busy events are never bookable.
            </Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>
              {shownDay ? formatDay(new Date(items[0].start), tz, { short: true, year: true }) : 'Nothing scheduled yet'}
            </Text>
            {days.length > 1 && (
              <Pressable onPress={() => setPickingDay(true)} hitSlop={10} accessibilityLabel="Choose a day">
                <CalendarDays size={18} color={colors.blue} strokeWidth={1.75} />
              </Pressable>
            )}
          </View>

          {items.length > 0 && (
            <View style={styles.strip}>
              {items.map((it) => (
                <View key={it.start} style={[styles.slot, it.booking && { backgroundColor: colors.navy }]}>
                  <Text style={[styles.slotTime, it.booking && { color: colors.white }]}>{formatTime(new Date(it.start), tz)}</Text>
                  <Text style={[styles.slotState, it.booking && { color: colors.white }]}>{it.booking ? 'Booked' : 'Available'}</Text>
                </View>
              ))}
            </View>
          )}

          {items
            .filter((it) => it.booking)
            .map(({ booking: b }) => (
              <View key={b!.id} style={styles.event}>
                <View style={styles.row}>
                  <Text style={styles.eventTime}>
                    {`${formatTime(new Date(b!.start_at), tz)}–${formatTime(new Date(b!.end_at), tz)} · ${profile.session_minutes} min`}
                  </Text>
                  <Text style={styles.eventStatus}>CONFIRMED</Text>
                </View>
                <Text style={styles.eventTitle}>{`Coffee with ${b!.guest_name}`}</Text>
                <Text style={styles.eventLine}>{b!.guest_email}</Text>
                {b!.guest_phone && <Text style={[styles.eventLine, { color: colors.coach.muted }]}>{b!.guest_phone}</Text>}
                <View style={styles.divider} />
                <Text style={styles.eventTopic}>{b!.topic}</Text>
                {b!.notes && <Text style={styles.small}>{b!.notes}</Text>}
                <View style={styles.row}>
                  {b!.meet_link ? (
                    <Pressable onPress={() => Linking.openURL(b!.meet_link!)}>
                      <Text style={styles.link}>Join Google Meet ↗</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.link}>Google Meet attached</Text>
                  )}
                  <Pressable onPress={() => confirmCancel(b!)}>
                    <Text style={[styles.link, { fontFamily: fonts.semibold }]}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ))}
        </View>
      </ScrollView>

      <OptionSheet
        visible={pickingDay}
        title="Choose a day"
        options={days}
        selected={shownDay}
        renderLabel={(k) => {
          const first = byDay.get(k)![0];
          const booked = byDay.get(k)!.filter((i) => i.booking).length;
          return `${formatDay(new Date(first.start), tz, { short: true })}${booked ? ` · ${booked} booked` : ''}`;
        }}
        onSelect={setDay}
        onClose={() => setPickingDay(false)}
      />
    </SafeAreaView>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <Text style={styles.ruleValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.coach.bg },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 20 },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.coach.muted },
  warning: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.coach.badge,
    borderRadius: radius.md,
    padding: 12,
  },
  warningText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.navy },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.coach.border,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.navy },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.coach.badge,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { fontFamily: fonts.medium, fontSize: 11, color: colors.blue },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.coach.muted },
  small: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16.5, color: colors.coach.muted },
  action: { fontFamily: fonts.medium, fontSize: 11, color: colors.blue },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.navy },
  rulesCard: { backgroundColor: colors.soft, borderRadius: radius.lg, padding: 16, gap: 12 },
  ruleLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.coach.muted },
  ruleValue: { fontFamily: fonts.medium, fontSize: 12, color: colors.navy, flexShrink: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.coach.border },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { flexBasis: '30%', flexGrow: 1, backgroundColor: colors.coach.sky, borderRadius: 10, padding: 10, gap: 4 },
  slotTime: { fontFamily: fonts.semibold, fontSize: 12, color: colors.blue },
  slotState: { fontFamily: fonts.regular, fontSize: 10, color: colors.blue },
  event: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
  },
  eventTime: { fontFamily: fonts.semibold, fontSize: 12, color: colors.blue },
  eventStatus: { fontFamily: fonts.regular, fontSize: 10, color: colors.blue },
  eventTitle: { fontFamily: fonts.serif, fontSize: 23, color: colors.navy },
  eventLine: { fontFamily: fonts.regular, fontSize: 12, color: colors.navy },
  eventTopic: { fontFamily: fonts.semibold, fontSize: 12, color: colors.navy },
  link: { fontFamily: fonts.regular, fontSize: 11, color: colors.blue },
});
