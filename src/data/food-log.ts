import { updateJournal } from './journal-store';
import { newId, nutritionFor, validDate } from '@/domain/journal';
import { MEALS, type Food, type Meal } from '@/domain/types';

export async function addDefaultFoods(
  foods: Food[],
  meal: Meal,
  date: string,
  recipeId?: string,
) {
  if (!foods.length) throw new Error('Select at least one food.');
  if (!MEALS.includes(meal) || !validDate(date)) throw new Error('Choose a valid meal and date.');
  await updateJournal((journal) => {
    const selections = foods.map((food) => {
      const portion =
        food.portions.find((item) => item.id === food.defaultPortionId) ??
        food.portions.find((item) => item.id !== 'grams') ??
        food.portions[0];
      if (!portion) throw new Error(`${food.name} does not have a serving.`);
      const quantity = portion.id === 'grams' ? 100 : 1;
      return {
        food,
        portionId: portion.id,
        quantity,
        nutrition: nutritionFor(food, portion.id, quantity),
      };
    });
    if (recipeId) {
      const recipe = journal.recipes.find((item) => item.id === recipeId);
      if (!recipe) throw new Error('This recipe is no longer available.');
      recipe.ingredients.push(
        ...selections.map((selection) => ({ id: newId(), ...selection })),
      );
    } else {
      journal.meals.push(
        ...selections.map((selection) => ({ id: newId(), date, meal, ...selection })),
      );
    }
    journal.foods = [
      ...foods,
      ...journal.foods.filter((saved) => !foods.some((food) => food.id === saved.id)),
    ].slice(0, 100);
  });
}
