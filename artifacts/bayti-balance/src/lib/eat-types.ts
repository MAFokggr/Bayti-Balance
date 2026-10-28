import type { WeatherMode, Member } from './family-types';
export type PhotoType = 'pantry' | 'receipt' | 'leftovers';
export interface PantryItem {
  id: string; name: string; quantity: number; unit: string; unitPrice: number;
  confidence: number; confirmed: boolean; leftover: boolean; expiringSoon: boolean;
  source: 'demo' | 'manual';
}
export interface MealIngredient {
  name: string; quantity: number; unit: string; unitPrice: number; leftover?: boolean;
}
export type MealAdjustment = 'quicker' | 'more protein' | 'less spicy' | 'more vegetables' | 'use leftovers' | 'cheaper' | 'child-friendly' | 'less salt' | 'one-pan' | 'air fryer' | 'familiar ingredients';
export interface CookingStep {
  id: string; role: 'parent' | 'child' | 'teenager' | 'shared'; title: string;
  instruction: string; ingredients: string[]; timerSeconds: number; illustration: string;
}
export interface Meal {
  id: string; name: string; cuisine: string; tags: string[]; illustration: string;
  prepMinutes: number; cost: number; ingredients: MealIngredient[];
  familySuitability: string; childOption: string; dietaryInfo: string[]; leftoverPotential: string;
  spice: 'none' | 'mild' | 'medium'; salt: string; method: string; proteinNote: string;
  changes: MealAdjustment[]; explanations: string[]; steps: CookingStep[];
}
export interface GroceryItem { name: string; quantity: number; onHand: number; needed: number; unit: string; cost: number }
export interface GrocerySummary {
  items: GroceryItem[]; total: number; savings: number; onHand: PantryItem[]; closeToExpiry: PantryItem[];
  potentialWasteAvoided: number;
}
export interface LeftoverRecipe {
  id: string; meal: Meal; used: string[]; needed: string[]; wasteAvoided: number; childOption: string;
}
export interface Lunchbox {
  id: string; memberId: string; name: string; shape: 'star' | 'flower' | 'animal' | 'rainbow';
  character: string; layout: 'bento' | 'three-part' | 'picnic'; sections: Record<string, string[]>;
  rating: number; createdAt: string;
}
export interface CookingSession {
  id: string; memberId: string; meal: Meal; stepIndex: number;
  statuses: Record<string, 'done' | 'skipped'>; completed: boolean;
}
export interface EatData {
  pantry: PantryItem[]; favorites: Meal[]; selectedMealId: string;
  adjustments: Record<string, MealAdjustment[]>; lunchboxes: Lunchbox[]; savedLeftovers: Meal[];
  cooking: Record<string, CookingSession>; hydrationMilestones: Record<string, string[]>;
}
export interface WaterRange { minMl: number; maxMl: number; reasons: string[] }
export type EatWeather = WeatherMode;
export type EatMember = Member;
