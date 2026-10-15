import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Lora_400Regular } from '@expo-google-fonts/lora';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BookingProvider } from '../booking/BookingContext';

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Lora_400Regular });
  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <BookingProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="time" />
          <Stack.Screen name="details" />
          <Stack.Screen name="confirmed" options={{ gestureEnabled: false }} />
        </Stack>
      </BookingProvider>
    </SafeAreaProvider>
  );
}
