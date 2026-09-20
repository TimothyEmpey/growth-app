import { useAppearance, useColors } from '@/providers/appearance';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDate, parseDate, today } from '@/domain/journal';
import { Icon, Row } from './ui';

export function DateField({
  value,
  onChange,
  label = 'Date',
}: {
  value: string;
  onChange: (date: string) => void;
  label?: string;
}) {
  const C = useColors();
  const { scheme } = useAppearance();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.muted, fontSize: 14 }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value)}`}
        onPress={() => setOpen(!open)}
        style={{
          padding: 14,
          backgroundColor: C.bg,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Row>
          <Icon name="calendar" size={20} />
          <Text style={{ color: C.text, fontSize: 16, flex: 1 }}>{formatDate(value)}</Text>
          <Icon name="right" size={16} />
        </Row>
      </Pressable>
      {open && (
        <DateTimePicker
          value={parseDate(value)}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          mode="date"
          display="inline"
          themeVariant={scheme}
          accentColor={C.blue}
          onChange={(_, date) => {
            if (date) onChange(today(date));
            if (process.env.EXPO_OS !== 'ios') setOpen(false);
          }}
        />
      )}
    </View>
  );
}
