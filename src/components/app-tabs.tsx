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
        <NativeTabs.Trigger.Icon
          src={require('../../assets/images/journal-icons/lifting-icon.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="running">
        <NativeTabs.Trigger.Label>Running</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('../../assets/images/journal-icons/running-icon.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="diet">
        <NativeTabs.Trigger.Label>Diet</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('../../assets/images/journal-icons/diet-icon.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
