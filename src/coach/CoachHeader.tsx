import { StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '../components/Brand';
import { colors, fonts } from '../theme';
import { useCoach } from './CoachContext';

export function CoachHeader() {
  const { profile } = useCoach();
  const initials = (profile?.name ?? '')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={styles.nav}>
      <BrandMark size={48} radius={8} />
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { height: 60, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.coach.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fonts.semibold, fontSize: 11, color: colors.navy },
});
