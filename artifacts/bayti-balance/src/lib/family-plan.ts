import type { AdaptationId, FamilyData, FamilySettings, Member, PlanItem, PlanKind, WeatherMode } from './family-types';
import { dayKey } from './family-rules';

export function memberVersion(member: Member, kind: PlanKind): string {
  if (kind === 'water') return 'Take a comfortable water break; follow any personal fluid advice.';
  if (kind === 'meal') {
    const checks = member.allergies.length ? `Check ingredients and labels for ${member.allergies.join(', ')}.` : 'Choose a portion that suits you.';
    const preferences = member.foods.length ? ` Preferences: ${member.foods.join(', ')}.` : '';
    const restrictions = member.restrictions.length ? ` Adapt your portion for: ${member.restrictions.join(', ')}.` : '';
    return `${checks}${preferences}${restrictions}`;
  }
  if (kind === 'recover') return `A quiet, screen-free wind-down; your sleep target is ${member.sleepTarget} hours.`;
  if (kind === 'chore') return member.ageGroup === 'child' ? 'Sort toys or set out napkins with an adult.' :
    member.ageGroup === 'senior' ? 'Try a seated task, such as folding a few towels.' : 'Tidy one small shared space.';
  if (member.ageGroup === 'senior' || member.fitness === 'gentle') {
    return kind === 'walk' ? 'A short, level route at a gentle pace, or a seated movement alternative.' : 'Gentle seated arm movements; no jumping needed.';
  }
  if (member.ageGroup === 'child') return 'Try a playful follow-the-leader version with an adult nearby.';
  return member.fitness === 'active' ? 'Use your comfortable full movement; take breaks whenever you need.' : 'Go at your own pace, with smaller movements whenever you prefer.';
}

function mealName(settings: FamilySettings, pantry?: string[]) {
  if (pantry) return `Pantry dinner: ${pantry.join(', ')}`;
  const cuisine = settings.cuisine || 'Family';
  return `${cuisine} vegetable rice bowls`;
}

export function buildFamilyPlan(members: Member[], settings: FamilySettings, weather: WeatherMode = 'comfortable', day = dayKey()): PlanItem[] {
  const indoor = settings.indoorPref || weather === 'highHeat' || weather === 'dusty';
  const duration = Math.max(10, Math.min(30, Math.round(settings.minutes / 2)));
  const make = (id: string, time: string, title: string, kind: PlanKind, minutes: number, description: string): PlanItem => ({
    id: `${day}:${id}`, time, title, kind, minutes, description,
    reps: kind === 'movement' ? 6 : 0,
    indoor: kind !== 'walk' || indoor,
    variants: Object.fromEntries(members.map((member) => [member.id, memberVersion(member, kind)])),
    completedBy: [],
  });
  return [
    make('water', '08:00', 'Start with a water break', 'water', 5, 'A small pause before the day gets busy.'),
    make('lunch', '12:30', mealName(settings), 'meal', 20, 'One shared meal, with personal portions and ingredient checks.'),
    make('chore', '16:30', 'A ten-minute family tidy', 'chore', 10, 'Choose one small task together.'),
    make('move', indoor ? '17:30' : '18:15', indoor ? 'Indoor family movement' : 'A shared sunset walk',
      indoor ? 'movement' : 'walk', duration, indoor ? 'Make a little room and move together.' : 'Check local conditions before stepping out.'),
    make('dinner', '19:00', 'A simple family dinner', 'meal', 20, 'Use familiar food and check everyone’s allergies.'),
    make('recover', '20:30', 'Screen-free wind-down', 'recover', 15, `Put screens aside and prepare for your ${settings.sleepTarget}-hour sleep target.`),
  ].sort((a, b) => a.time.localeCompare(b.time));
}

const CHANGE_REASONS: Record<AdaptationId, string> = {
  'less-time': 'Every activity now fits a shorter 10-to-15-minute window because you have less time.',
  tired: 'Active items became gentle stretches because someone is feeling tired.',
  indoors: 'Outdoor activities moved indoors so the family can stay comfortable.',
  everyone: 'Every shared activity now includes an explicit child-safe and senior-safe version.',
  water: 'An extra water break was added to give the family a shared pause.',
  pantry: 'Dinner now uses the pantry ingredients your family selected.',
  fun: 'A playful family game round was added to make the plan more fun.',
  easier: 'Activity durations and movement repetitions were reduced to make the day easier.',
};

