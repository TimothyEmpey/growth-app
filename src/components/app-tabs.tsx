import { useAppearance, useColors } from '@/providers/appearance';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './ui';
import SkintyTabs from './skinty-tabs';

function TabButton({
  isFocused,
  icon,
  children,
  ...props
}: TabTriggerSlotProps & { icon: IconName }) {
  const C = useColors();
  return (
    <Pressable
      {...props}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: 5,
        paddingVertical: 9,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: isFocused ? `${C.blue}17` : 'transparent',
        borderWidth: 1,
        borderColor: isFocused ? `${C.blue}26` : 'transparent',
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Icon name={icon} size={21} color={isFocused ? C.blue : C.muted} />
      <Text style={{ color: isFocused ? C.text : C.muted, fontWeight: '600', fontSize: 12 }}>
        {children}
      </Text>
    </Pressable>
  );
}

export default function AppTabs() {
  const C = useColors();
  const { preference } = useAppearance();
  const insets = useSafeAreaInsets();
  const skinty = preference === 'skinty';
  if (skinty) return <SkintyTabs />;
  return (
    <Tabs style={{ flex: 1, backgroundColor: C.bg }}>
      <TabList asChild>
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            paddingTop: 8,
            paddingHorizontal: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            backgroundColor: C.surface,
            borderTopWidth: 1,
            borderColor: C.border,
          }}
        >
          <TabTrigger name="lifting" href="/" asChild>
            <TabButton icon="lift">Lifting</TabButton>
          </TabTrigger>
          <TabTrigger name="running" href="/running" asChild>
            <TabButton icon="run">Running</TabButton>
          </TabTrigger>
          <TabTrigger name="diet" href="/diet" asChild>
            <TabButton icon="food">Diet</TabButton>
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabButton icon="account">Account</TabButton>
          </TabTrigger>
        </View>
      </TabList>
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  );
}
