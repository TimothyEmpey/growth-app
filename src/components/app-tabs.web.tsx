import { useAppearance, useColors } from '@/providers/appearance';
import { Image } from 'expo-image';
import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { usePathname } from 'expo-router';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './ui';

function TabButton({
  isFocused,
  icon,
  children,
  compact,
  skinty,
  ...props
}: TabTriggerSlotProps & { icon: IconName; compact: boolean; skinty: boolean }) {
  const C = useColors();
  const iconColor =
    skinty && compact ? (isFocused ? C.blueDark : C.text) : isFocused ? C.blue : C.muted;
  return (
    <Pressable
      {...props}
      style={({ pressed }) => ({
        flexDirection: compact ? 'column' : 'row',
        alignItems: 'center',
        gap: compact ? 5 : 13,
        paddingVertical: compact ? 10 : 15,
        paddingHorizontal: compact ? 6 : 16,
        borderRadius: 12,
        backgroundColor:
          skinty && compact
            ? isFocused
              ? 'rgba(255, 247, 251, 0.94)'
              : 'rgba(255, 232, 244, 0.76)'
            : isFocused
              ? `${C.blue}17`
              : 'transparent',
        opacity: pressed ? 0.65 : 1,
        flex: compact ? 1 : undefined,
        borderWidth: 1,
        borderColor:
          skinty && compact
            ? isFocused
              ? 'rgba(255, 255, 255, 0.96)'
              : 'rgba(255, 255, 255, 0.48)'
            : isFocused
              ? `${C.blue}26`
              : 'transparent',
      })}
    >
      <Icon name={icon} size={21} color={iconColor} />
      <Text
        style={{
          color: skinty && compact ? C.text : isFocused ? C.text : C.muted,
          fontWeight: '600',
          fontSize: compact ? 12 : 15,
        }}
      >
        {children}
      </Text>
      {!compact && isFocused && (
        <View
          style={{
            marginLeft: 'auto',
            height: 5,
            width: 5,
            borderRadius: 5,
            backgroundColor: C.blue,
          }}
        />
      )}
    </Pressable>
  );
}
export default function AppTabs() {
  const C = useColors();
  const { preference } = useAppearance();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const compact = width < 850;
  const skinty = preference === 'skinty';
  const title =
    path === '/account'
      ? 'Account'
      : path === '/running'
        ? 'Running'
        : path === '/diet'
          ? 'Diet'
          : 'Lifting';
  return (
    <Tabs style={{ flex: 1, flexDirection: compact ? 'column' : 'row', backgroundColor: C.bg }}>
      {compact && (
        <View
          style={{
            minHeight: 56 + insets.top,
            paddingTop: insets.top,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: C.bg,
            borderBottomWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.8 }}>
            Growth<Text style={{ color: C.blue }}>.</Text>
          </Text>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>{title}</Text>
        </View>
      )}
      <TabList asChild>
        <View
          nativeID="growth-standalone-tab-bar"
          style={
            compact
              ? {
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor: C.surface,
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  padding: 8,
                  borderTopWidth: 1,
                  borderColor: C.border,
                }
              : {
                  flexDirection: 'column',
                  gap: 8,
                  width: 228,
                  backgroundColor: C.surface,
                  borderRightWidth: 1,
                  borderColor: C.border,
                  padding: 22,
                  paddingTop: 38,
                }
          }
        >
          {compact && skinty && (
            <>
              <Image
                source={require('../../assets/images/cheetah-print.jpg')}
                contentFit="cover"
                style={{ position: 'absolute', inset: 0 }}
              />
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(236, 63, 145, 0.48)',
                }}
              />
            </>
          )}
          {!compact && (
            <>
              <Text
                style={{
                  color: C.text,
                  fontSize: 32,
                  fontWeight: '700',
                  letterSpacing: -1.2,
                  marginLeft: 14,
                  marginBottom: 54,
                }}
              >
                Growth<Text style={{ color: C.blue }}>.</Text>
              </Text>
              <Text
                style={{
                  color: '#6d7787',
                  fontSize: 12,
                  letterSpacing: 1.6,
                  fontWeight: '600',
                  marginBottom: 18,
                  marginLeft: 15,
                }}
              >
                YOUR JOURNAL
              </Text>
            </>
          )}
          <TabTrigger name="lifting" href="/" asChild>
            <TabButton compact={compact} icon="lift" skinty={skinty}>
              Lifting
            </TabButton>
          </TabTrigger>
          <TabTrigger name="running" href="/running" asChild>
            <TabButton compact={compact} icon="run" skinty={skinty}>
              Running
            </TabButton>
          </TabTrigger>
          <TabTrigger name="diet" href="/diet" asChild>
            <TabButton compact={compact} icon="food" skinty={skinty}>
              Diet
            </TabButton>
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabButton compact={compact} icon="account" skinty={skinty}>
              Account
            </TabButton>
          </TabTrigger>
          {!compact && (
            <View style={{ marginTop: 'auto', padding: 14, gap: 9 }}>
              <Text style={{ fontSize: 13, color: C.text }}>A little better, every day.</Text>
              <Text style={{ fontSize: 12, color: C.muted, lineHeight: 19 }}>
                One place for your strength, miles, and nutrition.
              </Text>
            </View>
          )}
        </View>
      </TabList>
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  );
}
