import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { C } from './ui';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={C.surface}
      tintColor={C.blue}
      labelStyle={{ color: C.muted, selected: { color: C.blue } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Lifting</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dumbbell" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="running">
        <NativeTabs.Trigger.Label>Running</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.run" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="diet">
        <NativeTabs.Trigger.Label>Diet</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
