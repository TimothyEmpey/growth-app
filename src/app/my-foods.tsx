import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/providers/appearance';
import { useAccount } from '@/services/account';
import { api } from '@/services/api';
import { INPUT_LIMITS } from '@/domain/input';
import type { Food, Meal, Nutrition } from '@/domain/types';
import {
  Body,
  Button,
  Card,
  Field,
  Icon,
  Label,
  Notice,
  NumericField,
  NutritionStrip,
  Row,
  Sheet,
  Title,
  useAction,
} from '@/components/ui';

export default function MyFoodsSheet() {
  const C = useColors();
  const account = useAccount();
  const client = useQueryClient();
  const action = useAction();
  const params = useLocalSearchParams<{
    meal?: Meal;
    date?: string;
    addToRecipeId?: string;
    create?: string;
  }>();
  const [creating, setCreating] = useState(params.create === '1');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [servingLabel, setServingLabel] = useState('1 serving');
  const [servingGrams, setServingGrams] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const foods = useQuery({
    queryKey: ['community-foods'],
    queryFn: ({ signal }) => api<{ foods: Food[] }>('/api/foods/mine', { signal }),
    enabled: !!account.data?.account,
    retry: false,
  });
  const preview: Nutrition = {
    calories: Number(calories) || 0,
    protein: Number(protein) || 0,
    carbs: Number(carbs) || 0,
    fat: Number(fat) || 0,
  };
  const returnToSearch = () =>
    router.replace({
      pathname: '/food',
      params: {
        meal: params.meal,
        date: params.date,
        addToRecipeId: params.addToRecipeId,
      },
    });
  // Return through the existing food detail flow so servings and journal snapshots stay identical.
  const select = (food: Food) =>
    router.replace({
      pathname: '/food',
      params: {
        meal: params.meal,
        date: params.date,
        addToRecipeId: params.addToRecipeId,
        communityFoodId: food.id.slice('community:'.length),
      },
    });
  const deleteFood = (food: Food) =>
    void action.run(async () => {
      await api(`/api/foods/${food.id}`, { method: 'DELETE' });
      await Promise.all([
        client.invalidateQueries({ queryKey: ['community-foods'] }),
        client.invalidateQueries({ queryKey: ['foods'] }),
      ]);
    });
  const confirmFoodDeletion = (food: Food) => {
    const message = 'This permanently removes the food from Growth search for everyone.';
    if (process.env.EXPO_OS === 'web') {
      if (globalThis.confirm(`${message}\n\nDelete ${food.name}?`)) deleteFood(food);
      return;
    }
    Alert.alert(`Delete ${food.name}?`, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete food', style: 'destructive', onPress: () => deleteFood(food) },
    ]);
  };

  if (account.isPending)
    return (
      <Sheet title="My Foods" subtitle="Foods you add for the Growth community.">
        <ActivityIndicator color={C.blue} />
      </Sheet>
    );
  if (!account.data?.account)
    return (
      <Sheet title="My Foods" subtitle="Foods you add for the Growth community.">
        <Card>
          <Icon name="account" color={C.blue} size={28} />
          <Title size={19}>Sign in to add foods</Title>
          <Body>
            A Growth account keeps your food contributions tied to you across devices and lets your
            matches appear first in search.
          </Body>
          <Button
            onPress={() =>
              router.replace({
                pathname: '/account/sign-in',
                params: {
                  returnTo: 'my-foods',
                  meal: params.meal,
                  date: params.date,
                  addToRecipeId: params.addToRecipeId,
                },
              })
            }
          >
            Sign in
          </Button>
        </Card>
      </Sheet>
    );

  return (
    <Sheet
      title={creating ? 'Add a food' : 'My Foods'}
      subtitle={
        creating
          ? 'Add accurate serving nutrition for everyone on Growth.'
          : 'Your foods appear first when they match your search.'
      }
    >
      {creating ? (
        <>
          <Button quiet icon="left" onPress={() => setCreating(false)}>
            Back to My Foods
          </Button>
          <Field
            label="Food name"
            value={name}
            onChangeText={setName}
            placeholder="Homemade turkey chili"
            autoFocus
            maxLength={120}
          />
          <Field
            label="Brand or maker (optional)"
            value={brand}
            onChangeText={setBrand}
            placeholder="Your kitchen or brand name"
            maxLength={80}
          />
          <Field
            label="Serving description"
            value={servingLabel}
            onChangeText={setServingLabel}
            placeholder="1 bowl"
            maxLength={80}
          />
          <NumericField
            label="Serving weight in grams"
            value={servingGrams}
            onChangeText={setServingGrams}
            max={INPUT_LIMITS.foodGrams}
            decimals={2}
            placeholder="250"
          />
          <Label>Nutrition per serving</Label>
          <Row style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 130 }}>
              <NumericField
                label="Calories"
                value={calories}
                onChangeText={setCalories}
                max={INPUT_LIMITS.calories}
                decimals={1}
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1, minWidth: 130 }}>
              <NumericField
                label="Protein (g)"
                value={protein}
                onChangeText={setProtein}
                max={INPUT_LIMITS.macroGrams}
                decimals={2}
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1, minWidth: 130 }}>
              <NumericField
                label="Carbs (g)"
                value={carbs}
                onChangeText={setCarbs}
                max={INPUT_LIMITS.macroGrams}
                decimals={2}
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1, minWidth: 130 }}>
              <NumericField
                label="Fat (g)"
                value={fat}
                onChangeText={setFat}
                max={INPUT_LIMITS.macroGrams}
                decimals={2}
                placeholder="0"
              />
            </View>
          </Row>
          <Card style={{ backgroundColor: C.bg }}>
            <NutritionStrip nutrition={preview} />
          </Card>
          <Body>
            Check the label carefully. This food will be searchable by everyone using Growth.
          </Body>
          {action.error && <Notice message={action.error} />}
          <Button
            loading={action.busy}
            icon="plus"
            onPress={() =>
              void action.run(async () => {
                const food = await api<Food>('/api/foods/community', {
                  method: 'POST',
                  body: JSON.stringify({
                    name,
                    brand,
                    servingLabel,
                    servingGrams,
                    calories,
                    protein,
                    carbs,
                    fat,
                  }),
                });
                await Promise.all([
                  client.invalidateQueries({ queryKey: ['community-foods'] }),
                  client.invalidateQueries({ queryKey: ['foods'] }),
                ]);
                select(food);
              })
            }
          >
            Add food to Growth
          </Button>
        </>
      ) : (
        <>
          <Button quiet icon="left" onPress={returnToSearch}>
            Back to food search
          </Button>
          <Button icon="plus" onPress={() => setCreating(true)}>
            Add a food
          </Button>
          {action.error && <Notice message={action.error} />}
          {foods.isFetching && <ActivityIndicator color={C.blue} />}
          {foods.error && <Notice message={foods.error.message} />}
          {foods.data?.foods.length ? (
            <View style={{ gap: 2 }}>
              {foods.data.foods.map((food) => {
                const serving = food.portions.find((portion) => portion.id === 'serving');
                return (
                  <Row
                    key={food.id}
                    style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: C.border }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${food.name}`}
                      onPress={() => select(food)}
                      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.65 : 1 })}
                    >
                      <Row>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
                            {food.name}
                          </Text>
                          <Body>
                            {[food.brand, serving?.label].filter(Boolean).join(' · ')}
                          </Body>
                        </View>
                        <Icon name="right" size={18} />
                      </Row>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${food.name}`}
                      disabled={action.busy}
                      onPress={() => confirmFoodDeletion(food)}
                      hitSlop={10}
                      style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}
                    >
                      <Icon name="trash" color={C.red} size={19} />
                    </Pressable>
                  </Row>
                );
              })}
            </View>
          ) : (
            !foods.isFetching && (
              <Card>
                <Title size={19}>No foods added yet</Title>
                <Body>
                  Add a food when the exact item is missing. It will become searchable for the
                  Growth community and stay at the top of your matching results.
                </Body>
              </Card>
            )
          )}
        </>
      )}
    </Sheet>
  );
}
