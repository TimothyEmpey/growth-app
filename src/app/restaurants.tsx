import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Body,
  Button,
  dismissSheet,
  Field,
  Icon,
  Label,
  Notice,
  Row,
  Sheet,
  useAction,
} from '@/components/ui';
import { useColors } from '@/providers/appearance';
import { POPULAR_RESTAURANTS } from '@/domain/restaurants';
import type { Food, FoodSearchItem, Meal } from '@/domain/types';
import { api } from '@/services/api';
import { useJournal } from '@/data/journal-store';
import { addDefaultFoods } from '@/data/food-log';
import { today } from '@/domain/journal';

export default function RestaurantsSheet() {
  const C = useColors();
  const { journal } = useJournal();
  const action = useAction();
  const params = useLocalSearchParams<{
    meal?: Meal;
    date?: string;
    addToRecipeId?: string;
  }>();
  const [query, setQuery] = useState('');
  const [restaurant, setRestaurant] = useState('');
  const [menuQuery, setMenuQuery] = useState('');
  const [page, setPage] = useState(1);
  const [multiAdd, setMultiAdd] = useState(false);
  const [multiFoods, setMultiFoods] = useState<FoodSearchItem[]>([]);
  const matchingRestaurants = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return POPULAR_RESTAURANTS.filter((name) => name.toLocaleLowerCase().includes(needle));
  }, [query]);
  const menu = useQuery({
    queryKey: ['restaurant-menu', restaurant, menuQuery.trim(), page],
    queryFn: ({ signal }) =>
      api<{ foods: FoodSearchItem[]; hasMore: boolean }>(
        `/api/restaurants/menu?name=${encodeURIComponent(restaurant)}&q=${encodeURIComponent(menuQuery.trim())}&page=${page}`,
        { signal },
      ),
    enabled: !!restaurant,
    retry: 1,
  });
  const openRestaurant = (name: string) => {
    setRestaurant(name.trim());
    setMenuQuery('');
    setPage(1);
  };
  const selectFood = (food: FoodSearchItem) =>
    router.replace({
      pathname: '/food',
      params: {
        meal: params.meal,
        date: params.date,
        addToRecipeId: params.addToRecipeId,
        foodId: food.id,
      },
    } as Href);
  const toggleMultiFood = (food: FoodSearchItem) => {
    setMultiAdd(true);
    setMultiFoods((selected) =>
      selected.some((item) => item.id === food.id)
        ? selected.filter((item) => item.id !== food.id)
        : [...selected, food],
    );
  };
  const finishMultiAdd = () =>
    void action.run(async () => {
      const foods = await Promise.all(
        multiFoods.map(async (item) => {
          const saved = journal.foods.find((food) => food.id === item.id);
          return saved ?? api<Food>(`/api/foods/${item.id}`);
        }),
      );
      await addDefaultFoods(
        foods,
        params.meal ?? 'breakfast',
        params.date ?? today(),
        params.addToRecipeId,
      );
      if (params.addToRecipeId) router.back();
      else dismissSheet('/diet');
    });

  return (
    <Sheet
      title={restaurant || 'Restaurants'}
      subtitle={
        restaurant
          ? 'Choose an available menu item and log it with its FatSecret nutrition.'
          : 'Browse popular chains or enter any restaurant name.'
      }
    >
      {restaurant ? (
        <>
          <Button quiet icon="left" onPress={() => setRestaurant('')}>
            All restaurants
          </Button>
          <Field
            label="Search this menu"
            value={menuQuery}
            onChangeText={(value) => {
              setMenuQuery(value);
              setPage(1);
            }}
            placeholder={`Search ${restaurant}…`}
            autoCorrect={false}
          />
          <Row style={{ flexWrap: 'wrap' }}>
            <Button
              quiet
              icon={multiAdd ? 'close' : 'check'}
              onPress={() => {
                setMultiAdd((active) => !active);
                setMultiFoods([]);
              }}
            >
              {multiAdd ? 'Cancel multi add' : 'Multi add'}
            </Button>
            {multiAdd && (
              <Button disabled={!multiFoods.length || action.busy} onPress={finishMultiAdd}>
                {multiFoods.length
                  ? `Add ${multiFoods.length} ${multiFoods.length === 1 ? 'food' : 'foods'}`
                  : 'Add selected foods'}
              </Button>
            )}
          </Row>
          {action.error && <Notice message={action.error} />}
          {menu.isFetching && <Body>Loading menu…</Body>}
          {menu.error && <Notice message={menu.error.message} />}
          {menu.data?.foods.length ? (
            <View style={{ gap: 2 }}>
              {menu.data.foods.map((food) => (
                <Pressable
                  key={food.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: multiFoods.some((item) => item.id === food.id) }}
                  onPress={() => (multiAdd ? toggleMultiFood(food) : selectFood(food))}
                  onLongPress={() => toggleMultiFood(food)}
                  delayLongPress={450}
                  style={({ pressed }) => ({
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderColor: C.border,
                    opacity: pressed ? 0.65 : 1,
                    backgroundColor: multiFoods.some((item) => item.id === food.id)
                      ? C.elevated
                      : 'transparent',
                  })}
                >
                  <Row>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
                        {food.name}
                      </Text>
                      <Body>{food.brand}</Body>
                    </View>
                    <Icon
                      name={
                        multiAdd
                          ? multiFoods.some((item) => item.id === food.id)
                            ? 'check'
                            : 'plus'
                          : 'right'
                      }
                      size={18}
                    />
                  </Row>
                </Pressable>
              ))}
            </View>
          ) : (
            menu.data &&
            !menu.isFetching && (
              <Notice message="No matching menu items were returned by FatSecret. Check the restaurant name or try a broader menu search." />
            )
          )}
          <Row>
            {page > 1 && (
              <Button quiet onPress={() => setPage(page - 1)}>
                Previous
              </Button>
            )}
            {menu.data?.hasMore && (
              <Button quiet onPress={() => setPage(page + 1)}>
                More items
              </Button>
            )}
          </Row>
        </>
      ) : (
        <>
          <Field
            label="Find a restaurant"
            value={query}
            onChangeText={setQuery}
            placeholder="Try Chipotle or a local chain…"
            autoFocus
            autoCorrect={false}
          />
          {query.trim().length >= 2 &&
            !POPULAR_RESTAURANTS.some(
              (name) => name.toLocaleLowerCase() === query.trim().toLocaleLowerCase(),
            ) && (
              <Button icon="search" onPress={() => openRestaurant(query)}>
                Search “{query.trim()}” menu
              </Button>
            )}
          <Label>{query ? 'Matching restaurants' : 'Popular restaurants'}</Label>
          <View style={{ gap: 2 }}>
            {matchingRestaurants.map((name) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                onPress={() => openRestaurant(name)}
                style={({ pressed }) => ({
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderColor: C.border,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <Row>
                  <Text style={{ flex: 1, color: C.text, fontSize: 16, fontWeight: '600' }}>
                    {name}
                  </Text>
                  <Icon name="right" size={18} />
                </Row>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Sheet>
  );
}
