import { createContext, use, useEffect, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { useJournal } from '@/data/journal-store';

export const darkColors = {
  bg: '#101216',
  surface: '#191c22',
  elevated: '#20242d',
  border: '#30353f',
  text: '#f4f6fb',
  muted: '#969fad',
  blue: '#719bff',
  blueDark: '#2b5be7',
  green: '#71d7b1',
  gold: '#e5bb73',
  purple: '#b69bfa',
  red: '#ff9696',
};
export const lightColors: typeof darkColors = {
  bg: '#f5f6fa',
  surface: '#ffffff',
  elevated: '#edf0f6',
  border: '#d9dee8',
  text: '#18202e',
  muted: '#5c687b',
  blue: '#315fcb',
  blueDark: '#2b5be7',
  green: '#18785c',
  gold: '#926315',
  purple: '#7550bb',
  red: '#b73642',
};
const Context = createContext({ colors: darkColors, scheme: 'dark' as 'light' | 'dark' });
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const { journal } = useJournal();
  const preference = journal.preferences.appearance;
  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  useEffect(() => {
    if (process.env.EXPO_OS !== 'web')
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);
  const colors = scheme === 'dark' ? darkColors : lightColors;
  useEffect(() => {
    if (process.env.EXPO_OS === 'web') {
      document.documentElement.style.colorScheme = scheme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.bg);
      document.documentElement.style.setProperty('--growth-bg', colors.bg);
      document.documentElement.style.setProperty('--growth-surface', colors.surface);
      document.documentElement.style.setProperty('--growth-border', colors.border);
    } else {
      void SystemUI.setBackgroundColorAsync(colors.bg);
    }
  }, [colors, scheme]);
  return <Context value={{ colors, scheme }}>{children}</Context>;
}
export const useAppearance = () => use(Context);
export const useColors = () => useAppearance().colors;
