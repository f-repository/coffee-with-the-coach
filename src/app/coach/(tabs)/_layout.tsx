import { Redirect, Tabs } from 'expo-router';
import { CalendarDays, SlidersHorizontal, UserRound } from 'lucide-react-native';
import { useCoach } from '../../../coach/CoachContext';
import { colors, fonts } from '../../../theme';

export default function CoachTabs() {
  const { session, profile, loading } = useCoach();
  if (!loading && (!session || !profile)) return <Redirect href="/coach" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.coach.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.coach.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: ({ color }) => <CalendarDays size={20} color={color} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          title: 'Availability',
          tabBarIcon: ({ color }) => <SlidersHorizontal size={20} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <UserRound size={20} color={color} strokeWidth={1.75} /> }}
      />
    </Tabs>
  );
}
