import { Pressable, Text, View } from 'react-native';
import { Body, Icon, Row, type IconName } from './ui';
import { useColors } from '@/providers/appearance';
export function SettingsRow({
  title,
  detail,
  icon,
  onPress,
}: {
  title: string;
  detail: string;
  icon: IconName;
  onPress: () => void;
}) {
  const C = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 86,
        paddingVertical: 19,
        gap: 12,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Row>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: C.elevated,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Icon name={icon} color={C.blue} />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: C.text, fontWeight: '600', fontSize: 17 }}>{title}</Text>
          <Body>{detail}</Body>
        </View>
        <Icon name="right" size={18} />
      </Row>
    </Pressable>
  );
}
export function Choice<T extends string>({
  value,
  selected,
  title,
  detail,
  onSelect,
  disabled,
}: {
  value: T;
  selected: T;
  title: string;
  detail?: string;
  onSelect: (value: T) => void;
  disabled?: boolean;
}) {
  const C = useColors();
  const active = selected === value;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active, disabled }}
      disabled={disabled}
      onPress={() => onSelect(value)}
      style={({ pressed }) => ({
        padding: 17,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: active ? C.blue : C.border,
        backgroundColor: active ? `${C.blue}12` : C.bg,
        opacity: pressed || disabled ? 0.65 : 1,
      })}
    >
      <Row>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{title}</Text>
          {detail && <Body>{detail}</Body>}
        </View>
        <View
          style={{
            width: 23,
            height: 23,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: active ? C.blue : C.muted,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? C.blue : 'transparent',
          }}
        >
          {active && <Icon name="check" size={16} color={C.surface} />}
        </View>
      </Row>
    </Pressable>
  );
}
