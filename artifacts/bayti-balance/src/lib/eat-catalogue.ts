import type { CookingStep, Meal, MealAdjustment, MealIngredient, PantryItem, PhotoType } from './eat-types';
import { dietaryLabels } from './eat-safety';

export const CUISINES = ['UAE', 'Chinese', 'Indian', 'Italian', 'Mediterranean', 'Japanese-inspired', 'quick dinner', 'school lunch', 'leftover'];
export const ADJUSTMENTS: MealAdjustment[] = ['quicker', 'more protein', 'less spicy', 'more vegetables', 'use leftovers', 'cheaper', 'child-friendly', 'less salt', 'one-pan', 'air fryer', 'familiar ingredients'];
export const PRICES: Record<string, number> = {
  chicken: 8, rice: 2, carrot: .8, yogurt: 2, cucumber: 1.2, onion: .5, spinach: 1.5,
  egg: 1.3, chickpea: 2, lentil: 1.5, tomato: 1.2, pasta: 3, lemon: .5, bread: 1.5,
  'soy sauce': .5, sesame: 1, chilli: .2,
};
export const ingredient = (name: string, quantity = 1): MealIngredient => ({ name, quantity, unit: 'portion', unitPrice: PRICES[name] ?? 1 });
export function cookingSteps(meal: Pick<Meal, 'id' | 'ingredients' | 'method' | 'prepMinutes' | 'spice' | 'salt'>): CookingStep[] {
  const names = meal.ingredients.map((item) => item.name);
  return [
    { id: `${meal.id}-prepare`, role: 'parent', title: 'Adult prepares the workspace', ingredients: names, timerSeconds: 60, illustration: 'ChefHat',
      instruction: 'Wash hands and prepare clean tools. An adult handles knives and raw proteins, keeps raw foods separate, and checks every label for allergies.' },
    { id: `${meal.id}-wash`, role: 'child', title: 'A small, safe helping task', ingredients: names.filter((n) => /carrot|spinach|cucumber|tomato/.test(n)), timerSeconds: 60, illustration: 'Droplets',
      instruction: 'With adult supervision, wash suitable produce or arrange cool ingredients in a bowl. No sharp knives, raw meat or hot appliances for children.' },
    { id: `${meal.id}-measure`, role: 'teenager', title: 'Measure and mix', ingredients: names, timerSeconds: 120, illustration: 'Scale',
      instruction: 'Measure the planned portions and mix cold ingredients with adult guidance. Leave knives, draining hot water and hot appliances to the responsible adult.' },
    { id: `${meal.id}-cook`, role: 'parent', title: 'Cook with care', ingredients: names, timerSeconds: Math.max(120, (meal.prepMinutes - 5) * 60), illustration: 'CookingPot',
      instruction: `${meal.method}. Use ${meal.spice === 'none' ? 'no chilli' : `${meal.spice} seasoning`} and ${meal.salt.toLowerCase()}. Follow food and appliance directions. Cook raw proteins thoroughly and check safe doneness; a timer cannot prove food is safe. Only reheat safely stored leftovers.` },
    { id: `${meal.id}-share`, role: 'shared', title: 'Make it a family plate', ingredients: names, timerSeconds: 60, illustration: 'Utensils',
      instruction: 'An adult checks doneness and serving temperature. Plate individual portions, use an age-appropriate texture and size for children, and share a calm meal together.' },
  ];
}
function meal(id: string, name: string, cuisine: string, prepMinutes: number, foods: [string, number][], tags: string[], illustration: string): Meal {
  const ingredients = foods.map(([food, q]) => ingredient(food, q));
  const item: Meal = {
    id, name, cuisine, prepMinutes, ingredients, cost: ingredients.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    tags, illustration, familySuitability: 'A shared family recipe with individual portions. Check allergies, preferences and ingredient labels.',
    childOption: 'Offer a mild, deconstructed plate. An adult prepares safe sizes and textures for the child’s age.',
    dietaryInfo: dietaryLabels(ingredients.map((i) => i.name)), leftoverPotential: 'Plan a future portion only if food can be cooled, stored and reheated safely.',
    spice: cuisine === 'Indian' ? 'medium' : 'mild', salt: 'A small optional amount of salt',
    method: id === 'quick-eggs' ? 'One covered pan, with the adult controlling heat' : 'An adult cooks the main ingredients by their packet directions and assembles the meal',
    proteinNote: 'Choose a comfortable family portion; no calorie or medical targets.',
    changes: [], explanations: [], steps: [],
  };
  item.steps = cookingSteps(item);
  return item;
}
export const MEALS: Meal[] = [
  meal('uae-rice', 'Family chicken and rice', 'UAE', 35, [['chicken', 4], ['rice', 2], ['carrot', 2], ['yogurt', 1], ['cucumber', 1], ['onion', 1]], ['leftover'], 'CookingPot'),
  meal('rainbow-rice', 'Rainbow vegetable rice', 'Chinese', 20, [['rice', 2], ['egg', 2], ['carrot', 2], ['spinach', 1], ['onion', 1], ['soy sauce', .5]], ['quick dinner', 'leftover'], 'Carrot'),
  meal('chickpea-curry', 'Gentle chickpea curry', 'Indian', 25, [['chickpea', 3], ['tomato', 2], ['rice', 2], ['onion', 1], ['spinach', 1], ['chilli', .25]], ['leftover'], 'Soup'),
  meal('tomato-pasta', 'Garden tomato pasta', 'Italian', 25, [['pasta', 2], ['tomato', 3], ['spinach', 1], ['onion', 1]], ['quick dinner', 'leftover'], 'Utensils'),
  meal('lemon-bowl', 'Lemon chickpea bowl', 'Mediterranean', 20, [['chickpea', 3], ['cucumber', 2], ['spinach', 2], ['rice', 2], ['lemon', 1]], ['school lunch', 'leftover'], 'Salad'),
  meal('rice-pockets', 'Cucumber rice pockets', 'Japanese-inspired', 25, [['rice', 2], ['cucumber', 2], ['egg', 2], ['yogurt', 1], ['sesame', .2]], ['school lunch'], 'PackageOpen'),
  meal('quick-eggs', 'One-pan tomato eggs', 'quick dinner', 12, [['egg', 4], ['tomato', 3], ['spinach', 1], ['bread', 2]], ['quick dinner'], 'Egg'),
  meal('garden-lunch', 'Garden lunchbox', 'school lunch', 15, [['rice', 1], ['chickpea', 2], ['carrot', 1], ['cucumber', 1], ['yogurt', 1]], ['school lunch', 'leftover'], 'Sandwich'),
];
export function sampleDetection(type: PhotoType): PantryItem[] {
  const foods = type === 'leftovers' ? ['Cooked rice', 'Roasted carrot', 'Cooked chicken', 'Spinach'] :
    ['chicken', 'rice', 'carrot', 'yogurt', 'cucumber', 'onion', 'spinach'];
  return foods.map((name, i) => ({
    id: crypto.randomUUID(), name, quantity: 1, unit: 'portion',
    unitPrice: PRICES[name.toLowerCase().replace(/^(cooked|roasted) /, '')] ?? 1,
    confidence: [.96, .93, .64, .88, .91, .83, .67][i], confirmed: false,
    leftover: type === 'leftovers', expiringSoon: type === 'leftovers', source: 'demo',
  }));
}
export const COOKING_IDEAS = [
  { title: 'More colour', description: 'Add a vegetable your family enjoys, with a suitable texture for children.', icon: 'Carrot' },
  { title: 'Gentle heat', description: 'Try steaming or covered cooking rather than deep frying.', icon: 'CookingPot' },
  { title: 'Salt on the side', description: 'Let adults adjust seasoning individually; follow personal advice.', icon: 'Leaf' },
  { title: 'A simple sauce', description: 'Use lemon, herbs or a suitable plain yogurt alternative; check allergies.', icon: 'Soup' },
  { title: 'Plan leftovers', description: 'Only keep food that can be cooled, stored and reheated safely.', icon: 'PackageOpen' },
  { title: 'Share a task', description: 'Give children a supervised, cool, knife-free task.', icon: 'Users' },
];
