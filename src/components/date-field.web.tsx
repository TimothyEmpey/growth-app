import { useColors } from '@/providers/appearance';
import { createElement } from 'react';
import { Text, View } from 'react-native';
import { today } from '@/domain/journal';

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
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.muted, fontSize: 14 }}>{label}</Text>
      {createElement('input', {
        type: 'date',
        'aria-label': label,
        value,
        min: '1900-01-01',
        max: today(),
        onChange: (event: { target: { value: string } }) => {
          if (event.target.value) onChange(event.target.value);
        },
        style: {
          colorScheme: 'inherit',
          color: C.text,
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 14,
          fontSize: 16,
          fontFamily: 'inherit',
          minHeight: 22,
          width: '100%',
          boxSizing: 'border-box',
        },
      })}
    </View>
  );
}
