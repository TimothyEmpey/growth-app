import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatReminderTime } from '@/domain/reminders';
import { useAppearance, useColors } from '@/providers/appearance';

export function TimeField({
  hour,
  minute,
  onChange,
  disabled,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  disabled?: boolean;
}) {
  const C = useColors();
  const { scheme } = useAppearance();
  const [open, setOpen] = useState(false);
  const value = new Date(2000, 0, 1, hour, minute);
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Reminder time: ${formatReminderTime({ hour, minute })}`}
        disabled={disabled}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => ({
          minHeight: 42,
          minWidth: 88,
          paddingHorizontal: 12,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: C.border,
          backgroundColor: C.elevated,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
        })}
      >
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
          {formatReminderTime({ hour, minute })}
        </Text>
      </Pressable>
      {open && !disabled && (
        <DateTimePicker
          value={value}
          mode="time"
          display="spinner"
          themeVariant={scheme}
          accentColor={C.blue}
          onChange={(_, date) => {
            if (date) onChange(date.getHours(), date.getMinutes());
            if (process.env.EXPO_OS !== 'ios') setOpen(false);
          }}
        />
      )}
    </View>
  );
}
