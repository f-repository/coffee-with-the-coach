import { useFocusEffect } from 'expo-router';
import { ChevronDown, Plus, Trash2, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAvailability, type Slot } from '../../../api';
import { useCoach, type CoachProfile } from '../../../coach/CoachContext';
import { CoachHeader } from '../../../coach/CoachHeader';
import {
  addRules,
  deleteRule,
  hhmm,
  listRules,
  removeSlot,
  WEEK_ORDER,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  type Rule,
} from '../../../coach/data';
import { Button, OptionSheet, styles as ui } from '../../../components/ui';
import { dateKey, formatDay, formatTime } from '../../../lib/time';
import { colors, fonts, radius } from '../../../theme';

// Half-hour steps from 06:00 to 21:00.
const TIMES = Array.from({ length: 31 }, (_, i) => {
  const m = 360 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});

type SettingKey = 'buffer_minutes' | 'min_notice_hours' | 'booking_window_days';
const SETTINGS: { key: SettingKey; label: string; options: number[]; unit: (n: number) => string }[] = [
  { key: 'buffer_minutes', label: 'Buffer between coffees', options: [0, 10, 15, 30], unit: (n) => `${n} min` },
  { key: 'min_notice_hours', label: 'Minimum notice', options: [2, 12, 24, 48, 72], unit: (n) => `${n} hours` },
  { key: 'booking_window_days', label: 'Booking horizon', options: [14, 30, 60, 90], unit: (n) => `${n} days` },
];

