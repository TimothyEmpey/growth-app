import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
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
  const [draft, setDraft] = useState(value);
  const openPicker = () => {
    setDraft(value);
    setOpen(true);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Reminder time: ${formatReminderTime({ hour, minute })}`}
        disabled={disabled}
        onPress={openPicker}
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
      <Modal
        transparent
        animationType="fade"
        visible={open && !disabled}
        onRequestClose={() => setOpen(false)}
      >
        <View
          accessibilityViewIsModal
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backgroundColor: 'rgba(0,0,0,0.58)',
          }}
        >
          <Pressable
            accessibilityLabel="Close time picker"
            onPress={() => setOpen(false)}
            style={{ position: 'absolute', inset: 0 }}
          />
          <View
            style={{
              width: '100%',
              maxWidth: 360,
              padding: 18,
              gap: 14,
              borderRadius: 22,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: C.surface,
            }}
          >
            <Text style={{ color: C.text, fontSize: 19, fontWeight: '600' }}>Reminder time</Text>
            <DateTimePicker
              value={draft}
              mode="time"
              display="spinner"
              themeVariant={scheme}
              accentColor={C.blue}
              style={{ alignSelf: 'center', width: 310, height: 190 }}
              onChange={(_, date) => {
                if (date) setDraft(date);
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setOpen(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 11 }}
              >
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onChange(draft.getHours(), draft.getMinutes());
                  setOpen(false);
                }}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  borderRadius: 11,
                  backgroundColor: C.blueDark,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
