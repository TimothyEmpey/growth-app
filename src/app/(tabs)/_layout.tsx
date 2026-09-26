import { Stack, usePathname } from 'expo-router';
import AppTabs from '@/components/app-tabs';
import { useColors } from '@/providers/appearance';
import { Text } from 'react-native';

export default function TabsLayout() {
  const C = useColors();
  const path = usePathname();
  const title =
    path === '/account'
      ? 'Account'
      : path === '/running'
        ? 'Running'
        : path === '/diet'
          ? 'Diet'
          : 'Lifting';
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: process.env.EXPO_OS !== 'web',
          headerTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: C.bg },
          headerLeft: () => (
            <Text style={{ color: C.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.8 }}>
              Growth<Text style={{ color: C.blue }}>.</Text>
            </Text>
          ),
          headerRight: () => (
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>{title}</Text>
          ),
        }}
      />
      <AppTabs />
    </>
  );
}