export default function CoachAvailability() {
  const { profile, updateProfile } = useCoach();
  const [rules, setRules] = useState<Rule[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [adding, setAdding] = useState(false);
  const [setting, setSetting] = useState<SettingKey | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRules(await listRules());
      setSlots(profile.active && profile.calendar_connected ? await getAvailability(profile.slug).catch(() => []) : []);
    } catch (e) {
      Alert.alert("Couldn't load availability", e instanceof Error ? e.message : 'Please try again.');
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const tz = profile?.time_zone ?? 'America/New_York';
  const upcoming = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots.slice(0, 60)) {
      const k = dateKey(new Date(s.start), tz);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()].slice(0, 10);
  }, [slots, tz]);

  if (!profile) return null;
  const activeSetting = SETTINGS.find((s) => s.key === setting);

  function confirmDeleteRule(r: Rule) {
    Alert.alert(`Remove ${WEEKDAY_NAMES[r.weekday]} ${hhmm(r.start_time)}–${hhmm(r.end_time)}?`, 'Existing bookings are kept.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteRule(r.id).then(load).catch((e) => Alert.alert("Couldn't remove", e.message)),
      },
    ]);
  }

  function confirmRemoveSlot(s: Slot) {
    const when = `${formatDay(new Date(s.start), tz, { short: true })} at ${formatTime(new Date(s.start), tz)}`;
    Alert.alert(`Remove ${when}?`, 'Only this one time is removed. Your weekly hours stay the same.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeSlot(profile!.id, s.start).then(load).catch((e) => Alert.alert("Couldn't remove", e.message)),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <CoachHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: 6 }}>
          <Text style={ui.title}>Your booking window</Text>
          <Text style={styles.subtitle}>Set the hours you'd like to offer each week. They repeat until you change them.</Text>
        </View>

        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>Weekly hours</Text>
          <View style={styles.card}>
            {WEEK_ORDER.map((d, i) => {
              const dayRules = rules.filter((r) => r.weekday === d);
              return (
                <View key={d} style={[styles.dayRow, i > 0 && styles.rowBorder]}>
                  <Text style={styles.dayName}>{WEEKDAY_SHORT[d]}</Text>
                  <View style={{ flex: 1, gap: 6 }}>
                    {dayRules.length === 0 ? (
                      <Text style={styles.muted}>Not available</Text>
                    ) : (
                      dayRules.map((r) => (
                        <View key={r.id} style={styles.window}>
                          <Text style={styles.windowText}>{`${hhmm(r.start_time)}–${hhmm(r.end_time)}`}</Text>
                          <Pressable onPress={() => confirmDeleteRule(r)} hitSlop={10} accessibilityLabel="Remove these hours">
                            <Trash2 size={15} color={colors.coach.muted} strokeWidth={1.75} />
                          </Pressable>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              );
            })}
          </View>
          <Button label="Add weekly hours" icon={Plus} variant="outline" onPress={() => setAdding(true)} />
        </View>

        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>Booking rules</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Session length</Text>
              <Text style={styles.settingValue}>{`${profile.session_minutes} min`}</Text>
            </View>
            {SETTINGS.map((s) => (
              <Pressable key={s.key} style={[styles.settingRow, styles.rowBorder]} onPress={() => setSetting(s.key)} accessibilityRole="button">
                <Text style={styles.settingLabel}>{s.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.settingValue}>{s.unit(profile[s.key])}</Text>
                  <ChevronDown size={15} color={colors.navy} strokeWidth={2} />
                </View>
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>
            Anything on your Google Calendar automatically hides the slots it overlaps, including the buffer around it.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>Upcoming open slots</Text>
          {upcoming.length === 0 ? (
            <Text style={styles.muted}>
              {profile.active
                ? 'No open slots yet. Add weekly hours above.'
                : 'Turn on "Accepting bookings" in Profile to publish your slots.'}
            </Text>
          ) : (
            <>
              <Text style={styles.note}>Tap a time to remove just that one.</Text>
              {upcoming.map(([k, daySlots]) => (
                <View key={k} style={{ gap: 8 }}>
                  <Text style={styles.upcomingDay}>{formatDay(new Date(daySlots[0].start), tz, { short: true })}</Text>
                  <View style={styles.chips}>
                    {daySlots.map((s) => (
                      <Pressable key={s.start} style={styles.chip} onPress={() => confirmRemoveSlot(s)} accessibilityRole="button">
                        <Text style={styles.chipText}>{formatTime(new Date(s.start), tz)}</Text>
                        <X size={12} color={colors.blue} strokeWidth={2} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <AddHoursSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onSave={async (weekdays, start, end) => {
          await addRules(profile.id, weekdays, start, end);
          setAdding(false);
          load();
        }}
      />

      <OptionSheet
        visible={!!activeSetting}
        title={activeSetting?.label ?? ''}
        options={(activeSetting?.options ?? []).map(String)}
        selected={activeSetting ? String(profile[activeSetting.key]) : null}
        renderLabel={(v) => activeSetting!.unit(Number(v))}
        onSelect={(v) =>
          updateProfile({ [activeSetting!.key]: Number(v) } as Partial<CoachProfile>)
            .then(load)
            .catch((e) => Alert.alert("Couldn't save", e.message))
        }
        onClose={() => setSetting(null)}
      />
    </SafeAreaView>
  );
}

function AddHoursSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (weekdays: number[], start: string, end: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('11:00');
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const [saving, setSaving] = useState(false);
  const valid = days.length > 0 && end > start;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[sheet.body, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={sheet.title}>Add weekly hours</Text>
        <Text style={sheet.label}>Repeat every</Text>
        <View style={styles.chips}>
          {WEEK_ORDER.map((d) => {
            const on = days.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => setDays((cur) => (on ? cur.filter((x) => x !== d) : [...cur, d]))}
                style={[sheet.day, on && sheet.dayOn]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <Text style={[sheet.dayText, on && { color: colors.white }]}>{WEEKDAY_SHORT[d]}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['start', 'end'] as const).map((which) => (
            <View key={which} style={{ flex: 1, gap: 8 }}>
              <Text style={sheet.label}>{which === 'start' ? 'From' : 'Until'}</Text>
              <Pressable style={sheet.time} onPress={() => setPicking(which)} accessibilityRole="button">
                <Text style={sheet.timeText}>{which === 'start' ? start : end}</Text>
                <ChevronDown size={16} color={colors.navy} strokeWidth={2} />
              </Pressable>
            </View>
          ))}
        </View>
        {end <= start && <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.error }}>End time must be after start time.</Text>}
        <Button
          label="Save hours"
          disabled={!valid}
          loading={saving}
          onPress={async () => {
            setSaving(true);
            try {
              await onSave(days, start, end);
              setDays([]);
            } catch (e) {
              Alert.alert("Couldn't save", e instanceof Error ? e.message : 'Please try again.');
            } finally {
              setSaving(false);
            }
          }}
        />
      </View>
      <OptionSheet
        visible={!!picking}
        title={picking === 'start' ? 'From' : 'Until'}
        options={TIMES}
        selected={picking === 'start' ? start : end}
        onSelect={(t) => (picking === 'start' ? setStart(t) : setEnd(t))}
        onClose={() => setPicking(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.coach.bg },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 24 },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.coach.muted },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.navy },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.coach.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.coach.border },
  dayRow: { flexDirection: 'row', paddingVertical: 12, gap: 12 },
  dayName: { width: 40, fontFamily: fonts.semibold, fontSize: 13, color: colors.navy, paddingTop: 1 },
  window: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  windowText: { fontFamily: fonts.medium, fontSize: 13, color: colors.navy },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.coach.muted },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  settingLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.coach.muted },
  settingValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.navy },
  note: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16.5, color: colors.blue },
  upcomingDay: { fontFamily: fonts.semibold, fontSize: 13, color: colors.navy },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.coach.sky,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.blue },
});

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(13,45,78,0.35)' },
  body: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 14,
  },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.navy },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.navy },
  day: {
    width: 44,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.coach.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  dayText: { fontFamily: fonts.medium, fontSize: 12, color: colors.navy },
  time: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: { fontFamily: fonts.regular, fontSize: 14, color: colors.navy },
});
