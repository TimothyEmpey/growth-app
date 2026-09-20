import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { C, Icon, type IconName } from './ui';

function TabButton({
  isFocused,
  icon,
  children,
  compact,
  ...props
}: TabTriggerSlotProps & { icon: IconName; compact: boolean }) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => ({
        flexDirection: compact ? 'column' : 'row',
        alignItems: 'center',
        gap: compact ? 5 : 13,
        paddingVertical: compact ? 10 : 15,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: isFocused ? '#719bff17' : 'transparent',
        opacity: pressed ? 0.65 : 1,
        flex: compact ? 1 : undefined,
        borderWidth: 1,
        borderColor: isFocused ? '#719bff26' : 'transparent',
      })}
    >
      <Icon name={icon} size={21} color={isFocused ? C.blue : C.muted} />
      <Text
        style={{
          color: isFocused ? C.text : C.muted,
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
  const { width } = useWindowDimensions();
  const compact = width < 850;
  return (
    <Tabs style={{ flex: 1, flexDirection: compact ? 'column' : 'row', backgroundColor: C.bg }}>
      <TabList asChild>
        <View
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
                  backgroundColor: '#14171c',
                  borderRightWidth: 1,
                  borderColor: C.border,
                  padding: 22,
                  paddingTop: 38,
                }
          }
        >
          {!compact && (
            <>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 48 }}
              >
                <View
                  style={{
                    height: 35,
                    width: 35,
                    borderRadius: 10,
                    backgroundColor: C.blueDark,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="chart" color="#fff" size={22} />
                </View>
                <Text style={{ color: C.text, fontSize: 25, fontWeight: '700', letterSpacing: -1 }}>
                  Growth<Text style={{ color: C.blue }}>.</Text>
                </Text>
              </View>
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
            <TabButton compact={compact} icon="lift">
              Lifting
            </TabButton>
          </TabTrigger>
          <TabTrigger name="running" href="/running" asChild>
            <TabButton compact={compact} icon="run">
              Running
            </TabButton>
          </TabTrigger>
          <TabTrigger name="diet" href="/diet" asChild>
            <TabButton compact={compact} icon="food">
              Diet
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
