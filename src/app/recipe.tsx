import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useJournal, updateJournal } from '@/data/journal-store';
import { formatFoodLabel, positiveAtMost, recipeNutrition } from '@/domain/journal';
import {
  Body,
  Button,
  Card,
  Field,
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

export default function RecipeSheet() {
  return (
    <JournalReady>
      <RecipeForm />
    </JournalReady>
  );
}

function RecipeForm() {
  const C = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { journal } = useJournal();
  const recipe = journal.recipes.find((item) => item.id === id);
  const [name, setName] = useState(recipe?.name ?? '');
  const [servings, setServings] = useState(String(recipe?.servings ?? 1));
  const action = useAction();
  if (!recipe)
    return (
      <Sheet title="Recipe unavailable">
        <Notice message="This recipe is no longer available." />
      </Sheet>
    );
  const total = recipeNutrition(recipe);
  return (
    <Sheet
      title={recipe.saved ? 'Edit recipe' : 'Create recipe'}
      subtitle="Build it once. Log it anytime."
    >
      <Field
        label="Recipe name"
        value={name}
        onChangeText={setName}
        placeholder="Example: Morning smoothie"
        maxLength={80}
        autoFocus={!recipe.name}
      />
      <NumericField
        label="Servings in the recipe"
        value={servings}
        onChangeText={setServings}
        max={100}
        decimals={1}
        placeholder="1"
      />
      <Card style={{ backgroundColor: C.bg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Title size={18}>Ingredients</Title>
          <Button
            quiet
            icon="plus"
            onPress={() => {
              void updateJournal((next) => {
                const current = next.recipes.find((item) => item.id === recipe.id);
                if (current) {
                  current.name = name.trim();
                  current.servings = Number(servings) > 0 ? Number(servings) : 1;
                }
              }).then(() =>
                router.push({ pathname: '/food', params: { addToRecipeId: recipe.id } }),
              );
            }}
          >
            Add ingredient
          </Button>
        </Row>
        {recipe.ingredients.length ? (
          recipe.ingredients.map((ingredient) => (
            <View
              key={ingredient.id}
              style={{ paddingTop: 14, borderTopWidth: 1, borderColor: C.border }}
            >
              <Row>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: C.text, fontSize: 15 }}>
                    {formatFoodLabel(ingredient.food.name)}
                  </Text>
                  <Body>{Math.round(ingredient.nutrition.calories ?? 0)} cal</Body>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${ingredient.food.name}`}
                  onPress={() =>
                    void updateJournal((next) => {
                      const current = next.recipes.find((item) => item.id === recipe.id);
                      if (current)
                        current.ingredients = current.ingredients.filter(
                          (item) => item.id !== ingredient.id,
                        );
                    })
                  }
                  style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.55 : 1 })}
                >
                  <Icon name="trash" color={C.red} size={19} />
                </Pressable>
              </Row>
            </View>
          ))
        ) : (
          <Body>Search or scan the first ingredient to begin.</Body>
        )}
      </Card>
      {recipe.ingredients.length > 0 && (
        <Card style={{ backgroundColor: C.bg }}>
          <Title size={18}>Whole recipe</Title>
          <NutritionStrip nutrition={total} />
        </Card>
      )}
      {action.error && <Notice message={action.error} />}
      <Button
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            const trimmed = name.trim();
            if (!trimmed) throw new Error('Enter a recipe name.');
            if (!recipe.ingredients.length) throw new Error('Add at least one ingredient.');
            const servingCount = positiveAtMost(servings, 100, 'servings');
            await updateJournal((next) => {
              const current = next.recipes.find((item) => item.id === recipe.id);
              if (!current) throw new Error('This recipe is no longer available.');
              current.name = trimmed;
              current.servings = servingCount;
              current.saved = true;
            });
            router.back();
          })
        }
      >
        Save recipe
      </Button>
      {recipe.saved && (
        <Button
          quiet
          danger
          icon="trash"
          loading={action.busy}
          onPress={() =>
            void action.run(async () => {
              await updateJournal((next) => {
                next.recipes = next.recipes.filter((item) => item.id !== recipe.id);
              });
              router.back();
            })
          }
        >
          Delete recipe
        </Button>
      )}
      <Body>
        Recipe ingredients and nutrition are private journal data. Signed-in journals synchronize
        them across your devices.
      </Body>
    </Sheet>
  );
}
