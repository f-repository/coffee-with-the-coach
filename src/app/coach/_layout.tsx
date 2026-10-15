import { Stack } from 'expo-router';
import { CoachProvider } from '../../coach/CoachContext';

export default function CoachLayout() {
  return (
    <CoachProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      </Stack>
    </CoachProvider>
  );
}
