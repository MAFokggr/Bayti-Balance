import type { CookingSession, EatData, Lunchbox, Meal, PantryItem } from './eat-types';
import { MEALS } from './eat-catalogue';
import { canonicalFood, ingredientWarnings } from './eat-safety';
import type { Member } from './family-types';
export const EAT_STORAGE_KEY = 'bayti-balance-eat-v1';
export function createEatData(): EatData {
  return { pantry: [], favorites: [], selectedMealId: MEALS[0].id, adjustments: {}, lunchboxes: [],
    savedLeftovers: [], cooking: {}, hydrationMilestones: {} };
}
export function validatePantryItem(item: PantryItem): PantryItem {
  if (!item.name?.trim() || !item.unit?.trim()) throw new Error('Give the ingredient a name and unit.');
  if (!Number.isFinite(item.quantity) || item.quantity < 0 || item.quantity > 1000) throw new Error('Choose an ingredient quantity between 0 and 1000.');
  if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) throw new Error('Choose a non-negative estimated price.');
  if (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1) throw new Error('The Demo confidence value is invalid. Retry this detection.');
  return { ...item, name: item.name.trim(), unit: item.unit.trim() };
}
export function mergeDetection(pantry: PantryItem[], detected: PantryItem[]) {
  const confirmed = detected.filter((item) => item.confirmed).map(validatePantryItem);
  if (!confirmed.length) throw new Error('Confirm the detected ingredients first, or remove anything incorrect.');
  const next = [...pantry];
  for (const item of confirmed) {
    const index = next.findIndex((existing) => existing.id === item.id ||
      (canonicalFood(existing.name) === canonicalFood(item.name) && existing.unit === item.unit));
    if (index < 0) next.push(item);
    else next[index] = { ...item, id: next[index].id };
  }
  return next;
}
export function normalizeEatData(value: unknown): EatData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The saved Eat data is unreadable.');
  const raw = value as Partial<EatData>;
  const base = createEatData();
  for (const field of ['pantry', 'favorites', 'lunchboxes', 'savedLeftovers'] as const) {
    if (raw[field] !== undefined && !Array.isArray(raw[field])) throw new Error('Saved Eat collections are unreadable.');
  }
  for (const field of ['adjustments', 'cooking', 'hydrationMilestones'] as const) {
    if (raw[field] !== undefined && (!raw[field] || typeof raw[field] !== 'object' || Array.isArray(raw[field]))) throw new Error('Saved Eat settings are unreadable.');
  }
  if (raw.selectedMealId !== undefined && !MEALS.some((meal) => meal.id === raw.selectedMealId)) throw new Error('The saved meal is unavailable. Your data has not been overwritten.');
  const result = { ...base, ...raw };
  result.pantry = result.pantry.map((item) => {
    if (!item || typeof item.id !== 'string') throw new Error('Saved ingredients are unreadable.');
    return validatePantryItem(item);
  });
  for (const meal of [...result.favorites, ...result.savedLeftovers]) {
    if (!meal || !Array.isArray(meal.ingredients) || !Array.isArray(meal.changes) || typeof meal.id !== 'string') throw new Error('Saved recipes are unreadable.');
  }
  for (const session of Object.values(result.cooking)) {
    if (!session?.meal?.steps?.length || !Number.isInteger(session.stepIndex) || session.stepIndex < 0 || session.stepIndex >= session.meal.steps.length) throw new Error('Saved cooking progress is unreadable.');
  }
  return result;
}
export function validateLunchbox(box: Lunchbox, members: Member[]) {
  if (!members.some((member) => member.id === box.memberId)) throw new Error('Choose a current family member for this lunchbox.');
  if (!box.name.trim()) throw new Error('Give your lunchbox a name before saving.');
  if (!Number.isInteger(box.rating) || box.rating < 1 || box.rating > 5) throw new Error('Rate your lunchbox from one to five stars.');
  const foods = Object.values(box.sections).flat();
  if (!foods.length) throw new Error('Add at least one ingredient to the lunchbox.');
  const warnings = ingredientWarnings(foods, members);
  if (warnings.length) throw new Error(warnings.join(' '));
  return { ...box, name: box.name.trim() };
}
export function advanceCookingSession(session: CookingSession, action: 'done' | 'skip' | 'repeat'): CookingSession {
  const step = session.meal.steps[session.stepIndex];
  if (!step) throw new Error('This cooking step is unavailable. Restart the recipe.');
  const statuses = { ...session.statuses };
  if (action === 'repeat') { delete statuses[step.id]; return { ...session, completed: false, statuses }; }
  if (session.completed) return session;
  statuses[step.id] = action === 'skip' ? 'skipped' : 'done';
  const completed = session.stepIndex >= session.meal.steps.length - 1 || session.meal.steps.every((item) => statuses[item.id] === 'done');
  return { ...session, statuses, stepIndex: completed ? session.meal.steps.length - 1 : session.stepIndex + 1, completed };
}
