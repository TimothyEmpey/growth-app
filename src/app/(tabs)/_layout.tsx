import { Stack, usePathname } from 'expo-router';
import AppTabs from '@/components/app-tabs';

export default function TabsLayout() {
  const path = usePathname();
  const title = path === '/running' ? 'Running' : path === '/diet' ? 'Diet' : 'Lifting';
  return (
    <>
      <Stack.Screen options={{ headerShown: process.env.EXPO_OS !== 'web', title }} />
      <AppTabs />
    </>
  );
}
