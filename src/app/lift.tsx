import { usePreferences } from '@/hooks/use-preferences';
import { displayWeight, weightToPounds } from '@/domain/account';
import { useColors } from '@/providers/appearance';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useJournal, updateJournal } from '@/data/journal-store';
import { formatDate, newId, positive, sortLifts, today, validDate } from '@/domain/journal';
import {
  dismissSheet,
  Body,
  Button,
  Card,
  Field,
  Icon,
  JournalReady,
  Label,
  Notice,
  Row,
  Sheet,
  Title,
  useAction,
} from '@/components/ui';
import { DateField } from '@/components/date-field';

export default function LiftSheet() {
  return (
    <JournalReady>
      <LiftForm />
    </JournalReady>
  );
}
function LiftForm() {
  const { units } = usePreferences();
  const unit = units === 'metric' ? 'kg' : 'lb';
  const C = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { journal } = useJournal();
  const exercise = journal.exercises.find((e) => e.id === id);
  const records = sortLifts(journal.lifts.filter((r) => r.exerciseId === id));
  const [name, setName] = useState(exercise?.name ?? '');
  const [renaming, setRenaming] = useState(!id);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState('');
  const action = useAction();
  return (
    <Sheet
      title={exercise?.name ?? 'Add an exercise'}
      subtitle={
        exercise
          ? 'Your latest max and every milestone before it.'
          : 'Choose a lift you want to track.'
      }
    >
      {renaming ? (
        <View style={{ gap: 16 }}>
          <Field
            label="Exercise name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Incline bench press"
            autoFocus
            maxLength={80}
          />
          <Button
            loading={action.busy}
            onPress={() =>
              void action.run(async () => {
                if (!name.trim()) throw new Error('Enter an exercise name.');
                await updateJournal((j) => {
                  if (
                    j.exercises.some(
                      (e) => e.id !== id && e.name.toLowerCase() === name.trim().toLowerCase(),
                    )
                  )
                    throw new Error('You already track an exercise with this name.');
                  if (id)
                    j.exercises = j.exercises.map((e) =>
                      e.id === id ? { ...e, name: name.trim() } : e,
                    );
                  else j.exercises.push({ id: newId(), name: name.trim() });
                });
                if (id) setRenaming(false);
                else dismissSheet();
              })
            }
          >
            {id ? 'Save name' : 'Add exercise'}
          </Button>
        </View>
      ) : (
        <>
          <Card style={{ backgroundColor: C.bg }}>
            <Label>Current max</Label>
            <Text selectable style={{ color: C.text, fontSize: 44, fontWeight: '600' }}>
              {records[0] ? displayWeight(records[0].pounds, units) : '—'}
              <Text style={{ color: C.muted, fontSize: 18 }}> {unit}</Text>
            </Text>
            <Body>{records[0] ? formatDate(records[0].date) : 'No max logged yet'}</Body>
            <Row>
              <Button
                icon="plus"
                onPress={() => {
                  setAdding(true);
                  setEditing(null);
                  setDate(today());
                  setWeight('');
                }}
              >
                Add max
              </Button>
              <Button quiet onPress={() => setRenaming(true)}>
                Rename
              </Button>
            </Row>
          </Card>
          {adding && (
            <View style={{ gap: 16 }}>
              <Title size={18}>{editing ? 'Edit record' : 'New max'}</Title>
              <Field
                label={`Weight (${unit})`}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <DateField value={date} onChange={setDate} />
              <Button
                loading={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    const source = records.find((record) => record.id === editing);
                    const pounds =
                      source && weight === String(displayWeight(source.pounds, units))
                        ? source.pounds
                        : weightToPounds(positive(weight), units);
                    if (!validDate(date)) throw new Error('Choose a valid date, today or earlier.');
                    await updateJournal((j) => {
                      if (!j.exercises.some((e) => e.id === id))
                        throw new Error('Exercise not found.');
                      const old = j.lifts.find((r) => r.id === editing);
                      j.lifts = j.lifts.filter((r) => r.id !== editing);
                      j.lifts.push({
                        id: editing ?? newId(),
                        exerciseId: id!,
                        pounds,
                        date,
                        createdAt: old?.createdAt ?? Date.now(),
                      });
                    });
                    setAdding(false);
                  })
                }
              >
                Save record
              </Button>
              {editing && (
                <Button
                  quiet
                  danger
                  icon="trash"
                  loading={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      await updateJournal((j) => {
                        j.lifts = j.lifts.filter((r) => r.id !== editing);
                      });
                      setAdding(false);
                    })
                  }
                >
                  Delete record
                </Button>
              )}
            </View>
          )}
          <View style={{ gap: 14 }}>
            <Title size={18}>History</Title>
            {records.length === 0 ? (
              <Body>Your lifting milestones will appear here.</Body>
            ) : (
              records.map((record, index) => (
                <Pressable
                  key={record.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${displayWeight(record.pounds, units)} ${unit} on ${record.date}`}
                  onPress={() => {
                    setEditing(record.id);
                    setAdding(true);
                    setWeight(String(displayWeight(record.pounds, units)));
                    setDate(record.date);
                  }}
                  style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: C.border }}
                >
                  <Row>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={{ color: C.text, fontSize: 18, fontWeight: '600' }}>
                        {displayWeight(record.pounds, units)} {unit}{' '}
                        <Text style={{ fontSize: 12, color: C.blue }}>
                          {index === 0 ? 'CURRENT' : ''}
                        </Text>
                      </Text>
                      <Body>{formatDate(record.date)}</Body>
                    </View>
                    <Icon name="right" size={18} />
                  </Row>
                </Pressable>
              ))
            )}
          </View>
        </>
      )}
      {action.error && <Notice message={action.error} />}
    </Sheet>
  );
}
