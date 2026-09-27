import { Stack, usePathname } from 'expo-router';
import AppTabs from '@/components/app-tabs';
import { useColors } from '@/providers/appearance';
import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

function tabTitle(path: string) {
  if (path === '/account') return 'Account';
  if (path === '/running') return 'Running';
  if (path === '/diet') return 'Diet';
  if (path === '/') return 'Lifting';
  return null;
}

export default function TabsLayout() {
  const C = useColors();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const currentTitle = tabTitle(path);
  const [observedPath, setObservedPath] = useState(path);
  const [lastTabTitle, setLastTabTitle] = useState(currentTitle ?? 'Lifting');
  if (path !== observedPath) {
    setObservedPath(path);
    if (currentTitle) setLastTabTitle(currentTitle);
  }
  const title = currentTitle ?? lastTabTitle;
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: process.env.EXPO_OS !== 'web',
          // A single title view stays plain on iOS and avoids button-style glass around labels.
          headerTitle: () => (
            <View
              style={{
                width: Math.max(240, width - 32),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: C.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.8 }}>
                Growth<Text style={{ color: C.blue }}>.</Text>
              </Text>
              <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>{title}</Text>
            </View>
          ),
          headerShadowVisible: false,
          headerStyle: { backgroundColor: C.bg },
        }}
      />
      <AppTabs />
    </>
  );
}
