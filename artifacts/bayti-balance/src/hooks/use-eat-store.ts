import { useCallback, useEffect, useRef, useState } from 'react';
import type { FamilyStore } from './use-family-store';
import type { WeatherMode } from '@/lib/family-types';
import type { CookingSession, EatData, Lunchbox, Meal, MealAdjustment, PantryItem } from '@/lib/eat-types';
import {
  advanceCookingSession, afterExercise, applyMealAdjustments, canonicalFood, createEatData,
  EAT_STORAGE_KEY, familyMealWarnings, favoriteKey, MEALS, mergeDetection, normalizeEatData,
  validateLunchbox, validatePantryItem, waterRange,
} from '@/lib/eat-data';
import { dayKey } from '@/lib/family-data';

function read() {
  try {
    const saved = localStorage.getItem(EAT_STORAGE_KEY);
    return { data: saved ? normalizeEatData(JSON.parse(saved)) : createEatData(), error: null };
  } catch { return { data: createEatData(), error: 'Saved Eat data could not be read and has not been overwritten. Retry storage or explicitly Reset demo from About.' }; }
}
export function useEatStore(family: FamilyStore, weather: WeatherMode) {
  const [initial] = useState(read);
  const [data, setData] = useState<EatData>(initial.data);
  const [storageError, setStorageError] = useState<string | null>(initial.error);
  const blocked = useRef(Boolean(initial.error));
  const syncedNames = useRef(new Set(data.pantry.filter((i) => i.confirmed && i.quantity > 0).map((i) => canonicalFood(i.name))));
  const memberId = family.current.id;
  const day = dayKey();
  const guard = () => { if (blocked.current) throw new Error('Saved Eat data is unreadable. Retry storage or Reset demo before saving changes.'); };
  useEffect(() => {
    if (blocked.current) return;
    try { localStorage.setItem(EAT_STORAGE_KEY, JSON.stringify(data)); setStorageError(null); }
    catch { setStorageError('Eat changes are only in memory because browser storage could not save them. Free some space, then retry.'); }
  }, [data]);
  useEffect(() => {
    if (blocked.current) return;
    const previous = syncedNames.current;
    const names = data.pantry.filter((item) => item.confirmed && item.quantity > 0).map((item) => item.name);
    syncedNames.current = new Set(names.map(canonicalFood));
    family.setData((old) => {
      const next = [...new Set([...old.familySettings.pantryItems.filter((name) => !previous.has(canonicalFood(name))), ...names])];
      if (next.join('|') === old.familySettings.pantryItems.join('|')) return old;
      return { ...old, familySettings: { ...old.familySettings, pantryItems: next } };
    });
  }, [data.pantry, family.setData]);
  useEffect(() => {
    if (blocked.current) return;
    const achieved = family.data.members.filter((member) =>
      (family.data.water[`${member.id}:${day}`] ?? 0) >= waterRange(member, weather, afterExercise(family.data, member.id)).minMl).map((member) => member.id);
    if (!achieved.length) return;
    setData((old) => {
      const previous = old.hydrationMilestones[day] ?? [];
      const next = [...new Set([...previous, ...achieved])];
      return previous.length === next.length ? old : { ...old, hydrationMilestones: { ...old.hydrationMilestones, [day]: next } };
    });
  }, [family.data.water, family.data.members, family.data.activityLog, day, weather]);
  const retryStorage = useCallback(() => {
    try {
      if (blocked.current) {
        const saved = localStorage.getItem(EAT_STORAGE_KEY);
        const restored = saved ? normalizeEatData(JSON.parse(saved)) : createEatData();
        localStorage.setItem(EAT_STORAGE_KEY, JSON.stringify(restored));
        blocked.current = false; setData(restored);
      } else localStorage.setItem(EAT_STORAGE_KEY, JSON.stringify(data));
      setStorageError(null);
    } catch { setStorageError('Eat storage is still unavailable or unreadable. Your current in-memory session remains available.'); }
  }, [data]);
  const setSelectedMeal = (id: string) => {
    guard(); if (!MEALS.some((meal) => meal.id === id)) throw new Error('Choose an available meal.');
    setData((old) => ({ ...old, selectedMealId: id }));
  };
  const setAdjustments = (id: string, choices: MealAdjustment[]) => {
    guard(); setData((old) => ({ ...old, adjustments: { ...old.adjustments, [id]: [...new Set(choices)] } }));
  };
  const selectedMeal = applyMealAdjustments(MEALS.find((meal) => meal.id === data.selectedMealId)!, data.adjustments[data.selectedMealId] ?? [], data.pantry, family.data.members);
  const confirmDetection = (items: PantryItem[]) => {
    guard(); const checked = items.map(validatePantryItem);
    mergeDetection(data.pantry, checked);
    setData((old) => ({ ...old, pantry: mergeDetection(old.pantry, checked) }));
  };
  const addIngredient = (input: Partial<PantryItem> & { name: string }) => {
    guard();
    const item = validatePantryItem({ id: crypto.randomUUID(), quantity: 1, unit: 'portion', unitPrice: 1, confidence: 1, confirmed: true, leftover: false, expiringSoon: false, source: 'manual', ...input });
    setData((old) => ({ ...old, pantry: [...old.pantry, item] }));
  };
  const updateIngredient = (id: string, patch: Partial<PantryItem>) => {
    guard(); const current = data.pantry.find((item) => item.id === id);
    if (!current) throw new Error('This ingredient is no longer in your pantry.');
    const checked = validatePantryItem({ ...current, ...patch, id });
    setData((old) => ({ ...old, pantry: old.pantry.map((item) => item.id === id ? checked : item) }));
  };
  const removeIngredient = (id: string) => { guard(); setData((old) => ({ ...old, pantry: old.pantry.filter((item) => item.id !== id) })); };
  const checkMeal = (meal: Meal) => {
    guard(); const warnings = familyMealWarnings(meal, family.data.members);
    if (warnings.length) throw new Error(warnings.join(' '));
  };
  const saveFavorite = (meal: Meal) => {
    checkMeal(meal); const key = favoriteKey(meal);
    setData((old) => ({ ...old, favorites: [...old.favorites.filter((item) => favoriteKey(item) !== key), structuredClone(meal)] }));
    family.setData((old) => ({ ...old, savedMeals: [...new Set([...old.savedMeals, `eat:${key}`])] }));
  };
  const removeFavorite = (key: string) => {
    guard(); setData((old) => ({ ...old, favorites: old.favorites.filter((item) => favoriteKey(item) !== key) }));
    family.setData((old) => ({ ...old, savedMeals: old.savedMeals.filter((id) => id !== `eat:${key}`) }));
  };
  const saveLeftover = (meal: Meal) => {
    checkMeal(meal); const key = favoriteKey(meal);
    setData((old) => ({ ...old, savedLeftovers: [...old.savedLeftovers.filter((item) => favoriteKey(item) !== key), structuredClone(meal)] }));
  };
  const saveLunchbox = (input: Lunchbox) => {
    guard(); const box = validateLunchbox(input, family.data.members);
    setData((old) => ({ ...old, lunchboxes: [...old.lunchboxes.filter((item) => item.id !== box.id), structuredClone(box)] }));
  };
  const cookingSession = data.cooking[memberId] ?? null;
  const startCooking = (meal: Meal, replace = false) => {
    checkMeal(meal);
    if (cookingSession && !cookingSession.completed && !replace) {
      if (favoriteKey(cookingSession.meal) === favoriteKey(meal)) return;
      throw new Error('There is an unfinished recipe. Resume it or explicitly restart before replacing its progress.');
    }
    const session: CookingSession = { id: crypto.randomUUID(), memberId, meal: structuredClone(meal), stepIndex: 0, statuses: {}, completed: false };
    setData((old) => ({ ...old, cooking: { ...old.cooking, [memberId]: session } }));
  };
  const advanceCooking = (action: 'done' | 'skip' | 'repeat') => {
    guard(); if (!cookingSession) throw new Error('Choose a recipe and start cooking first.');
    checkMeal(cookingSession.meal);
    setData((old) => ({ ...old, cooking: { ...old.cooking, [memberId]: advanceCookingSession(old.cooking[memberId], action) } }));
  };
  const logWater = (id: string, ml: number) => {
    guard();
    if (!family.data.members.some((member) => member.id === id)) throw new Error('Choose a current family member.');
    if (!Number.isInteger(ml) || ml < 1 || ml > 1000) throw new Error('Enter a whole amount from 1 to 1000 ml. Log only what was actually drunk; this is not a drinking challenge.');
    family.addWater(ml, id);
  };
  return {
    data, storageError, retryStorage, selectedMeal, setSelectedMeal, setAdjustments, confirmDetection,
    addIngredient, updateIngredient, removeIngredient, saveFavorite, removeFavorite, saveLeftover,
    saveLunchbox, startCooking, cookingSession, advanceCooking, logWater,
    hydrationIds: (data.hydrationMilestones[day] ?? []).filter((id) => family.data.members.some((member) => member.id === id)),
  };
}
export type EatStore = ReturnType<typeof useEatStore>;
