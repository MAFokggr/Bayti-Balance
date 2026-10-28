import type { Member } from './family-types';
import type { GrocerySummary, LeftoverRecipe, Meal, MealAdjustment, PantryItem } from './eat-types';
import { ADJUSTMENTS, cookingSteps, ingredient, MEALS } from './eat-catalogue';
import { canonicalFood, dietaryLabels, familyMealWarnings, ingredientWarnings, mealScore } from './eat-safety';

export const favoriteKey = (meal: Meal) => `${meal.id}:${[...meal.changes].sort().join('|')}`;
const usable = (pantry: PantryItem[]) => pantry.filter((item) => item.confirmed && item.quantity > 0);
export function applyMealAdjustments(base: Meal, choices: MealAdjustment[], pantry: PantryItem[], members: Member[]): Meal {
  const meal: Meal = { ...base, ingredients: base.ingredients.map((i) => ({ ...i })), changes: [...new Set(choices)], explanations: [] };
  const notes = meal.explanations;
  const safe = (name: string) => !ingredientWarnings([name], members).length;
  const ordered = ADJUSTMENTS.filter((key) => key !== 'use leftovers' && choices.includes(key));
  if (choices.includes('use leftovers')) ordered.push('use leftovers');
  for (const choice of ordered) {
    if (choice === 'quicker') {
      meal.prepMinutes = Math.max(8, Math.floor(meal.prepMinutes * .65));
      notes.push('Preparation time is shorter by using pre-washed vegetables and cooked grains handled safely; adult cooking and doneness checks still apply.');
    } else if (choice === 'more protein') {
      const protein = ['chickpea', 'lentil', 'chicken', 'egg'].find(safe);
      if (protein) {
        const existing = meal.ingredients.find((i) => canonicalFood(i.name) === protein);
        if (existing) existing.quantity += 1; else meal.ingredients.push(ingredient(protein));
        meal.proteinNote = `An extra portion of ${protein} adds protein variety, without a prescribed target.`;
        notes.push(`Added one portion of ${protein}; estimated cost and ingredient quantities were updated.`);
      } else notes.push('No listed protein addition fits the family restrictions. No unsafe ingredient was added.');
    } else if (choice === 'less spicy') {
      meal.spice = 'none'; meal.ingredients = meal.ingredients.filter((i) => !/chilli|chili/.test(i.name));
      notes.push('Chilli was removed and the recipe is now unspiced; adults can season their own plates.');
    } else if (choice === 'more vegetables') {
      const vegetables = ['carrot', 'spinach'].filter(safe);
      for (const name of vegetables) {
        const existing = meal.ingredients.find((i) => canonicalFood(i.name) === name);
        if (existing) existing.quantity += 1; else meal.ingredients.push(ingredient(name));
      }
      notes.push(vegetables.length ? `Added extra ${vegetables.join(' and ')} portions for more vegetables.` : 'The listed vegetable additions conflict with family restrictions; none were added.');
    } else if (choice === 'use leftovers') {
      const leftovers = usable(pantry).filter((i) => i.leftover && safe(i.name));
      const matched: string[] = [];
      meal.ingredients = meal.ingredients.map((item) => {
        const available = leftovers.find((i) => canonicalFood(i.name) === canonicalFood(item.name) && i.unit === item.unit);
        if (!available) return item;
        matched.push(item.name);
        return { ...item, leftover: true };
      });
      notes.push(matched.length ? `Reuse confirmed ${matched.join(', ')} portions if safely stored. Groceries only include the amount still needed; this is potential waste avoided, not measured waste.` : 'No confirmed, matching, safe leftovers are available. Add and confirm leftovers before reusing them.');
    } else if (choice === 'cheaper') {
      const replacement = meal.ingredients.find((i) => /chicken|egg/.test(canonicalFood(i.name)) && i.unitPrice > 1.5);
      if (replacement && safe('lentil')) {
        const before = replacement.name;
        replacement.name = 'lentil'; replacement.unitPrice = 1.5;
        if (/chicken|eggs?/.test(meal.name.toLowerCase())) meal.name = `${base.cuisine} family lentil plate`;
        notes.push(`${before} was swapped for lentils to reduce the estimated ingredient cost.`);
      } else {
        const vegetable = meal.ingredients.find((i) => /spinach|cucumber|tomato/.test(canonicalFood(i.name)) && i.unitPrice > .8);
        if (vegetable && safe('carrot')) {
          const before = vegetable.name; vegetable.name = 'carrot'; vegetable.unitPrice = .8;
          meal.name = meal.name.replace(new RegExp(before, 'ig'), 'carrot');
          notes.push(`${before} was swapped for carrot to lower the estimated cost.`);
        } else notes.push('No safe cheaper substitution is listed for this version. Costs were not artificially reduced.');
      }
    } else if (choice === 'child-friendly') {
      meal.spice = 'none'; meal.ingredients = meal.ingredients.filter((i) => !/chilli|chili/.test(i.name));
      meal.childOption = 'Serve a mild, deconstructed plate in separate sections. An adult prepares age-appropriate textures and sizes.';
      notes.push('The child’s portion is unspiced and served in separate, familiar sections.');
    } else if (choice === 'less salt') {
      meal.salt = 'No added salt; use lemon or suitable herbs';
      meal.ingredients = meal.ingredients.filter((i) => canonicalFood(i.name) !== 'soy sauce');
      notes.push('Added salt and soy sauce were removed. Lemon or suitable herbs can add flavour.');
    } else if (choice === 'one-pan') {
      meal.method = 'Use one covered pan, adding ingredients in safe cooking order and following grain and protein directions';
      notes.push('The method now uses one covered pan; an adult checks safe cooking and doneness.');
    } else if (choice === 'air fryer') {
      meal.method = 'An adult air-fries suitable vegetables or proteins following appliance and food directions; grains are cooked separately';
      notes.push('Suitable components move to the air fryer; grains still need separate cooking. This replaces one-pan mode if both were selected.');
    } else if (choice === 'familiar ingredients') {
      const liked = [...new Set(members.flatMap((member) => member.foods.map(canonicalFood)))].filter(safe);
      const choice = liked.find((name) => ['carrot', 'cucumber', 'rice', 'spinach', 'chickpea'].includes(name));
      if (choice) {
        const existing = meal.ingredients.find((i) => canonicalFood(i.name) === choice);
        if (existing) existing.quantity += .5; else meal.ingredients.push(ingredient(choice));
        notes.push(`Added a little more ${choice}, which appears in the family’s preferences.`);
      } else notes.push('No safe, listed preferred ingredient was found. The recipe stays unchanged rather than assuming a cuisine or preference.');
    }
  }
  const merged = new Map<string, typeof meal.ingredients[number]>();
  for (const item of meal.ingredients) {
    const key = `${canonicalFood(item.name)}:${item.unit}`;
    const previous = merged.get(key);
    merged.set(key, previous ? { ...previous, quantity: previous.quantity + item.quantity, leftover: previous.leftover || item.leftover } : { ...item });
  }
  meal.ingredients = [...merged.values()];
  meal.cost = Math.round(meal.ingredients.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) * 100) / 100;
  meal.dietaryInfo = dietaryLabels(meal.ingredients.map((i) => i.name));
  meal.steps = cookingSteps(meal);
  return meal;
}

