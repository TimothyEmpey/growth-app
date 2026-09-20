import type { ReactNode } from 'react';
import { useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Nutrition, Period } from '@/domain/types';
import { useJournal } from '@/data/journal-store';
import { Dialog } from './dialog';

export const C = {
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
export type IconName =
  | 'lift'
  | 'run'
  | 'food'
  | 'plus'
  | 'arrow'
  | 'left'
  | 'right'
  | 'close'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'settings'
  | 'search'
  | 'link'
  | 'lock'
  | 'trash';

const journalIconSources = {
  lift: require('../../assets/images/journal-icons/lifting-icon.png'),
  run: require('../../assets/images/journal-icons/running-icon.png'),
  food: require('../../assets/images/journal-icons/diet-icon.png'),
  link: require('../../assets/images/journal-icons/link-icon.png'),
} as const;

export function Icon({
  name,
  size = 22,
  color = C.muted,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  if (name === 'lift' || name === 'run' || name === 'food' || name === 'link') {
    return (
      <Image
        source={journalIconSources[name]}
        style={{ width: size, height: size }}
        contentFit="contain"
        tintColor={color}
      />
    );
  }

  const paths: Record<Exclude<IconName, 'lift' | 'run' | 'food' | 'link'>, string> = {
    plus: 'M12 5v14M5 12h14',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    left: 'm14 6-6 6 6 6',
    right: 'm9 6 6 6-6 6',
    close: 'm6 6 12 12M6 18 18 6',
    calendar: 'M8 2v4M16 2v4M3 10h18M8 14h2m4 0h2m-8 4h2',
    chart: 'M3 3v18h18M6 15l4-5 4 3 6-8',
    check: 'm5 12 4 4L19 6',
    settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
    search: 'm16 16 5 5',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3M12 14v3',
    trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={paths[name]} />
      {name === 'search' && <Circle cx={10.5} cy={10.5} r={6.5} />}
      {name === 'calendar' && <Rect x={3} y={4} width={18} height={18} rx={3} />}
      {name === 'lock' && <Rect x={5} y={10} width={14} height={11} rx={2} />}
    </Svg>
  );
}
export function Label({ children, color = C.muted }: { children: ReactNode; color?: string }) {
  return (
    <Text
      style={{
        color,
        fontSize: 12,
        letterSpacing: 1.5,
        fontWeight: '600',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  );
}
export function Body({ children, color = C.muted }: { children: ReactNode; color?: string }) {
  return (
    <Text selectable style={{ color, fontSize: 14, lineHeight: 22 }}>
      {children}
    </Text>
  );
}
export function Title({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <Text
      selectable
      style={{ color: C.text, fontSize: size, fontWeight: '600', letterSpacing: -0.6 }}
    >
      {children}
    </Text>
  );
}
export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>{children}</View>
  );
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 20,
          borderCurve: 'continuous',
          padding: 22,
          gap: 20,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  children,
  onPress,
  icon,
  quiet = false,
  danger = false,
  disabled = false,
  loading = false,
  label,
}: {
  children?: ReactNode;
  onPress: () => void;
  icon?: IconName;
  quiet?: boolean;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}) {
  const color = danger ? C.red : quiet ? C.text : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? (typeof children === 'string' ? children : undefined)}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: children ? 16 : 11,
        borderRadius: 12,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: quiet ? C.elevated : C.blueDark,
        borderWidth: quiet ? 1 : 0,
        borderColor: C.border,
        opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : icon ? (
        <Icon name={icon} color={color} size={18} />
      ) : null}
      {children && <Text style={{ color, fontWeight: '600', fontSize: 14 }}>{children}</Text>}
    </Pressable>
  );
}
export function PeriodControl({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}) {
  return (
    <Row
      style={{
        backgroundColor: C.bg,
        padding: 4,
        borderRadius: 12,
        gap: 2,
        alignSelf: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      {(['Week', 'Month', 'Year', 'All'] as Period[]).map((period) => (
        <Pressable
          key={period}
          accessibilityRole="button"
          accessibilityState={{ selected: period === value }}
          onPress={() => onChange(period)}
          style={{
            paddingHorizontal: 15,
            minHeight: 38,
            justifyContent: 'center',
            backgroundColor: period === value ? C.elevated : 'transparent',
            borderRadius: 9,
          }}
        >
          <Text
            style={{ fontSize: 13, fontWeight: '600', color: period === value ? C.text : C.muted }}
          >
            {period}
          </Text>
        </Pressable>
      ))}
    </Row>
  );
}
export function Page({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ready, error } = useJournal();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{
        padding: process.env.EXPO_OS === 'web' && width >= 600 ? 28 : 20,
        paddingBottom: 110 + insets.bottom,
        gap: 26,
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
      }}
    >
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <View style={{ gap: 9 }}>
          <Label>{eyebrow}</Label>
          {process.env.EXPO_OS === 'web' && <Title size={34}>{title}</Title>}
        </View>
        {action}
      </Row>
      {error ? (
        <Notice message={error} />
      ) : !ready ? (
        <ActivityIndicator color={C.blue} />
      ) : (
        children
      )}
      <Row style={{ justifyContent: 'center' }}>
        <Icon name="lock" size={13} />
        <Text style={{ color: C.muted, fontSize: 12 }}>Your journal. On your device.</Text>
      </Row>
    </ScrollView>
  );
}
export function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12, gap: 12 }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 15,
          backgroundColor: '#719bff12',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <Icon name={icon} color={C.blue} />
      </View>
      <Title size={18}>{title}</Title>
      <View style={{ maxWidth: 320, alignItems: 'center' }}>
        <Text style={{ color: C.muted, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>
          {children}
        </Text>
      </View>
      {action}
    </View>
  );
}
export function Notice({ message }: { message: string }) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#ff969610',
        borderWidth: 1,
        borderColor: '#ff969640',
      }}
    >
      <Body color={C.red}>{message}</Body>
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.muted, fontSize: 14 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#616a79"
        selectionColor={C.blue}
        {...props}
        style={[
          {
            backgroundColor: C.bg,
            color: C.text,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 12,
            padding: 14,
            fontSize: 16,
            minHeight: 50,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function dismissSheet(fallback: '/' | '/diet' | '/running' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
export function Sheet({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const fallback =
    pathname === '/food' || pathname === '/goals'
      ? '/diet'
      : pathname === '/run' || pathname === '/strava'
        ? '/running'
        : '/';
  return (
    <Dialog title={title} onDismiss={() => dismissSheet(fallback)}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        style={{ flex: 1, backgroundColor: C.surface }}
        contentContainerStyle={{
          width: '100%',
          maxWidth: 620,
          alignSelf: 'center',
          padding: 24,
          paddingBottom: 60,
          gap: 24,
        }}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Title size={26}>{title}</Title>
            {subtitle && <Body>{subtitle}</Body>}
          </View>
          <Button quiet icon="close" label="Close dialog" onPress={() => dismissSheet(fallback)} />
        </Row>
        {children}
      </ScrollView>
    </Dialog>
  );
}
// Mount forms after hydration so their initial fields reflect persisted entries on direct links.
export function JournalReady({ children }: { children: ReactNode }) {
  const { ready, error } = useJournal();
  if (!ready)
    return (
      <Sheet title="Opening your journal">
        {error ? <Notice message={error} /> : <ActivityIndicator color={C.blue} />}
      </Sheet>
    );
  return children;
}
export function NutritionStrip({ nutrition }: { nutrition: Nutrition }) {
  return (
    <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}>
      {(['calories', 'protein', 'carbs', 'fat'] as const).map((key) => (
        <View key={key} style={{ gap: 6 }}>
          <Label>{key === 'calories' ? 'Calories' : key}</Label>
          <Text
            selectable
            style={{
              color:
                key === 'calories'
                  ? C.text
                  : key === 'protein'
                    ? C.blue
                    : key === 'carbs'
                      ? C.gold
                      : C.purple,
              fontSize: 21,
              fontWeight: '600',
              fontVariant: ['tabular-nums'],
            }}
          >
            {nutrition[key] === null
              ? '—'
              : key === 'calories'
                ? Math.round(nutrition[key]!)
                : Number(nutrition[key]!.toFixed(1))}
            <Text style={{ fontSize: 12, color: C.muted }}>
              {' '}
              {key === 'calories' ? 'kcal' : 'g'}
            </Text>
          </Text>
        </View>
      ))}
    </Row>
  );
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}
