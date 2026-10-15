import { router } from 'expo-router';
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Globe } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAvailability, type Slot } from '../api';
import { useBooking } from '../booking/BookingContext';
import { BrandMark } from '../components/Brand';
import { Button, OptionSheet, Progress, TopBar, styles as ui } from '../components/ui';
import { dateKey, formatDate, formatDay, formatTime, TIME_ZONES, timeZoneLabel, zonedParts } from '../lib/time';
import { colors, fonts, radius } from '../theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Month = { year: number; month: number }; // month is 1-12

function addMonths(m: Month, n: number): Month {
  const d = new Date(Date.UTC(m.year, m.month - 1 + n, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

const monthKey = (m: Month) => `${m.year}-${String(m.month).padStart(2, '0')}`;

export default function ChooseTime() {
  const { coach, timeZone, setTimeZone, slot: chosen, setSlot } = useBooking();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState(false);
  const [month, setMonth] = useState<Month | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [pickingZone, setPickingZone] = useState(false);

  useEffect(() => {
    let live = true;
    setSlots(null);
    setError(false);
    getAvailability(coach.id)
      .then((s) => live && setSlots(s))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [coach.id]);

  // Group slots by local day in the viewer's chosen timezone.
  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots ?? []) {
      const k = dateKey(new Date(s.start), timeZone);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return map;
  }, [slots, timeZone]);

  const days = useMemo(() => [...byDay.keys()].sort(), [byDay]);

  // Keep the selected day if it still has times; otherwise jump to the chosen
  // slot's day or the first day with availability.
  useEffect(() => {
    if (!days.length || (day && byDay.has(day))) return;
    const preferred = chosen ? dateKey(new Date(chosen.start), timeZone) : null;
    const target = preferred && byDay.has(preferred) ? preferred : days[0];
    setDay(target);
    setMonth({ year: +target.slice(0, 4), month: +target.slice(5, 7) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const today = zonedParts(new Date(), timeZone);
  const firstMonth: Month = { year: today.year, month: today.month };
  const lastDay = days[days.length - 1];
  const lastMonth: Month | null = lastDay ? { year: +lastDay.slice(0, 4), month: +lastDay.slice(5, 7) } : null;

  const daySlots = (day && byDay.get(day)) || [];
  const chosenStart = chosen ? new Date(chosen.start) : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <TopBar
        onBack={() => router.back()}
        center={
          <View style={styles.navBrand}>
            <BrandMark size={28} />
            <Text style={styles.navTitle}>Book a coffee</Text>
          </View>
        }
        right={{ label: 'Help', onPress: showHelp }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Progress step={1} label="CHOOSE A TIME" />

        <View style={{ gap: 8 }}>
          <View style={styles.banner}>
            <BrandMark size={44} radius={8} />
            <View style={{ gap: 2 }}>
              <Text style={styles.bannerLabel}>WPI · COFFEE WITH THE COACH</Text>
              <Text style={styles.bannerText}>{`${coach.sessionMinutes}-min session with ${coach.firstName}`}</Text>
            </View>
          </View>
          <Text style={ui.title}>Make a little space.</Text>
          <Text style={ui.body}>{`Pick a day and a ${coach.sessionMinutes}-minute slot with ${coach.firstName}.`}</Text>
        </View>

        <View style={styles.calendar}>
          {!slots || !month ? (
            <View style={styles.loading}>
              {error ? (
                <Text style={ui.body}>Couldn't load available times. Please try again.</Text>
              ) : (
                <ActivityIndicator color={colors.blue} />
              )}
            </View>
          ) : (
            <MonthGrid
              month={month}
              canPrev={monthKey(month) > monthKey(firstMonth)}
              canNext={!!lastMonth && monthKey(month) < monthKey(lastMonth)}
              onChangeMonth={(n) => setMonth(addMonths(month, n))}
              available={byDay}
              selected={day}
              onSelect={setDay}
            />
          )}
        </View>

        <Pressable style={styles.zone} onPress={() => setPickingZone(true)} accessibilityRole="button">
          <Globe size={16} color={colors.muted} strokeWidth={1.75} />
          <Text style={styles.zoneText}>{timeZoneLabel(timeZone)}</Text>
          <ChevronDown size={16} color={colors.navy} strokeWidth={2} />
        </Pressable>

        {day && daySlots.length > 0 && (
          <View style={{ gap: 12 }}>
            <View style={styles.dayHeading}>
              <Text style={styles.dayTitle}>
                {formatDay(new Date(daySlots[0].start), timeZone)}
              </Text>
              <Text style={styles.small}>{`${daySlots.length} time${daySlots.length === 1 ? '' : 's'} available`}</Text>
            </View>
            <View style={styles.slotGrid}>
              {daySlots.map((s) => {
                const selected = chosen?.start === s.start;
                return (
                  <Pressable
                    key={s.start}
                    onPress={() => setSlot(s)}
                    style={[styles.slot, selected && styles.slotSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.slotText, selected && { color: colors.blue }]}>
                      {formatTime(new Date(s.start), timeZone)}
                    </Text>
                    {selected && <Check size={16} color={colors.blue} strokeWidth={2} />}
                  </Pressable>
                );
              })}
              {daySlots.length % 2 === 1 && <View style={styles.slotSpacer} />}
            </View>
          </View>
        )}

        <View style={{ gap: 5 }}>
          {chosen && chosenStart && (
            <Text style={styles.summary}>
              {`${formatDate(chosenStart, timeZone, { day: 'numeric', month: 'short' })} · ${formatTime(chosenStart, timeZone)}–${formatTime(new Date(chosen.end), timeZone)} · ${coach.sessionMinutes} min`}
            </Text>
          )}
          <Text style={styles.small}>{`Only free times from ${coach.firstName}'s Google Calendar.`}</Text>
        </View>

        <Button label="Continue with this time" icon={ArrowRight} disabled={!chosen} onPress={() => router.push('/details')} />
      </ScrollView>

      <OptionSheet
        visible={pickingZone}
        title="Show times in"
        options={TIME_ZONES.includes(timeZone) ? TIME_ZONES : [timeZone, ...TIME_ZONES]}
        selected={timeZone}
        renderLabel={(tz) => timeZoneLabel(tz)}
        onSelect={setTimeZone}
        onClose={() => setPickingZone(false)}
      />
    </SafeAreaView>
  );
}

function showHelp() {
  Alert.alert('Need a hand?', 'Pick a day with a dot, then choose a time. Times are shown in the timezone below the calendar.');
}

function MonthGrid({
  month,
  canPrev,
  canNext,
  onChangeMonth,
  available,
  selected,
  onSelect,
}: {
  month: Month;
  canPrev: boolean;
  canNext: boolean;
  onChangeMonth: (n: number) => void;
  available: Map<string, Slot[]>;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const first = new Date(Date.UTC(month.year, month.month - 1, 1));
  const daysInMonth = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const title = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);

  return (
    <>
      <View style={styles.monthNav}>
        <Text style={styles.monthTitle}>{title}</Text>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable onPress={() => onChangeMonth(-1)} disabled={!canPrev} hitSlop={10} accessibilityLabel="Previous month">
            <ChevronLeft size={18} color={canPrev ? colors.navy : colors.disabled} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={() => onChangeMonth(1)} disabled={!canNext} hitSlop={10} accessibilityLabel="Next month">
            <ChevronRight size={18} color={canNext ? colors.navy : colors.disabled} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>
      <View style={{ gap: 6 }}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map((d, di) => {
              const key = d ? `${month.year}-${String(month.month).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
              const open = !!d && available.has(key);
              const isSel = open && key === selected;
              return (
                <Pressable
                  key={di}
                  disabled={!open}
                  onPress={() => onSelect(key)}
                  style={[styles.date, isSel && { backgroundColor: colors.blue }]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !open, selected: isSel }}
                >
                  {d && (
                    <Text
                      style={[
                        styles.dateText,
                        { color: isSel ? colors.white : open ? colors.navy : colors.disabled },
                        isSel && { fontFamily: fonts.semibold },
                      ]}
                    >
                      {d}
                    </Text>
                  )}
                  {open && <View style={[styles.dot, { backgroundColor: isSel ? colors.white : colors.blue }]} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={[styles.dot, { width: 4, height: 4 }]} />
        <Text style={[styles.small, { fontSize: 10 }]}>Dates with available sessions</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.time },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.navy },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 22 },
  banner: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.bannerLabel },
  bannerText: { fontFamily: fonts.regular, fontSize: 12, color: colors.white, opacity: 0.85 },
  calendar: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    gap: 15,
  },
  loading: { height: 280, alignItems: 'center', justifyContent: 'center' },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.navy },
  week: { flexDirection: 'row', gap: 3 },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  date: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dateText: { fontFamily: fonts.regular, fontSize: 13 },
  dot: { width: 3, height: 3, borderRadius: 3, backgroundColor: colors.blue },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  dayHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  dayTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.navy },
  small: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: {
    flexBasis: '40%',
    flexGrow: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  slotSpacer: { flexBasis: '40%', flexGrow: 1 },
  slotSelected: { backgroundColor: colors.soft, borderColor: colors.blue },
  slotText: { fontFamily: fonts.medium, fontSize: 14, color: colors.navy },
  summary: { fontFamily: fonts.medium, fontSize: 13, color: colors.navy },
});
