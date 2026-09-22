import { useEffect, useRef } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
  router,
  usePathname,
  useRootNavigationState,
} from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppearanceProvider, useAppearance } from '@/providers/appearance';
import { JournalSyncProvider } from '@/providers/journal-sync';
import { useJournal } from '@/data/journal-store';
import { ApiError } from '@/services/api';
import '@/global.css';

export const unstable_settings = { anchor: '(tabs)' };
const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => count < 2 && !(error instanceof ApiError && error.status < 500),
      refetchOnWindowFocus: true,
    },
  },
});
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={client}>
        <AppearanceProvider>
          <JournalSyncProvider>
            <AppNavigation />
          </JournalSyncProvider>
        </AppearanceProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
function AppNavigation() {
  const { colors: C, scheme } = useAppearance();
  const theme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const { ready, journal } = useJournal();
  const path = usePathname();
  const navigation = useRootNavigationState();
  const started = useRef(false);
  useEffect(() => {
    if (!ready || !navigation?.key || started.current) return;
    started.current = true;
    // A saved starting page applies only to a fresh launch at the journal root.
    if (path === '/' && journal.preferences.startPage !== '/')
      router.replace(journal.preferences.startPage);
  }, [ready, navigation?.key, path, journal.preferences.startPage]);
  const modalOptions = {
    headerShown: false,
    presentation:
      process.env.EXPO_OS === 'web' ? ('transparentModal' as const) : ('formSheet' as const),
    sheetAllowedDetents: [0.85, 1],
    sheetGrabberVisible: true,
    gestureEnabled: true,
    contentStyle: { backgroundColor: process.env.EXPO_OS === 'web' ? 'transparent' : C.surface },
    animation: process.env.EXPO_OS === 'web' ? ('none' as const) : undefined,
  };
  return (
    <ThemeProvider
      value={{
        ...theme,
        colors: {
          ...theme.colors,
          background: C.bg,
          card: C.surface,
          text: C.text,
          primary: C.blue,
          border: C.border,
        },
      }}
    >
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {[
          'weight',
          'weight-history',
          'lift',
          'food',
          'goals',
          'strava',
          'run',
          'run-history',
          'account/profile',
          'account/appearance',
          'account/preferences',
          'account/sign-in',
          'account/email',
          'account/password',
        ].map((name) => (
          <Stack.Screen key={name} name={name} options={modalOptions} />
        ))}
        <Stack.Screen name="auth/strava" options={{ title: 'Connecting Strava' }} />
      </Stack>
    </ThemeProvider>
  );
}
