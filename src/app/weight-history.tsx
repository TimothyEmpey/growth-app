import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { usePreferences } from '@/hooks/use-preferences';
import { displayWeight } from '@/domain/account';
import { formatDate } from '@/domain/journal';
import { useJournal, updateJournal } from '@/data/journal-store';
import { Body, Icon, Row, Sheet } from '@/components/ui';
import { useColors } from '@/providers/appearance';
import { SwipeToDelete } from '@/components/gestures';

export default function WeightHistorySheet() {
  const C = useColors();
  const { units } = usePreferences();
  const { journal } = useJournal();
  const unit = units === 'metric' ? 'kg' : 'lb';
  const entries = [...journal.weights].reverse();

  return (
    <Sheet title="Weight history" subtitle="Every weigh-in, newest date first.">
      {entries.length === 0 ? (
        <Body>Your weigh-ins will appear here after you log your first weight.</Body>
      ) : (
        <View>
          {entries.map((entry) => (
            <SwipeToDelete
              key={entry.id}
              accessibilityLabel={`Swipe left to delete weight ${displayWeight(entry.pounds, units)} ${unit}`}
              onDelete={() => {
                void updateJournal((journal) => {
                  journal.weights = journal.weights.filter((weight) => weight.id !== entry.id);
                });
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit weight ${displayWeight(entry.pounds, units)} ${unit} on ${entry.date}`}
                onPress={() => router.replace({ pathname: '/weight', params: { id: entry.id } })}
                style={({ pressed }) => ({
                  minHeight: 68,
                  paddingVertical: 15,
                  opacity: pressed ? 0.65 : 1,
                  borderBottomWidth: 1,
                  borderColor: C.border,
                })}
              >
                <Row>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 18,
                        fontWeight: '600',
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {displayWeight(entry.pounds, units)} {unit}
                    </Text>
                    <Body>{formatDate(entry.date)}</Body>
                  </View>
                  <Icon name="right" size={18} />
                </Row>
              </Pressable>
            </SwipeToDelete>
          ))}
        </View>
      )}
    </Sheet>
  );
}
