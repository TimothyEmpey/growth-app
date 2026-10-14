import { createElement } from 'react';
import { View } from 'react-native';
import { useColors } from '@/providers/appearance';

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
  const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return (
    <View>
      {createElement('input', {
        type: 'time',
        'aria-label': 'Reminder time',
        value,
        disabled,
        onChange: (event: { target: { value: string } }) => {
          const [nextHour, nextMinute] = event.target.value.split(':').map(Number);
          if (Number.isInteger(nextHour) && Number.isInteger(nextMinute))
            onChange(nextHour, nextMinute);
        },
        style: {
          colorScheme: 'inherit',
          color: C.text,
          background: C.elevated,
          border: `1px solid ${C.border}`,
          borderRadius: 11,
          padding: '10px 12px',
          fontSize: 15,
          fontFamily: 'var(--font-display)',
          opacity: disabled ? 0.45 : 1,
        },
      })}
    </View>
  );
}