export function adaptFamilyPlan(data: FamilyData, choice: AdaptationId): FamilyData {
  let timeline = data.timeline;
  if (choice === 'less-time') timeline = timeline.map((item) => ({ ...item, minutes: Math.max(10, Math.min(15, item.minutes)) }));
  if (choice === 'tired') timeline = timeline.map((item) =>
    item.kind === 'walk' || item.kind === 'movement' ? {
      ...item, kind: 'movement', title: 'Gentle family stretching', description: 'Small, unhurried stretches with a seated alternative.',
      reps: 3, indoor: true, variants: Object.fromEntries(data.members.map((m) => [m.id,
        m.ageGroup === 'child' ? 'Reach gently like a growing tree, with an adult.' : 'A gentle seated or standing stretch, without strain.'])),
    } : item);
  if (choice === 'indoors') timeline = timeline.map((item) => ({
    ...item, indoor: true,
    title: item.kind === 'walk' ? 'An indoor family walk' : item.title,
    description: item.kind === 'walk' ? 'Use a clear, level indoor space at your own pace.' : item.description,
  }));
  if (choice === 'everyone') timeline = timeline.map((item) => ({
    ...item,
    description: `${item.description} Child-safe and senior-safe alternatives are included.`,
    variants: Object.fromEntries(data.members.map((m) => [m.id, memberVersion(m, item.kind)])),
  }));
  if (choice === 'water' || choice === 'fun') {
    const water = choice === 'water';
    const kind = water ? 'water' : 'movement';
    const extra: PlanItem = {
      id: `${data.planDate}:${crypto.randomUUID()}`, time: water ? '15:00' : '18:45',
      title: water ? 'An extra family water break' : 'Follow-the-leader game round',
      description: water ? 'Pause together and log the water you choose to drink.' : 'Take turns leading small, comfortable movements.',
      kind, minutes: water ? 5 : 10, reps: water ? 0 : 6, indoor: true, completedBy: [],
      variants: Object.fromEntries(data.members.map((m) => [m.id, memberVersion(m, kind)])),
    };
    timeline = [...timeline, extra].sort((a, b) => a.time.localeCompare(b.time));
  }
  if (choice === 'pantry') {
    const ingredients = data.familySettings.pantryItems.map((item) => item.trim()).filter(Boolean);
    if (!ingredients.length) throw new Error('Choose the ingredients you have at home before adapting dinner.');
    const allergens = data.members.flatMap((member) => member.allergies).filter((allergy) => !/^none$/i.test(allergy));
    const allergyWords: Record<string, string[]> = {
      nuts: ['nut', 'almond', 'cashew', 'walnut'], dairy: ['milk', 'yoghurt', 'yogurt', 'cheese', 'butter', 'cream'],
      eggs: ['egg'], gluten: ['wheat', 'bread', 'pasta', 'flour'], seafood: ['fish', 'prawn', 'shrimp', 'seafood'], sesame: ['sesame', 'tahini'],
    };
    const unsafe = ingredients.filter((ingredient) => allergens.some((allergy) =>
      (allergyWords[allergy.toLowerCase()] ?? [allergy.toLowerCase()]).some((word) => ingredient.toLowerCase().includes(word))));
    if (unsafe.length) throw new Error(`Review these ingredients against your family’s allergies: ${unsafe.join(', ')}.`);
    if (data.members.some((member) => member.restrictions.includes('Vegetarian')) &&
      ingredients.some((ingredient) => /chicken|fish|meat|prawn|shrimp/i.test(ingredient))) {
      throw new Error('Choose a vegetarian shared base, then add separate portions if appropriate.');
    }
    timeline = timeline.map((item) => item.id.endsWith(':dinner') ? {
      ...item, title: mealName(data.familySettings, ingredients),
      description: 'Made from your selected pantry list. Check ingredient labels and allergy suitability before preparing.',
    } : item);
  }
  if (choice === 'easier') timeline = timeline.map((item) => ({
    ...item, minutes: Math.max(5, Math.floor(item.minutes * .65)),
    reps: item.reps ? Math.max(1, Math.floor(item.reps / 2)) : 0,
    description: `${item.description} A shorter, easier version is selected.`,
  }));
  const reason = CHANGE_REASONS[choice];
  return { ...data, timeline, lastPlanReason: reason, planChanges: [...data.planChanges, reason].slice(-100) };
}

export function recordReps(data: FamilyData, exercise: string, reps: number, memberId = data.activeMember): FamilyData {
  if (!Number.isFinite(reps)) return data;
  if (!data.members.some((member) => member.id === memberId)) return data;
  const day = dayKey();
  const count = Math.max(0, Math.floor(reps));
  const key = `${memberId}:${day}:${exercise}`;
  const id = `practice:${key}`;
  const activityLog = data.activityLog.filter((log) => log.id !== id);
  if (count > 0) activityLog.push({ id, day, memberId, kind: 'practice', label: `${exercise} practice`, amount: count, demo: false });
  return { ...data, reps: { ...data.reps, [key]: count }, activityLog };
}

export function recordWater(data: FamilyData, ml: number, memberId = data.activeMember): FamilyData {
  if (!Number.isFinite(ml) || ml <= 0) return data;
  if (!data.members.some((member) => member.id === memberId)) return data;
  const day = dayKey();
  const key = `${memberId}:${day}`;
  const amount = (data.water[key] ?? 0) + Math.round(ml);
  const id = `water:${key}`;
  return {
    ...data, water: { ...data.water, [key]: amount },
    members: data.members.map((member) => member.id === memberId ? { ...member, waterMl: amount } : member),
    activityLog: [...data.activityLog.filter((log) => log.id !== id), {
      id, day, memberId, kind: 'water', label: 'Water logged', amount, demo: false,
    }],
  };
}

export function recordPlanCompletion(data: FamilyData, itemId: string, participants = [data.activeMember]): FamilyData {
  const item = data.timeline.find((entry) => entry.id === itemId);
  if (!item) return data;
  const validIds = new Set(data.members.map((member) => member.id));
  const added = [...new Set(participants)].filter((id) => validIds.has(id) && !item.completedBy.includes(id));
  if (!added.length) return data;
  const timeline = data.timeline.map((entry) => entry.id === itemId ? { ...entry, completedBy: [...entry.completedBy, ...added] } : entry);
  const day = dayKey();
  const activityLog = [...data.activityLog, ...added.map((memberId) => ({
    id: `plan:${item.id}:${memberId}`, day, memberId, kind: item.kind, label: item.title,
    amount: item.minutes, sharedId: item.id, demo: false,
  }))];
  return { ...data, timeline, activityLog, chores: item.kind === 'chore' ? [...new Set([...data.chores, item.id])] : data.chores };
}
