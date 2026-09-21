import { createContext, use, useEffect, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { useJournal } from '@/data/journal-store';
import type { Appearance as AppearancePreference } from '@/domain/account';

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
export const coffeeColors: typeof darkColors = {
  bg: '#f7f1e8',
  surface: '#fffaf3',
  elevated: '#eee2d3',
  border: '#d8c5b0',
  text: '#38271f',
  muted: '#746157',
  blue: '#8a4f2b',
  blueDark: '#6f3e22',
  green: '#4f7454',
  gold: '#8b641e',
  purple: '#76527e',
  red: '#a43f3f',
};
export const aquaColors: typeof darkColors = {
  bg: '#eef9f8',
  surface: '#fbffff',
  elevated: '#dcefed',
  border: '#bddbd8',
  text: '#14383a',
  muted: '#547174',
  blue: '#087780',
  blueDark: '#075f68',
  green: '#26715d',
  gold: '#88651d',
  purple: '#66549a',
  red: '#a43b4b',
};
export const forestColors: typeof darkColors = {
  bg: '#f1f5ee',
  surface: '#fbfdf9',
  elevated: '#e0e9dc',
  border: '#c4d2bd',
  text: '#203525',
  muted: '#5d705f',
  blue: '#326d45',
  blueDark: '#285838',
  green: '#3e7650',
  gold: '#82651d',
  purple: '#6f557f',
  red: '#a23e42',
};

const customColors: Partial<Record<AppearancePreference, typeof darkColors>> = {
  coffee: coffeeColors,
  aqua: aquaColors,
  forest: forestColors,
};

const Context = createContext({ colors: darkColors, scheme: 'dark' as 'light' | 'dark' });
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const { journal } = useJournal();
  const preference = journal.preferences.appearance;
  const scheme =
    preference === 'system'
      ? system === 'dark'
        ? 'dark'
        : 'light'
      : preference === 'dark'
        ? 'dark'
        : 'light';
  useEffect(() => {
    if (process.env.EXPO_OS !== 'web')
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : scheme);
  }, [preference, scheme]);
  const colors = customColors[preference] ?? (scheme === 'dark' ? darkColors : lightColors);
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
