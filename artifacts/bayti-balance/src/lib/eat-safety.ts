import type { Member } from './family-types';
import type { Meal } from './eat-types';

export function canonicalFood(value: string) {
  return value.toLowerCase().replace(/\b(cooked|roasted|leftover|fresh|halal|frozen)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^eggs$/, 'egg').replace(/^chickpeas$/, 'chickpea').replace(/^lentils$/, 'lentil')
    .replace(/^carrots$/, 'carrot').replace(/^tomatoes$/, 'tomato')
    .replace(/\b(peanuts|almonds|cashews|walnuts|pistachios|hazelnuts)\b/g, (word) => word.slice(0, -1));
}
const GROUPS: Record<string, string[]> = {
  dairy: ['yogurt', 'yoghurt', 'milk', 'cheese', 'cream', 'butter'],
  milk: ['yogurt', 'yoghurt', 'milk', 'cheese', 'cream', 'butter'],
  lactose: ['yogurt', 'yoghurt', 'milk', 'cheese', 'cream', 'butter'],
  egg: ['egg', 'mayonnaise'], eggs: ['egg', 'mayonnaise'],
  gluten: ['wheat', 'bread', 'pasta', 'soy sauce', 'flour', 'couscous'],
  wheat: ['wheat', 'bread', 'pasta', 'soy sauce', 'flour', 'couscous'],
  soy: ['soy', 'soya', 'soybean', 'tofu', 'edamame'], soya: ['soy', 'soya', 'soybean', 'tofu', 'edamame'],
  nut: ['nut', 'almond', 'cashew', 'walnut', 'pistachio', 'pecan', 'hazelnut', 'peanut'],
  nuts: ['nut', 'almond', 'cashew', 'walnut', 'pistachio', 'pecan', 'hazelnut', 'peanut'],
  peanut: ['peanut'], 'tree nuts': ['almond', 'cashew', 'walnut', 'pistachio', 'pecan', 'hazelnut'],
  sesame: ['sesame', 'tahini'], fish: ['fish', 'salmon', 'tuna', 'anchovy', 'fish sauce'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'shellfish', 'oyster'],
  legumes: ['chickpea', 'lentil', 'bean', 'peanut', 'soy'],
};
const MEAT = ['chicken', 'beef', 'lamb', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'prawn'];
function matches(food: string, terms: string[]) {
  const normalized = canonicalFood(food);
  return terms.some((term) => new RegExp(`(?:^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:s|es)?(?:\\s|$)`).test(normalized));
}
export function ingredientWarnings(names: string[], members: Member[]): string[] {
  const warnings = new Set<string>();
  for (const member of members) {
    for (const allergy of member.allergies) {
      if (/^(none|no (known )?allergies|not sure)$/i.test(allergy.trim())) continue;
      const key = canonicalFood(allergy).replace(/\b(allergy|allergies|to)\b/g, '').replace(/\s+/g, ' ').trim();
      if (!key) continue;
      const terms = GROUPS[key] ?? [key];
      const found = names.filter((name) => matches(name, terms));
      if (found.length) warnings.add(`${member.name}: ${allergy} allergy — check ${found.join(', ')}. Do not serve without a safe alternative.`);
    }
    for (const restriction of member.restrictions) {
      const rule = restriction.toLowerCase();
      const banned = /vegan/.test(rule) ? [...MEAT, ...GROUPS.dairy, 'egg', 'honey'] :
        /vegetarian|no meat/.test(rule) ? MEAT :
          /dairy.free|lactose.free/.test(rule) ? GROUPS.dairy :
            /gluten.free/.test(rule) ? GROUPS.gluten :
              /no seafood/.test(rule) ? [...GROUPS.fish, ...GROUPS.shellfish] :
                /no pork|halal/.test(rule) ? ['pork', 'bacon', 'ham', 'wine', 'beer', 'alcohol'] : [];
      const found = names.filter((name) => matches(name, banned));
      if (found.length) warnings.add(`${member.name}: ${restriction} — this version includes ${found.join(', ')}.`);
    }
  }
  return [...warnings];
}
export const familyMealWarnings = (meal: Meal, members: Member[]) => ingredientWarnings(meal.ingredients.map((i) => i.name), members);
export function preferenceNotes(meal: Meal, members: Member[]) {
  const names = meal.ingredients.map((i) => canonicalFood(i.name));
  return members.flatMap((member) => {
    const likes = member.foods.filter((food) => names.some((name) => name.includes(canonicalFood(food))));
    return likes.length ? [`${member.name} likes ${likes.join(', ')}.`] : [];
  });
}
export const mealScore = (meal: Meal, members: Member[]) =>
  preferenceNotes(meal, members).length * 10 - familyMealWarnings(meal, members).length * 100;
export function dietaryLabels(names: string[]) {
  const meat = names.some((name) => matches(name, MEAT));
  const animal = names.some((name) => matches(name, [...GROUPS.dairy, 'egg', 'honey']));
  return [
    meat ? 'Contains meat — check sourcing' : animal ? 'Vegetarian ingredients' : 'Plant-based ingredients',
    ...['dairy', 'egg', 'gluten', 'soy', 'sesame', 'nuts'].filter((group) => names.some((name) => matches(name, GROUPS[group]))).map((group) => `Contains ${group}`),
    'Check packaging and cross-contact; these checks are not a safety guarantee.',
  ];
}
