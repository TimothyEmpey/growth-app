import { useColors } from '@/providers/appearance';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Linking,
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
import { sanitizeNumericInput } from '@/domain/input';
import { useJournal } from '@/data/journal-store';
import { Dialog } from './dialog';
import { MainPageSwipe } from './gestures';

export type IconName =
  | 'account'
  | 'sun'
  | 'flame'
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
  | 'scan'
  | 'check'
  | 'settings'
  | 'search'
  | 'link'
  | 'lock'
  | 'trash';

const journalIconSources = {
  flame: require('../../assets/images/journal-icons/fire-icon.png'),
  account: require('../../assets/images/journal-icons/account-icon.png'),
  lift: require('../../assets/images/journal-icons/lifting-icon.png'),
  run: require('../../assets/images/journal-icons/running-icon.png'),
  food: require('../../assets/images/journal-icons/diet-icon.png'),
  link: require('../../assets/images/journal-icons/link-icon.png'),
} as const;

export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const C = useColors();
  color ??= C.muted;
  if (
    name === 'flame' ||
    name === 'account' ||
    name === 'lift' ||
    name === 'run' ||
    name === 'food' ||
    name === 'link'
  ) {
    return (
      <Image
        source={journalIconSources[name]}
        style={{ width: size, height: size }}
        contentFit="contain"
        tintColor={color}
      />
    );
  }

  const paths: Record<
    Exclude<IconName, 'flame' | 'account' | 'lift' | 'run' | 'food' | 'link' | 'scan'>,
    string
  > = {
    sun: 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
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
      {name === 'scan' ? (
        <>
          <Path d="M8 4H6a2 2 0 0 0-2 2v2M16 4h2a2 2 0 0 1 2 2v2M4 16v2a2 2 0 0 0 2 2h2M20 16v2a2 2 0 0 1-2 2h-2" />
          <Path d="M8 9V7.8A1.8 1.8 0 0 1 9.8 6h4.4A1.8 1.8 0 0 1 16 7.8V9" />
          <Path d="M6 12h12" />
          <Path d="M8 12v3.2a1.8 1.8 0 0 0 1.8 1.8h4.4a1.8 1.8 0 0 0 1.8-1.8V12" />
        </>
      ) : (
        <Path d={paths[name]} />
      )}
      {name === 'search' && <Circle cx={10.5} cy={10.5} r={6.5} />}
      {name === 'calendar' && <Rect x={3} y={4} width={18} height={18} rx={3} />}
      {name === 'lock' && <Rect x={5} y={10} width={14} height={11} rx={2} />}
    </Svg>
  );
}
export function Label({ children, color }: { children: ReactNode; color?: string }) {
  const C = useColors();
  color ??= C.muted;
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
export function Body({ children, color }: { children: ReactNode; color?: string }) {
  const C = useColors();
  color ??= C.muted;
  return <Text style={{ color, fontSize: 14, lineHeight: 22 }}>{children}</Text>;
}
export function FatSecretAttribution() {
  const C = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Powered by fatsecret Platform API"
      onPress={() => void Linking.openURL('https://platform.fatsecret.com')}
      style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={{ color: C.blue, fontSize: 12, textDecorationLine: 'underline' }}>
        Powered by fatsecret Platform API
      </Text>
    </Pressable>
  );
}
export function Title({ children, size = 22 }: { children: ReactNode; size?: number }) {
  const C = useColors();
  return (
    <Text style={{ color: C.text, fontSize: size, fontWeight: '600', letterSpacing: -0.6 }}>
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
  const C = useColors();
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
  const C = useColors();
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
  compact = false,
}: {
  value: Period;
  onChange: (period: Period) => void;
  compact?: boolean;
}) {
  const C = useColors();
  return (
    <Row
      style={{
        backgroundColor: C.bg,
        padding: compact ? 3 : 4,
        borderRadius: compact ? 10 : 12,
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
            paddingHorizontal: compact ? 11 : 15,
            minHeight: compact ? 32 : 38,
            justifyContent: 'center',
            backgroundColor: period === value ? C.elevated : 'transparent',
            borderRadius: compact ? 7 : 9,
          }}
        >
          <Text
            style={{
              fontSize: compact ? 12 : 13,
              fontWeight: '600',
              color: period === value ? C.text : C.muted,
            }}
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
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ready, error } = useJournal();
  return (
    <MainPageSwipe>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{
          padding: process.env.EXPO_OS === 'web' && width >= 600 ? 28 : 20,
          paddingTop: process.env.EXPO_OS === 'web' ? Math.max(20, insets.top) : undefined,
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
          <Text style={{ color: C.muted, fontSize: 12 }}>Your journal. Built around you.</Text>
        </Row>
      </ScrollView>
    </MainPageSwipe>
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
  const C = useColors();
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
  const C = useColors();
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
  const C = useColors();
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
export function NumericField({
  label,
  value,
  onChangeText,
  max,
  decimals = 1,
  ...props
}: Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType' | 'inputMode'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  max: number;
  decimals?: number;
}) {
  const integerDigits = String(Math.floor(max)).length;
  return (
    <Field
      {...props}
      label={label}
      value={value}
      keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      inputMode={decimals ? 'decimal' : 'numeric'}
      maxLength={integerDigits + (decimals ? decimals + 1 : 0)}
      onChangeText={(input) => {
        const next = sanitizeNumericInput(input, max, decimals);
        if (next !== null) onChangeText(next);
      }}
    />
  );
}
export function dismissSheet(fallback: '/' | '/diet' | '/running' | '/account' = '/') {
  if (fallback === '/account') router.dismissTo('/account');
  else if (router.canGoBack()) router.back();
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
  const C = useColors();
  const pathname = usePathname();
  const fallback = pathname.startsWith('/account/')
    ? '/account'
    : pathname === '/privacy' || pathname === '/support'
      ? '/account'
      : pathname === '/food' || pathname === '/goals'
        ? '/diet'
        : pathname === '/run' || pathname === '/run-history' || pathname === '/strava'
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
  const C = useColors();
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
  const C = useColors();
  return (
    <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}>
      {(['calories', 'protein', 'carbs', 'fat'] as const).map((key) => (
        <View key={key} style={{ gap: 6 }}>
          <Label>{key === 'calories' ? 'Calories' : key}</Label>
          <Text
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
            {key === 'calories'
              ? Math.round(nutrition[key] ?? 0)
              : Number((nutrition[key] ?? 0).toFixed(1))}
            <Text style={{ fontSize: 12, color: C.muted }}>
              {' '}
              {key === 'calories' ? 'cal' : 'g'}
            </Text>
          </Text>
        </View>
      ))}
    </Row>
  );
}
export function useAction() {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return { busy, error, run };
}
