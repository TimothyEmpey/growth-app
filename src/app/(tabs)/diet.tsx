import { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useJournal } from '@/data/journal-store';
import { formatDate, shiftDay, sumNutrition, today } from '@/domain/journal';
import { MEALS } from '@/domain/types';
import { Body, Button, C, Card, Icon, Label, Page, Row, Title } from '@/components/ui';
import { DateField } from '@/components/date-field';

export default function DietPage() {
  const compact = useWindowDimensions().width < 600;
  const { journal } = useJournal();
  const [date, setDate] = useState(today());
  const [showCalendar, setShowCalendar] = useState(false);
  const entries = journal.meals.filter((e) => e.date === date);
  const totals = sumNutrition(entries.map((e) => e.nutrition));
  const goal = journal.goals.calories;
  const ratio = goal && totals.calories !== null ? Math.min(1, totals.calories / goal) : 0;
  return (
    <Page
      title="Diet"
      eyebrow="Fuel your everyday"
      action={
        <Button quiet icon="settings" onPress={() => router.push('/goals')}>
          Daily goals
        </Button>
      }
    >
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Row>
          <Button
            quiet
            icon="left"
            label="Previous day"
            onPress={() => setDate(shiftDay(date, -1))}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select journal date"
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <Row>
              <Icon name="calendar" size={19} />
              <Title size={18}>
                {date === today() ? 'Today' : formatDate(date, { month: 'short', day: 'numeric' })}
              </Title>
              <Body>
                {date === today()
                  ? formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' })
                  : formatDate(date, { weekday: 'long' })}
              </Body>
            </Row>
          </Pressable>
          <Button
            quiet
            icon="right"
            label="Next day"
            disabled={date >= today()}
            onPress={() => setDate(shiftDay(date, 1))}
          />
        </Row>
        {date !== today() && (
          <Button quiet onPress={() => setDate(today())}>
            Today
          </Button>
        )}
      </Row>
      {showCalendar && (
        <DateField
          label="Journal date"
          value={date}
          onChange={(value) => {
            setDate(value);
            setShowCalendar(false);
          }}
        />
      )}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Title size={18}>Daily nutrition</Title>
          <Label>
            {entries.length} {entries.length === 1 ? 'item' : 'items'} logged
          </Label>
        </Row>
        <Row style={{ flexWrap: 'wrap', gap: compact ? 18 : 28, alignItems: 'center' }}>
          <View
            style={{
              width: compact ? 120 : 172,
              height: compact ? 120 : 172,
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
            }}
          >
            <Svg
              width={compact ? 120 : 172}
              height={compact ? 120 : 172}
              viewBox="0 0 172 172"
              style={{ position: 'absolute' }}
            >
              <Circle cx={86} cy={86} r={77} stroke={C.border} strokeWidth={7} fill="none" />
              <Circle
                cx={86}
                cy={86}
                r={77}
                stroke={C.blue}
                strokeWidth={7}
                fill="none"
                strokeDasharray={`${ratio * 484} 484`}
                strokeLinecap="round"
                transform="rotate(-90 86 86)"
              />
            </Svg>
            <Text
              selectable
              style={{
                color: C.text,
                fontSize: compact ? 28 : 36,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
                letterSpacing: -1,
              }}
            >
              {totals.calories === null ? '—' : Math.round(totals.calories)}
            </Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 5 }}>
              {goal ? `of ${goal.toLocaleString()} kcal` : 'calories logged'}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: compact ? 115 : 210, gap: compact ? 18 : 25 }}>
            {(['protein', 'carbs', 'fat'] as const).map((key) => {
              const value = totals[key],
                target = journal.goals[key],
                color = key === 'protein' ? C.blue : key === 'carbs' ? C.gold : C.purple;
              return (
                <View key={key} style={{ gap: 10 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={{ color: C.text, fontSize: 15, textTransform: 'capitalize' }}>
                      {key}
                    </Text>
                    <Text
                      selectable
                      style={{
                        fontSize: 15,
                        color,
                        fontVariant: ['tabular-nums'],
                        fontWeight: '600',
                      }}
                    >
                      {value === null ? '—' : Number(value.toFixed(1))}
                      <Text style={{ fontWeight: '400', color: C.muted }}>
                        {' '}
                        {target ? `/ ${target} g` : 'g'}
                      </Text>
                    </Text>
                  </Row>
                  <View style={{ height: 5, backgroundColor: C.border, borderRadius: 3 }}>
                    <View
                      style={{
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: color,
                        width: `${target && value !== null ? Math.min(100, (value / target) * 100) : 0}%`,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </Row>
        {Object.values(totals).includes(null) && (
          <Body>Some foods are missing nutrition data. Incomplete totals appear as —.</Body>
        )}
        {!goal && <Body>Set your own daily goals whenever you’re ready.</Body>}
      </Card>
      <View style={{ gap: 14 }}>
        {MEALS.map((meal, index) => {
          const foods = entries.filter((e) => e.meal === meal);
          const nutrition = sumNutrition(foods.map((e) => e.nutrition));
          return (
            <Card key={meal} style={{ padding: 20, gap: 16 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row>
                  <View
                    style={{
                      width: 37,
                      height: 37,
                      borderRadius: 11,
                      backgroundColor: C.elevated,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Icon
                      name="food"
                      size={18}
                      color={[C.gold, C.green, C.blue, C.purple][index]}
                    />
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 17,
                        fontWeight: '600',
                        textTransform: 'capitalize',
                      }}
                    >
                      {meal}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>
                      {nutrition.calories === null
                        ? 'Incomplete'
                        : `${Math.round(nutrition.calories)} kcal`}
                    </Text>
                  </View>
                </Row>
                <Button
                  quiet
                  icon="plus"
                  label={`Log ${meal}`}
                  onPress={() => router.push({ pathname: '/food', params: { meal, date } })}
                >
                  Log
                </Button>
              </Row>
              {foods.length ? (
                foods.map((entry) => (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/food', params: { id: entry.id } })}
                    style={{ paddingTop: 14, borderTopWidth: 1, borderColor: C.border }}
                  >
                    <Row>
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text style={{ color: C.text, fontSize: 15 }}>{entry.food.name}</Text>
                        <Body>
                          {entry.quantity} ×{' '}
                          {entry.food.portions.find((p) => p.id === entry.portionId)?.label}
                        </Body>
                      </View>
                      <Text style={{ color: C.text, fontSize: 15 }}>
                        {entry.nutrition.calories === null
                          ? '—'
                          : Math.round(entry.nutrition.calories)}{' '}
                        <Text style={{ fontSize: 12, color: C.muted }}>kcal</Text>
                      </Text>
                      <Icon name="right" size={16} />
                    </Row>
                  </Pressable>
                ))
              ) : (
                <Text style={{ color: '#737e8d', fontSize: 14, paddingVertical: 3 }}>
                  Nothing logged yet
                </Text>
              )}
            </Card>
          );
        })}
      </View>
    </Page>
  );
}
