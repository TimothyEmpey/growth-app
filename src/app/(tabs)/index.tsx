import { usePreferences, useDefaultPeriod } from '@/hooks/use-preferences';
import { displayWeight } from '@/domain/account';
import { useColors } from '@/providers/appearance';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useJournal } from '@/data/journal-store';
import { formatDate, periodStart, sortLifts, today } from '@/domain/journal';
import { Body, Button, Card, Icon, Label, Page, PeriodControl, Row, Title } from '@/components/ui';
import { WeightChart } from '@/components/weight-chart';

export default function LiftingPage() {
  const C = useColors();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const { journal } = useJournal();
  const [period, setPeriod] = useDefaultPeriod();
  const { units } = usePreferences();
  const weightUnit = units === 'metric' ? 'kg' : 'lb';
  // The chart and change use the selected period; the headline weight uses the full history.
  const entries = journal.weights.filter((w) => w.date >= periodStart(period) && w.date <= today());
  const latest = journal.weights.at(-1);
  const change = entries.length > 1 ? entries.at(-1)!.pounds - entries[0].pounds : null;
  return (
    <Page
      title="Lifting"
      eyebrow="Build your strength"
      action={
        <Button icon="plus" onPress={() => router.push('/weight')}>
          Log weight
        </Button>
      }
    >
      <Card style={compact ? { padding: 16, gap: 12 } : undefined}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Row>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: '#719bff15',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="chart" color={C.blue} size={18} />
            </View>
            <Title size={18}>Body weight</Title>
          </Row>
          <PeriodControl compact value={period} onChange={setPeriod} />
        </Row>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <View style={{ gap: compact ? 4 : 7 }}>
            <Text
              selectable
              style={{
                color: C.text,
                fontSize: compact ? 40 : 48,
                fontWeight: '600',
                letterSpacing: -2,
                fontVariant: ['tabular-nums'],
              }}
            >
              {latest ? displayWeight(latest.pounds, units) : '—'}
              <Text style={{ color: C.muted, fontSize: compact ? 16 : 18, letterSpacing: 0 }}>
                {' '}
                {weightUnit}
              </Text>
            </Text>
            <Body>
              {latest
                ? `Last recorded ${formatDate(latest.date, { month: 'short', day: 'numeric' })}`
                : 'Your latest weigh-in'}
            </Body>
          </View>
          <View style={{ gap: compact ? 4 : 7, alignItems: 'flex-end' }}>
            <Text style={{ color: C.blue, fontSize: 18, fontWeight: '600' }}>
              {change === null
                ? '—'
                : `${change > 0 ? '+' : ''}${displayWeight(change, units)} ${weightUnit}`}
            </Text>
            <Body>
              {period === 'All'
                ? 'Across all history'
                : `Over the last ${period === 'Week' ? '7' : period === 'Month' ? '30' : '365'} days`}
            </Body>
          </View>
        </Row>
        <WeightChart
          entries={entries}
          onSelect={(entry) => router.push({ pathname: '/weight', params: { id: entry.id } })}
        />
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button quiet onPress={() => router.push('/weight-history')}>
            History
          </Button>
        </Row>
      </Card>
      <View style={{ gap: 18 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ gap: 7 }}>
            <Title>Current maxes</Title>
            <Body>A record of how far you’ve come.</Body>
          </View>
          <Button quiet icon="plus" label="Add exercise" onPress={() => router.push('/lift')} />
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {journal.exercises.map((exercise, index) => {
            const records = sortLifts(journal.lifts.filter((r) => r.exerciseId === exercise.id));
            const current = records[0];
            return (
              <Pressable
                key={exercise.id}
                accessibilityRole="button"
                accessibilityLabel={`${exercise.name}, ${current ? displayWeight(current.pounds, units) + ' ' + weightUnit : 'no max recorded'}`}
                onPress={() => router.push({ pathname: '/lift', params: { id: exercise.id } })}
                style={({ pressed }) => ({
                  minWidth: 245,
                  flexBasis: '47%',
                  flexGrow: 1,
                  backgroundColor: pressed ? C.elevated : C.surface,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 18,
                  padding: 22,
                  gap: 22,
                })}
              >
                <Row>
                  <View
                    style={{
                      height: 36,
                      width: 36,
                      borderRadius: 10,
                      backgroundColor: C.elevated,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="lift" color={index % 2 ? C.purple : C.blue} size={20} />
                  </View>
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
                    {exercise.name}
                  </Text>
                  <Icon name="right" size={17} />
                </Row>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <Text
                    selectable
                    style={{
                      color: C.text,
                      fontSize: 32,
                      fontWeight: '600',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {current ? displayWeight(current.pounds, units) : '—'}
                    <Text style={{ fontSize: 14, color: C.muted }}> {weightUnit}</Text>
                  </Text>
                  <Label>
                    {records.length
                      ? `${records.length} ${records.length === 1 ? 'entry' : 'entries'}`
                      : 'Add a max'}
                  </Label>
                </Row>
                <Body>{current ? formatDate(current.date) : 'Ready for your first record'}</Body>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Page>
  );
}
