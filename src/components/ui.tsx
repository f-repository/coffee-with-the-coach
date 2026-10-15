import { ArrowLeft, Check, Coffee, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Slot } from '../api';
import { formatDay, formatTime, timeZoneLabel } from '../lib/time';
import { colors, fonts, radius } from '../theme';

export function TopBar({
  onBack,
  center,
  right,
}: {
  onBack?: () => void;
  center: ReactNode;
  right?: { label: string; onPress: () => void; bold?: boolean };
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarSide}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <ArrowLeft size={20} color={colors.navy} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      <View style={styles.topBarCenter}>{center}</View>
      <View style={[styles.topBarSide, { alignItems: 'flex-end' }]}>
        {right && (
          <Pressable onPress={right.onPress} hitSlop={12} accessibilityRole="button">
            <Text style={[styles.topBarAction, right.bold && { fontFamily: fonts.semibold, fontSize: 13 }]}>
              {right.label}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function Progress({ step, label }: { step: 1 | 2 | 3; label: string }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.track}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i <= step ? colors.blue : colors.border }]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>{`0${step} / ${label}`}</Text>
    </View>
  );
}

type ButtonVariant = 'primary' | 'dark' | 'outline';

export function Button({
  label,
  icon: Icon,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg = variant === 'primary' ? colors.blue : variant === 'dark' ? colors.navy : colors.white;
  const fg = variant === 'outline' ? colors.navy : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === 'outline' ? colors.border : bg },
        (disabled || pressed) && { opacity: disabled ? 0.45 : 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
          {Icon && <Icon size={18} color={fg} strokeWidth={2} />}
        </>
      )}
    </Pressable>
  );
}

export function AppointmentCard({
  coachFirstName,
  slot,
  timeZone,
  footer,
  style,
}: {
  coachFirstName: string;
  slot: Slot;
  timeZone: string;
  footer?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const day = formatDay(start, timeZone, { short: true, year: true });
  return (
    <View style={[styles.apptCard, style]}>
      <View style={styles.apptRow}>
        <Text style={styles.apptTitle}>{`Coffee with ${coachFirstName}`}</Text>
        <Coffee size={19} color={colors.blue} strokeWidth={1.75} />
      </View>
      <Text style={styles.apptWhen}>{`${day} · ${formatTime(start, timeZone)}–${formatTime(end, timeZone)}`}</Text>
      <Text style={styles.apptZone}>{timeZoneLabel(timeZone, start)}</Text>
      {footer && <Text style={styles.apptFooter}>{footer}</Text>}
    </View>
  );
}

export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  renderLabel = (o) => o,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: T[];
  selected: T | null;
  renderLabel?: (o: T) => string;
  onSelect: (o: T) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.sheetTitle}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(o) => o}
          renderItem={({ item }) => (
            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.sheetOptionText, item === selected && { color: colors.blue, fontFamily: fonts.semibold }]}>
                {renderLabel(item)}
              </Text>
              {item === selected && <Check size={18} color={colors.blue} />}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 },
  topBarSide: { width: 60 },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarAction: { fontFamily: fonts.regular, fontSize: 12, color: colors.blue },
  track: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 3, borderRadius: 3 },
  stepLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.blue },
  button: {
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 14 },
  apptCard: { backgroundColor: colors.soft, borderRadius: radius.lg, padding: 16, gap: 10 },
  apptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  apptTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.navy },
  apptWhen: { fontFamily: fonts.regular, fontSize: 14, color: colors.navy },
  apptZone: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  apptFooter: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(13,45,78,0.35)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 24,
    maxHeight: '70%',
  },
  sheetTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.navy, marginBottom: 8 },
  sheetOption: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetOptionText: { fontFamily: fonts.regular, fontSize: 15, color: colors.navy },
  title: { fontFamily: fonts.serif, fontSize: 32, color: colors.navy },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted },
});
