import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCoach } from '../../../coach/CoachContext';
import { CoachHeader } from '../../../coach/CoachHeader';
import { listRules } from '../../../coach/data';
import { Button, OptionSheet, styles as ui } from '../../../components/ui';
import { TIME_ZONES, timeZoneLabel } from '../../../lib/time';
import { colors, fonts, radius } from '../../../theme';

export default function CoachProfileScreen() {
  const { session, profile, updateProfile, signOut } = useCoach();
  const [name, setName] = useState(profile?.name ?? '');
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [credential, setCredential] = useState(profile?.credential ?? '');
  const [saving, setSaving] = useState(false);
  const [pickingZone, setPickingZone] = useState(false);

  if (!profile) return null;
  const dirty = name !== profile.name || firstName !== profile.first_name || credential !== profile.credential;

  async function save() {
    if (!name.trim() || !firstName.trim()) {
      Alert.alert('Name required', 'Please enter your name and first name.');
      return;
    }
    setSaving(true);
    try {
      const changes = { name: name.trim(), first_name: firstName.trim(), credential: credential.trim() };
      await updateProfile(changes);
      setName(changes.name);
      setFirstName(changes.first_name);
      setCredential(changes.credential);
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(on: boolean) {
    if (on) {
      if (!profile!.calendar_connected) {
        Alert.alert('Connect Google Calendar first', 'Bookings need your calendar so clashes can be avoided.');
        return;
      }
      if ((await listRules().catch(() => [])).length === 0) {
        Alert.alert('Add weekly hours first', 'Set the hours you want to offer in the Availability tab.');
        return;
      }
    }
    updateProfile({ active: on }).catch((e) => Alert.alert("Couldn't update", e.message));
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <CoachHeader />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={ui.title}>Your profile</Text>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.switchTitle}>Accepting bookings</Text>
              <Text style={styles.muted}>
                {profile.active ? 'Customers can see you and book your open slots.' : 'Hidden from customers.'}
              </Text>
            </View>
            <Switch
              value={profile.active}
              onValueChange={toggleActive}
              trackColor={{ true: colors.blue, false: colors.coach.border }}
              accessibilityLabel="Accepting bookings"
            />
          </View>
        </View>

        <View style={{ gap: 14 }}>
          <Field label="Full name" value={name} onChangeText={setName} />
          <Field label="First name (shown to customers)" value={firstName} onChangeText={setFirstName} />
          <Field label="Title or credential" value={credential} onChangeText={setCredential} placeholder="e.g. President and CEO of WPI" />
          <View style={{ gap: 7 }}>
            <Text style={styles.label}>Your timezone</Text>
            <Pressable style={[styles.input, styles.select]} onPress={() => setPickingZone(true)} accessibilityRole="button">
              <Text style={styles.inputText}>{timeZoneLabel(profile.time_zone)}</Text>
              <ChevronDown size={16} color={colors.navy} strokeWidth={2} />
            </Pressable>
            <Text style={styles.muted}>Your weekly hours are in this timezone.</Text>
          </View>
          {dirty && <Button label="Save changes" loading={saving} onPress={save} />}
        </View>

        <View style={styles.card}>
          <Text style={styles.muted}>{`Signed in as ${session?.user.email ?? ''}`}</Text>
        </View>

        <Button
          label="Sign out"
          variant="outline"
          onPress={async () => {
            await signOut();
            router.replace('/');
          }}
        />
        <Pressable onPress={() => router.replace('/')} style={{ alignSelf: 'center' }} accessibilityRole="link">
          <Text style={styles.link}>View the booking app</Text>
        </Pressable>
      </ScrollView>

      <OptionSheet
        visible={pickingZone}
        title="Your timezone"
        options={TIME_ZONES.includes(profile.time_zone) ? TIME_ZONES : [profile.time_zone, ...TIME_ZONES]}
        selected={profile.time_zone}
        renderLabel={(tz) => timeZoneLabel(tz)}
        onSelect={(tz) => updateProfile({ time_zone: tz }).catch((e) => Alert.alert("Couldn't save", e.message))}
        onClose={() => setPickingZone(false)}
      />
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, styles.inputText]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.disabled}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.coach.bg },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 20 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.coach.border,
    borderRadius: radius.lg,
    padding: 16,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.navy },
  muted: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.coach.muted },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.navy },
  input: {
    height: 46,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  inputText: { fontFamily: fonts.regular, fontSize: 14, color: colors.navy },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontFamily: fonts.regular, fontSize: 12, color: colors.link },
});
