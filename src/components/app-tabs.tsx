import { useAppearance, useColors } from '@/providers/appearance';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import SkintyTabs from './skinty-tabs';

export default function AppTabs() {
  const C = useColors();
  const { preference } = useAppearance();
  const skinty = preference === 'skinty';
  if (skinty) return <SkintyTabs />;
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
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('../../assets/images/journal-icons/account-icon.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
