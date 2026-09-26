import { useAppearance, useColors } from '@/providers/appearance';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function AppTabs() {
  const C = useColors();
  const { preference, scheme } = useAppearance();
  return (
    <NativeTabs
      key={`${preference}-${scheme}`}
      backgroundColor={`${C.surface}E6`}
      blurEffect={scheme === 'dark' ? 'systemMaterialDark' : 'systemMaterialLight'}
      disableTransparentOnScrollEdge
      tintColor={C.blue}
      iconColor={{ default: C.muted, selected: C.blue }}
      labelStyle={{ color: C.muted, selected: { color: C.blue } }}
      shadowColor={C.border}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Lifting</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dumbbell.fill" md="fitness_center" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="running">
        <NativeTabs.Trigger.Label>Running</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.run" md="directions_run" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="diet">
        <NativeTabs.Trigger.Label>Diet</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
