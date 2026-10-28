import type { FamilyData, Member, WeatherMode } from './family-types';
import type { CookingStep, WaterRange } from './eat-types';
import { dayKey } from './family-rules';
export const WATER_NOTE = 'Water targets are general estimates. Health conditions may require different guidance from a qualified professional.';
export function afterExercise(family: FamilyData, memberId: string) {
  return family.activityLog.some((log) => log.memberId === memberId && log.day === dayKey() && !log.demo && ['practice', 'movement', 'walk'].includes(log.kind));
}
export function waterRange(member: Member, weather: WeatherMode, exercised = false): WaterRange {
  const child = member.ageGroup === 'child';
  let minMl = child ? 1000 : member.ageGroup === 'teen' ? 1500 : 2000;
  let maxMl = child ? 1500 : member.ageGroup === 'teen' || member.ageGroup === 'senior' ? 2500 : 3000;
  const reasons = [`General ${member.ageGroup} estimate, not a prescription or an amount to drink at once.`];
  if (weather === 'highHeat') {
    minMl += child ? 100 : 250; maxMl += child ? 200 : 500;
    reasons.push('The range is higher in high heat; stay cool and follow individual fluid guidance.');
  }
  if (exercised || member.fitness === 'active') {
    minMl += child ? 100 : 250; maxMl += child ? 200 : 500;
    reasons.push(exercised ? 'A completed movement activity was logged today.' : 'The profile describes an active routine.');
  }
  return { minMl, maxMl, reasons };
}
export function cookingTip(step: CookingStep) {
  return step.role === 'child' ? 'Demo tip: choose washing or arranging cool food, with an adult nearby. Avoid knives, raw meat and heat.' :
    step.role === 'teenager' ? 'Demo tip: measure first and keep the workspace clear. Ask the responsible adult to handle hot tools and sharp knives.' :
      step.role === 'parent' ? 'Demo tip: check allergy labels and keep raw and ready-to-eat foods separate. A timer is not a doneness or food-safety test.' :
        'Demo tip: serve individual, age-appropriate portions and let everyone choose a comfortable pace. Check food safety before sharing.';
}
