import { Image } from 'expo-image';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/providers/appearance';
import { Icon, type IconName } from './ui';

function SkintyTabButton({
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
        backgroundColor: isFocused ? 'rgba(255, 247, 251, 0.94)' : 'rgba(255, 232, 244, 0.76)',
        borderWidth: 1,
        borderColor: isFocused ? 'rgba(255, 255, 255, 0.96)' : 'rgba(255, 255, 255, 0.48)',
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Icon name={icon} size={21} color={isFocused ? C.blueDark : C.text} />
      <Text style={{ color: C.text, fontWeight: '700', fontSize: 12 }}>{children}</Text>
    </Pressable>
  );
}

export default function SkintyTabs() {
  const C = useColors();
  const insets = useSafeAreaInsets();
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
            borderTopWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.58)',
          }}
        >
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
          <TabTrigger name="lifting" href="/" asChild>
            <SkintyTabButton icon="lift">Lifting</SkintyTabButton>
          </TabTrigger>
          <TabTrigger name="running" href="/running" asChild>
            <SkintyTabButton icon="run">Running</SkintyTabButton>
          </TabTrigger>
          <TabTrigger name="diet" href="/diet" asChild>
            <SkintyTabButton icon="food">Diet</SkintyTabButton>
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <SkintyTabButton icon="account">Account</SkintyTabButton>
          </TabTrigger>
        </View>
      </TabList>
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  );
}
