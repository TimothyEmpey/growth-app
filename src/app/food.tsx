import { useColors } from '@/providers/appearance';
import { Camera, CameraView } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useJournal, updateJournal } from '@/data/journal-store';
import {
  formatFoodLabel,
  newId,
  nutritionFor,
  positiveAtMost,
  recipeAsFood,
  today,
  validDate,
  withOunceFallback,
} from '@/domain/journal';
import { INPUT_LIMITS } from '@/domain/input';
import { MEALS, type Food, type FoodSearchItem, type Meal } from '@/domain/types';
import { api } from '@/services/api';
import {
  dismissSheet,
  Body,
  Button,
  Card,
  Field,
  FatSecretAttribution,
  Icon,
  JournalReady,
  Label,
  Notice,
  NumericField,
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
  const params = useLocalSearchParams<{
    id?: string;
    meal?: Meal;
    date?: string;
    recipeId?: string;
    addToRecipeId?: string;
  }>();
  const { journal } = useJournal();
  const existing = journal.meals.find((e) => e.id === params.id);
  const selectedRecipe = journal.recipes.find(
    (recipe) => recipe.id === params.recipeId && recipe.saved,
  );
  const meal = existing?.meal ?? params.meal ?? 'breakfast';
  const date = existing?.date ?? params.date ?? today();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Food | null>(() =>
    existing
      ? withOunceFallback(existing.food)
      : selectedRecipe
        ? recipeAsFood(selectedRecipe)
        : null,
  );
  const queryClient = useQueryClient();
  const [portionId, setPortionId] = useState(
    existing?.portionId ?? (selectedRecipe ? 'serving' : 'grams'),
  );
  const [portionMenuOpen, setPortionMenuOpen] = useState(false);
  const [quantity, setQuantity] = useState(
    existing?.quantity.toString() ?? (selectedRecipe ? '1' : '100'),
  );
  const [scanning, setScanning] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const barcodeHandled = useRef(false);
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
  const recents = journal.foods;
  const choose = (food: Food) => {
    setSelected(withOunceFallback(food));
    setPortionMenuOpen(false);
    const portion =
      food.portions.find((p) => p.id === food.defaultPortionId) ??
      food.portions.find((p) => p.id !== 'grams') ??
      food.portions[0];
    setPortionId(portion.id);
    setQuantity(portion.id === 'grams' ? '100' : '1');
  };
  const selectScannedFood = async (rawBarcode: string) => {
    const barcode = rawBarcode.replace(/\D/g, '');
    if (!barcode) throw new Error('That scan did not contain a supported food barcode.');
    choose(
      await queryClient.fetchQuery({
        queryKey: ['food', `off:${barcode}`],
        queryFn: ({ signal }) => api<Food>(`/api/foods/off:${barcode}`, { signal }),
        retry: false,
      }),
    );
  };
  const scanBarcode = async () => {
    if (process.env.EXPO_OS === 'web' && !(await CameraView.isAvailableAsync()))
      throw new Error('No camera is available in this browser.');
    const permission = await Camera.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera access is required to scan a food barcode.');
    barcodeHandled.current = false;
    setScanning(true);
    setScannerOpen(true);
  };
  return (
    <>
      <Sheet
        title={
          existing ? 'Food details' : params.addToRecipeId ? 'Add recipe ingredient' : `Log ${meal}`
        }
        subtitle={
          selected
            ? formatFoodLabel(
                selected.brand ?? (selected.id.startsWith('fs:') ? 'FatSecret' : 'Open Food Facts'),
              )
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
                  setPortionMenuOpen(false);
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
            <NumericField
              label={portionId === 'grams' ? 'Grams' : 'Number of servings'}
              value={quantity}
              onChangeText={setQuantity}
              max={portionId === 'grams' ? INPUT_LIMITS.foodGrams : INPUT_LIMITS.foodServings}
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
                  const count = positiveAtMost(
                    quantity,
                    portionId === 'grams' ? INPUT_LIMITS.foodGrams : INPUT_LIMITS.foodServings,
                    'quantity',
                  );
                  if (!MEALS.includes(meal) || !validDate(date))
                    throw new Error('Choose a valid meal and date.');
                  const snapshot = nutritionFor(selected, portionId, count);
                  if (params.addToRecipeId) {
                    await updateJournal((j) => {
                      const recipe = j.recipes.find((item) => item.id === params.addToRecipeId);
                      if (!recipe) throw new Error('This recipe is no longer available.');
                      recipe.ingredients.push({
                        id: newId(),
                        food: selected,
                        portionId,
                        quantity: count,
                        nutrition: snapshot,
                      });
                      j.foods = [
                        selected,
                        ...j.foods.filter((food) => food.id !== selected.id),
                      ].slice(0, 100);
                    });
                    router.back();
                    return;
                  }
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
              {existing
                ? 'Save changes'
                : params.addToRecipeId
                  ? 'Add ingredient'
                  : `Add to ${meal}`}
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
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Search foods"
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                  placeholder="Try eggs, Greek yogurt, or a brand…"
                  autoCorrect={false}
                  maxLength={INPUT_LIMITS.searchLength}
                />
              </View>
              <View style={{ justifyContent: 'flex-end' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Scan barcode"
                  accessibilityState={{ disabled: scanning, busy: scanning }}
                  disabled={scanning}
                  onPress={() => void action.run(scanBarcode)}
                  style={({ pressed }) => ({
                    width: 50,
                    height: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: C.elevated,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    opacity: scanning ? 0.45 : pressed ? 0.65 : 1,
                  })}
                >
                  {scanning ? (
                    <ActivityIndicator color={C.blue} size="small" />
                  ) : (
                    <Icon name="scan" size={27} color={C.blue} />
                  )}
                </Pressable>
              </View>
            </View>
            {!params.addToRecipeId && (
              <Button
                quiet
                onPress={() => router.push({ pathname: '/recipes', params: { meal, date } })}
              >
                View Recipes
              </Button>
            )}
            {action.busy && <ActivityIndicator color={C.blue} />}
            {action.error && <Notice message={action.error} />}
            {!query && recents.length > 0 && (
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
                              queryFn: ({ signal }) =>
                                api<Food>(`/api/foods/${food.id}`, { signal }),
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
          </>
        )}
        {selected?.id.startsWith('off:') ? (
          <Body>Barcode data from Open Food Facts.</Body>
        ) : (
          <FatSecretAttribution />
        )}
      </Sheet>
      <BarcodeScannerOverlay
        visible={scannerOpen}
        onCancel={() => {
          barcodeHandled.current = false;
          setScannerOpen(false);
          setScanning(false);
        }}
        onScanned={(data) => {
          if (barcodeHandled.current) return;
          barcodeHandled.current = true;
          setScannerOpen(false);
          setScanning(false);
          void action.run(() => selectScannedFood(data));
        }}
        onError={(message) => {
          setScannerOpen(false);
          setScanning(false);
          void action.run(async () => {
            throw new Error(`Could not start the camera: ${message}`);
          });
        }}
      />
    </>
  );
}

function BarcodeScannerOverlay({
  visible,
  onCancel,
  onScanned,
  onError,
}: {
  visible: boolean;
  onCancel: () => void;
  onScanned: (data: string) => void;
  onError: (message: string) => void;
}) {
  const C = useColors();
  const { width } = useWindowDimensions();
  const [scanProgress] = useState(() => new Animated.Value(0));
  const frameWidth = Math.min(Math.max(width - 48, 260), 440);
  const frameHeight = Math.round(frameWidth * 0.62);

  useEffect(() => {
    if (!visible) return;
    scanProgress.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, {
          toValue: 1,
          duration: 1650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanProgress, {
          toValue: 0,
          duration: 1650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scanProgress, visible]);

  if (!visible) return null;
  const translateY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [18, frameHeight - 22],
  });
  return (
    <Modal animationType="fade" presentationStyle="fullScreen" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: '#05070b' }}>
        <CameraView
          style={{ position: 'absolute', inset: 0 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'itf14'] }}
          onBarcodeScanned={({ data }) => onScanned(data)}
          onMountError={({ message }) => onError(message)}
        />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(3, 6, 12, 0.38)' }}
        />
        <View style={{ flex: 1, padding: 24, paddingTop: 64, justifyContent: 'space-between' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ gap: 3 }}>
              <Text style={{ color: '#fff', fontSize: 19, fontWeight: '700' }}>Scan barcode</Text>
              <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>
                Hold the barcode inside the frame
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel barcode scan"
              onPress={onCancel}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(5, 7, 11, 0.64)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.22)',
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Icon name="close" size={22} color="#fff" />
            </Pressable>
          </Row>
          <View style={{ alignItems: 'center' }} pointerEvents="none">
            <View
              style={{
                width: frameWidth,
                height: frameHeight,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.78)',
                overflow: 'hidden',
                backgroundColor: 'rgba(3, 6, 12, 0.1)',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 38,
                  height: 38,
                  borderTopWidth: 4,
                  borderLeftWidth: 4,
                  borderColor: C.blue,
                  borderTopLeftRadius: 17,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 38,
                  height: 38,
                  borderTopWidth: 4,
                  borderRightWidth: 4,
                  borderColor: C.blue,
                  borderTopRightRadius: 17,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: 38,
                  height: 38,
                  borderBottomWidth: 4,
                  borderLeftWidth: 4,
                  borderColor: C.blue,
                  borderBottomLeftRadius: 17,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 38,
                  height: 38,
                  borderBottomWidth: 4,
                  borderRightWidth: 4,
                  borderColor: C.blue,
                  borderBottomRightRadius: 17,
                }}
              />
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 18,
                  right: 18,
                  height: 3,
                  borderRadius: 3,
                  backgroundColor: C.blue,
                  boxShadow: `0 0 14px ${C.blue}`,
                  transform: [{ translateY }],
                }}
              />
            </View>
          </View>
          <View
            style={{
              alignSelf: 'center',
              maxWidth: 390,
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderRadius: 16,
              borderCurve: 'continuous',
              backgroundColor: 'rgba(5, 7, 11, 0.72)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.16)',
            }}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
              Keep the label steady and avoid glare for the quickest match.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
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
          <Text style={{ color: C.text, fontSize: 15, lineHeight: 22 }}>{food.name}</Text>
          {food.brand && <Body>{food.brand}</Body>}
        </View>
        <Icon name="right" size={18} />
      </Row>
    </Pressable>
  );
}