export function grocerySummary(meal: Meal, pantry: PantryItem[]): GrocerySummary {
  const confirmed = usable(pantry);
  const merged = new Map<string, { name: string; quantity: number; unit: string; price: number }>();
  for (const item of meal.ingredients) {
    const key = `${canonicalFood(item.name)}:${item.unit}`;
    const previous = merged.get(key);
    merged.set(key, { name: item.name, quantity: item.quantity + (previous?.quantity ?? 0), unit: item.unit, price: item.unitPrice });
  }
  const items = [...merged.values()].map((item) => {
    const onHand = confirmed.filter((p) => canonicalFood(p.name) === canonicalFood(item.name) && p.unit === item.unit).reduce((sum, p) => sum + p.quantity, 0);
    const needed = Math.max(0, item.quantity - onHand);
    return { name: item.name, quantity: item.quantity, onHand: Math.min(onHand, item.quantity), needed, unit: item.unit, cost: Math.round(needed * item.price * 100) / 100 };
  });
  const total = Math.round(items.reduce((sum, item) => sum + item.cost, 0) * 100) / 100;
  return {
    items, total, savings: Math.max(0, Math.round((meal.cost - total) * 100) / 100),
    onHand: confirmed, closeToExpiry: confirmed.filter((p) => p.expiringSoon),
    potentialWasteAvoided: items.reduce((sum, item) => sum + Math.min(item.quantity, confirmed.filter((p) => p.leftover && canonicalFood(p.name) === canonicalFood(item.name) && p.unit === item.unit).reduce((n, p) => n + p.quantity, 0)), 0),
  };
}
export function leftoverSuggestions(pantry: PantryItem[], members: Member[]): LeftoverRecipe[] {
  if (!usable(pantry).some((item) => item.leftover)) return [];
  return MEALS.map((base) => applyMealAdjustments(base, ['use leftovers', 'child-friendly'], pantry, members))
    .filter((meal) => !familyMealWarnings(meal, members).length)
    .map((meal) => {
      const groceries = grocerySummary(meal, pantry);
      return { id: `leftover-${meal.id}`, meal, used: groceries.items.filter((i) => i.onHand > 0).map((i) => i.name),
        needed: groceries.items.filter((i) => i.needed > 0).map((i) => i.name),
        wasteAvoided: groceries.potentialWasteAvoided, childOption: meal.childOption };
    }).filter((recipe) => recipe.wasteAvoided > 0)
    .sort((a, b) => b.wasteAvoided - a.wasteAvoided || mealScore(b.meal, members) - mealScore(a.meal, members)).slice(0, 3);
}
