import { DarkTheme, ThemeProvider, Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { C } from '@/components/ui';
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
const modalOptions = {
  headerShown: false,
  presentation:
    process.env.EXPO_OS === 'web' ? ('transparentModal' as const) : ('formSheet' as const),
  sheetAllowedDetents: [0.85, 1],
  sheetGrabberVisible: true,
  contentStyle: { backgroundColor: process.env.EXPO_OS === 'web' ? 'transparent' : C.surface },
  animation: process.env.EXPO_OS === 'web' ? ('none' as const) : undefined,
};
export default function RootLayout() {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider
        value={{
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: C.bg,
            card: C.surface,
            text: C.text,
            primary: C.blue,
            border: C.border,
          },
        }}
      >
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: C.bg },
            headerTintColor: C.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: C.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {['weight', 'lift', 'food', 'goals', 'strava', 'run'].map((name) => (
            <Stack.Screen key={name} name={name} options={modalOptions} />
          ))}
          <Stack.Screen name="auth/strava" options={{ title: 'Connecting Strava' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
