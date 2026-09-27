import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useJournal, updateJournal } from '@/data/journal-store';
import {
  newId,
  nutritionFor,
  positiveAtMost,
  recipeAsFood,
  recipeNutrition,
  validDate,
} from '@/domain/journal';
import { INPUT_LIMITS } from '@/domain/input';
import { MEALS, type Meal, type Recipe } from '@/domain/types';
import {
  Body,
  Button,
  Card,
  Icon,
  JournalReady,
  Notice,
  NumericField,
  NutritionStrip,
  Row,
  Sheet,
  Title,
  useAction,
} from '@/components/ui';
import { useColors } from '@/providers/appearance';

export default function RecipesSheet() {
  return (
    <JournalReady>
      <RecipesForm />
    </JournalReady>
  );
}

function RecipesForm() {
  const C = useColors();
  const params = useLocalSearchParams<{ meal?: Meal; date?: string }>();
  const { journal } = useJournal();
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [quantity, setQuantity] = useState('1');
  const action = useAction();
  const recipes = journal.recipes.filter((recipe) => recipe.saved);
  const meal = params.meal ?? 'breakfast';
  const date = params.date ?? '';
  const food = selected ? recipeAsFood(selected) : null;
  const nutrition = food ? nutritionFor(food, 'serving', Number(quantity) || 1) : null;
  return (
    <Sheet
      title={selected ? selected.name : 'Your recipes'}
      subtitle="Private to your Growth journal."
    >
      {selected && food ? (
        <>
          <Button quiet icon="left" onPress={() => setSelected(null)}>
            Back to recipes
          </Button>
          <NumericField
            label="Number of servings"
            value={quantity}
            onChangeText={setQuantity}
            max={INPUT_LIMITS.foodServings}
            decimals={2}
            placeholder="1"
          />
          {nutrition && (
            <Card style={{ backgroundColor: C.bg }}>
              <NutritionStrip nutrition={nutrition} />
            </Card>
          )}
          {action.error && <Notice message={action.error} />}
          <Button
            loading={action.busy}
            onPress={() =>
              void action.run(async () => {
                if (!MEALS.includes(meal) || !validDate(date))
                  throw new Error('Choose a valid meal and date.');
                const count = positiveAtMost(quantity, INPUT_LIMITS.foodServings, 'quantity');
                const snapshot = nutritionFor(food, 'serving', count);
                await updateJournal((next) => {
                  next.meals.push({
                    id: newId(),
                    date,
                    meal,
                    food,
                    portionId: 'serving',
                    quantity: count,
                    nutrition: snapshot,
                  });
                });
                router.dismissTo('/diet');
              })
            }
          >
            Add to {meal}
          </Button>
        </>
      ) : (
        <>
          <Button
            quiet
            icon="plus"
            onPress={() => {
              const id = newId();
              void updateJournal((next) => {
                next.recipes.push({ id, name: '', servings: 1, ingredients: [], saved: false });
              }).then(() => router.push({ pathname: '/recipe', params: { id } }));
            }}
          >
            Create new recipe
          </Button>
          {recipes.length ? (
            recipes.map((recipe) => {
              const perServing = recipeAsFood(recipe).per100g;
              return (
                <View key={recipe.id} style={{ borderBottomWidth: 1, borderColor: C.border }}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setSelected(recipe);
                      setQuantity('1');
                    }}
                    style={({ pressed }) => ({ paddingVertical: 16, opacity: pressed ? 0.6 : 1 })}
                  >
                    <Row>
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
                          {recipe.name}
                        </Text>
                        <Body>
                          {recipe.ingredients.length} ingredients ·{' '}
                          {Math.round(perServing.calories ?? 0)} cal per serving
                        </Body>
                      </View>
                      <Icon name="right" size={18} />
                    </Row>
                  </Pressable>
                  <Row style={{ justifyContent: 'space-between', paddingBottom: 12 }}>
                    <Body>{Math.round(recipeNutrition(recipe).calories ?? 0)} cal total</Body>
                    <Button
                      quiet
                      onPress={() =>
                        router.push({ pathname: '/recipe', params: { id: recipe.id } })
                      }
                    >
                      Edit
                    </Button>
                  </Row>
                </View>
              );
            })
          ) : (
            <Card style={{ backgroundColor: C.bg }}>
              <Title size={18}>No saved recipes yet</Title>
              <Body>Create a recipe from foods and barcodes you already use in Growth.</Body>
            </Card>
          )}
        </>
      )}
    </Sheet>
  );
}
