import { Redirect, router } from 'expo-router';
import { ArrowRight, Check, ChevronDown, LockKeyhole } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBooking, SlotTakenError, TOPICS } from '../api';
import { useBooking } from '../booking/BookingContext';
import { BrandMark } from '../components/Brand';
import { AppointmentCard, Button, OptionSheet, Progress, TopBar, styles as ui } from '../components/ui';
import { colors, fonts, radius } from '../theme';

const NOTES_MAX = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Details() {
  const { coach, slot, setSlot, timeZone, details, setDetails, setBooking, durationMinutes } = useBooking();
  const [name, setName] = useState(details?.name ?? '');
  const [email, setEmail] = useState(details?.email ?? '');
  const [phone, setPhone] = useState(details?.phone ?? '');
  const [topic, setTopic] = useState(details?.topic ?? TOPICS[0]);
  const [notes, setNotes] = useState(details?.notes ?? '');
  const [consent, setConsent] = useState(false);
  const [pickingTopic, setPickingTopic] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!coach) return <Redirect href="/" />;
  if (!slot) return <Redirect href="/time" />;

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = name.trim().length > 0 && emailValid && consent;

  async function submit() {
    if (!slot || !coach) return;
    const d = { name: name.trim(), email: email.trim(), phone: phone.trim(), topic, notes: notes.trim() };
    setSubmitting(true);
    try {
      const booking = await createBooking({ coachId: coach.id, durationMinutes, slot, timeZone, ...d });
      setDetails(d);
      setBooking(booking);
      router.replace('/confirmed');
    } catch (e) {
      if (e instanceof SlotTakenError) {
        Alert.alert('That time was just taken', 'Someone booked it a moment ago. Please choose another time.');
        setSlot(null);
        router.back();
      } else {
        Alert.alert('Booking failed', "We couldn't complete your booking. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <TopBar onBack={() => router.back()} center={<BrandMark size={40} radius={6} />} right={{ label: 'Help', bold: true, onPress: showHelp }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Progress step={2} label="MAKE IT YOURS" />

          <View style={{ gap: 8 }}>
            <Text style={ui.title}>What's on your mind?</Text>
            <Text style={ui.body}>A few details to make our time feel like yours.</Text>
          </View>

          <AppointmentCard coachFirstName={coach.firstName} slot={slot} timeZone={timeZone} />

          <View style={{ gap: 14 }}>
            <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setEmailTouched(true)}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailTouched && email.length > 0 && !emailValid ? 'Please enter a valid email address.' : undefined}
            />
            <Field
              label="Phone number"
              optional
              value={phone}
              onChangeText={setPhone}
              autoComplete="tel"
              textContentType="telephoneNumber"
              keyboardType="phone-pad"
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.label}>What would you like to talk about?</Text>
            <Pressable style={[styles.input, styles.select]} onPress={() => setPickingTopic(true)} accessibilityRole="button">
              <Text style={styles.inputText}>{topic}</Text>
              <ChevronDown size={17} color={colors.navy} strokeWidth={2} />
            </Pressable>
            <View style={styles.notes}>
              <TextInput
                style={[styles.inputText, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                maxLength={NOTES_MAX}
                multiline
                placeholder={`Anything you'd like ${coach.firstName} to know ahead of time?`}
                placeholderTextColor={colors.disabled}
              />
              <Text style={styles.counter}>{`${notes.length} / ${NOTES_MAX}`}</Text>
            </View>
          </View>

          <Pressable
            style={styles.consent}
            onPress={() => setConsent((c) => !c)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
          >
            <View style={[styles.checkbox, consent && styles.checkboxOn]}>
              {consent && <Check size={14} color={colors.white} strokeWidth={2.5} />}
            </View>
            <Text style={styles.consentText}>
              {`I agree to share my contact details and topic with ${coach.firstName} and save them to ${coach.firstName}'s Google Calendar event. View Privacy Policy.`}
            </Text>
          </Pressable>

          <Button label="Book my coffee" icon={ArrowRight} disabled={!canSubmit} loading={submitting} onPress={submit} />

          <View style={styles.privacy}>
            <LockKeyhole size={13} color={colors.muted} strokeWidth={1.75} />
            <Text style={styles.privacyText}>Used only for your session. Never for marketing.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={pickingTopic}
        title="What would you like to talk about?"
        options={TOPICS}
        selected={topic}
        onSelect={setTopic}
        onClose={() => setPickingTopic(false)}
      />
    </SafeAreaView>
  );
}

function showHelp() {
  Alert.alert('Need a hand?', 'Your name and email are needed to send the calendar invite. Phone is optional.');
}

function Field({ label, optional, error, ...input }: TextInputProps & { label: string; optional?: boolean; error?: string }) {
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'baseline' }}>
        <Text style={styles.label}>{label}</Text>
        {optional && <Text style={styles.optional}>optional</Text>}
      </View>
      <TextInput
        style={[styles.input, styles.inputText, error && { borderColor: colors.error }]}
        placeholderTextColor={colors.disabled}
        accessibilityLabel={label}
        {...input}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.details },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 20 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.navy },
  optional: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
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
  notes: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    gap: 10,
  },
  notesInput: { fontSize: 13, lineHeight: 19.5, minHeight: 40, padding: 0, textAlignVertical: 'top' },
  counter: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, textAlign: 'right' },
  error: { fontFamily: fonts.regular, fontSize: 11, color: colors.error },
  consent: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.blue },
  consentText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16.5, color: colors.muted },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  privacyText: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
});
