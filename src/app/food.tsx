import { useColors } from '@/providers/appearance';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useJournal, updateJournal } from '@/data/journal-store';
import { formatFoodLabel, newId, nutritionFor, positive, today, validDate } from '@/domain/journal';
import { MEALS, type Food, type FoodSearchItem, type Meal } from '@/domain/types';
import { api } from '@/services/api';
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
  NutritionStrip,
  Row,
  Sheet,
  Title,
  useAction,
} from '@/components/ui';

export default function FoodSheet() {
  return (
    <JournalReady>
      <FoodForm />
    </JournalReady>
  );
}
// One sheet handles food search, serving selection, and edits to an existing meal entry.
function FoodForm() {
  const C = useColors();
  const params = useLocalSearchParams<{ id?: string; meal?: Meal; date?: string }>();
  const { journal } = useJournal();
  const existing = journal.meals.find((e) => e.id === params.id);
  const meal = existing?.meal ?? params.meal ?? 'breakfast';
  const date = existing?.date ?? params.date ?? today();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Food | null>(existing?.food ?? null);
  const queryClient = useQueryClient();
  const [portionId, setPortionId] = useState(existing?.portionId ?? 'grams');
  const [portionMenuOpen, setPortionMenuOpen] = useState(false);
  const [quantity, setQuantity] = useState(existing?.quantity.toString() ?? '100');
  const action = useAction();
  const currentPortion = selected?.portions.find((portion) => portion.id === portionId);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);
  const search = useQuery({
    queryKey: ['foods', debounced, page],
    queryFn: ({ signal }) =>
      api<{ foods: FoodSearchItem[]; hasMore: boolean }>(
        `/api/foods/search?q=${encodeURIComponent(debounced)}&page=${page}`,
        { signal },
      ),
    enabled: debounced.length >= 2 && !selected,
    retry: false,
  });
  let nutrition = selected?.per100g;
  if (selected && Number(quantity) > 0 && Number.isFinite(Number(quantity)))
    nutrition = nutritionFor(selected, portionId, Number(quantity));
  const recents = journal.foods.filter(
    (food) =>
      !query || `${food.name} ${food.brand ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  const choose = (food: Food) => {
    setSelected(food);
    const portion = food.portions.find((p) => p.id !== 'grams') ?? food.portions[0];
    setPortionId(portion.id);
    setQuantity(portion.id === 'grams' ? '100' : '1');
  };
  return (
    <Sheet
      title={existing ? 'Food details' : `Log ${meal}`}
      subtitle={
        selected
          ? formatFoodLabel(selected.brand ?? 'USDA FoodData Central')
          : 'Find a food, choose a serving, make it yours.'
      }
    >
      {selected ? (
        <>
          <Title size={22}>{formatFoodLabel(selected.name)}</Title>
          {!existing && (
            <Button
              quiet
              icon="left"
              onPress={() => {
                setSelected(null);
              }}
            >
              Back to search
            </Button>
          )}
          <View style={{ gap: 10 }}>
            <Label>Serving size</Label>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose serving size"
              accessibilityState={{ expanded: portionMenuOpen }}
              onPress={() => setPortionMenuOpen((open) => !open)}
              style={({ pressed }) => ({
                minHeight: 50,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: portionMenuOpen ? C.blue : C.border,
                backgroundColor: C.bg,
                borderRadius: 10,
                opacity: pressed ? 0.7 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              })}
            >
              <Text style={{ color: C.text, fontSize: 15, flex: 1 }}>
                {currentPortion?.label ?? 'Choose a serving'}
              </Text>
              <Text style={{ color: C.muted, fontSize: 18 }}>{portionMenuOpen ? '⌃' : '⌄'}</Text>
            </Pressable>
            {portionMenuOpen && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  backgroundColor: C.bg,
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                {selected.portions.map((portion, index) => {
                  const active = portionId === portion.id;
                  return (
                    <Pressable
                      accessibilityRole="menuitem"
                      accessibilityState={{ selected: active }}
                      key={portion.id}
                      onPress={() => {
                        setPortionId(portion.id);
                        setQuantity(portion.id === 'grams' ? '100' : '1');
                        setPortionMenuOpen(false);
                      }}
                      style={({ pressed }) => ({
                        minHeight: 48,
                        paddingHorizontal: 14,
                        justifyContent: 'center',
                        backgroundColor: active ? '#719bff17' : pressed ? C.elevated : C.bg,
                        borderTopWidth: index ? 1 : 0,
                        borderColor: C.border,
                      })}
                    >
                      <Text style={{ color: active ? C.blue : C.text, fontSize: 14 }}>
                        {portion.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
          <Field
            label={portionId === 'grams' ? 'Grams' : 'Number of servings'}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder="1"
          />
          {nutrition && (
            <Card style={{ backgroundColor: C.bg }}>
              <NutritionStrip nutrition={nutrition} />
            </Card>
          )}
          {nutrition && Object.values(nutrition).includes(null) && (
            <Body>
              USDA does not provide every nutrient for this food. Missing values are shown as —.
            </Body>
          )}
          {action.error && <Notice message={action.error} />}
          <Button
            loading={action.busy}
            onPress={() =>
              void action.run(async () => {
                const count = positive(quantity);
                if (!MEALS.includes(meal) || !validDate(date))
                  throw new Error('Choose a valid meal and date.');
                const snapshot = nutritionFor(selected, portionId, count);
                await updateJournal((j) => {
                  const entry = {
                    id: existing?.id ?? newId(),
                    date,
                    meal,
                    food: selected,
                    portionId,
                    quantity: count,
                    nutrition: snapshot,
                  };
                  j.meals = [...j.meals.filter((e) => e.id !== entry.id), entry];
                  // Keep recently logged foods locally so they can be reused offline.
                  j.foods = [selected, ...j.foods.filter((f) => f.id !== selected.id)].slice(
                    0,
                    100,
                  );
                });
                dismissSheet('/diet');
              })
            }
          >
            {existing ? 'Save changes' : `Add to ${meal}`}
          </Button>
          {existing && (
            <Button
              quiet
              danger
              icon="trash"
              loading={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await updateJournal((j) => {
                    j.meals = j.meals.filter((e) => e.id !== existing.id);
                  });
                  dismissSheet('/diet');
                })
              }
            >
              Remove food
            </Button>
          )}
        </>
      ) : (
        <>
          <Field
            label="Search foods"
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Try eggs, Greek yogurt, or a brand…"
            autoCorrect={false}
          />
          {action.busy && <ActivityIndicator color={C.blue} />}
          {action.error && <Notice message={action.error} />}
          {recents.length > 0 && (
            <View style={{ gap: 8 }}>
              <Label>Recent foods · available offline</Label>
              {recents.slice(0, 8).map((food) => (
                <FoodResult key={food.id} food={food} onPress={() => choose(food)} />
              ))}
            </View>
          )}
          {search.isFetching && <ActivityIndicator color={C.blue} />}
          {search.error && (
            <>
              <Notice message={search.error.message} />
              <Button quiet onPress={() => void search.refetch()}>
                Try again
              </Button>
            </>
          )}
          {search.data && debounced.length >= 2 && (
            <View style={{ gap: 8 }}>
              <Label>Search results</Label>
              {search.data.foods.length ? (
                search.data.foods.map((food) => (
                  <FoodResult
                    key={food.id}
                    food={food}
                    onPress={() => {
                      if (action.busy) return;
                      void action.run(async () => {
                        choose(
                          await queryClient.fetchQuery({
                            queryKey: ['food', food.id],
                            queryFn: ({ signal }) => api<Food>(`/api/foods/${food.id}`, { signal }),
                            retry: false,
                          }),
                        );
                      });
                    }}
                  />
                ))
              ) : (
                <Body>No foods found. Try a different name or brand.</Body>
              )}
              <Row>
                {page > 1 && (
                  <Button quiet onPress={() => setPage(page - 1)}>
                    Previous
                  </Button>
                )}
                {search.data.hasMore && (
                  <Button quiet onPress={() => setPage(page + 1)}>
                    More results
                  </Button>
                )}
              </Row>
            </View>
          )}
          {!query && !recents.length && (
            <View style={{ paddingVertical: 25, gap: 12 }}>
              <Icon name="search" size={32} color={C.blue} />
              <Title size={18}>Find your everyday foods</Title>
              <Body>
                Search everyday ingredients and branded foods. Foods you log will stay here for a
                quicker next time.
              </Body>
            </View>
          )}
          <Body>Food data from USDA FoodData Central.</Body>
        </>
      )}
    </Sheet>
  );
}
function FoodResult({ food, onPress }: { food: FoodSearchItem; onPress: () => void }) {
  const C = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ paddingVertical: 15, borderBottomWidth: 1, borderColor: C.border }}
    >
      <Row>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: C.text, fontSize: 15, lineHeight: 22 }}>
            {formatFoodLabel(food.name)}
          </Text>
          {food.brand && <Body>{formatFoodLabel(food.brand)}</Body>}
        </View>
        <Icon name="right" size={18} />
      </Row>
    </Pressable>
  );
}
