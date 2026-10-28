import type { ActivityRecord, FamilyData, FamilySettings, Member, PlanItem, WeatherMode } from './family-types';
import { buildFamilyPlan } from './family-plan';
import { dateOffset, dayKey } from './family-rules';

export const STORAGE_KEY = 'bayti-balance-demo-v1';
const COLORS = ['#78D5C5', '#F59B7A', '#F6D477', '#A9D9B8', '#CDBBEA', '#4877E8'];
const AVATARS = ['sun', 'heart', 'star', 'flower', 'moon', 'leaf'];
export const DEFAULT_SETTINGS: FamilySettings = {
  weeklyGoal: 3, weeklyGoalType: 'activities', cuisine: 'Emirati', budget: 250, language: 'English',
  indoorPref: true, minutes: 30, sleepTarget: 8, screenTimeGoal: 2,
  pantryItems: ['rice', 'tomatoes', 'chickpeas'],
};

export function createMember(index: number): Member {
  return {
    id: `member-${crypto.randomUUID()}`, name: '', role: index === 0 ? 'Parent' : 'Family member',
    avatar: AVATARS[index % AVATARS.length], color: COLORS[index % COLORS.length],
    ageGroup: 'adult', fitness: 'moderate', foods: [], allergies: [], restrictions: [],
    goal: 'Move more', sleepTarget: 8, waterMl: 0, waterTarget: 1500,
    points: 0, streak: 0, privateCheckins: [], energy: 'balanced',
  };
}

function sampleMembers(): Member[] {
  const base = [0, 1, 2, 3, 4].map(createMember);
  return [
    { ...base[0], id: 'khalid', name: 'Khalid', role: 'Dad', goal: 'Move more together', fitness: 'active', foods: ['Home cooking'] },
    { ...base[1], id: 'mariam', name: 'Mariam', role: 'Mum', goal: 'Make time for family', foods: ['Vegetarian options'], energy: 'bright' },
    { ...base[2], id: 'salem', name: 'Salem', role: '9 years old', ageGroup: 'child', goal: 'Make movement fun', waterTarget: 1200, sleepTarget: 9, energy: 'bright' },
    { ...base[3], id: 'noura', name: 'Noura', role: '6 years old', ageGroup: 'child', fitness: 'gentle', goal: 'Try one little step', waterTarget: 1000, sleepTarget: 10 },
    { ...base[4], id: 'fatima', name: 'Jidda Fatima', role: 'Grandmother', ageGroup: 'senior', fitness: 'gentle', goal: 'Enjoy gentle movement', waterTarget: 1400, energy: 'low' },
  ] as Member[];
}

export function createInitialData(): FamilyData {
  const members = sampleMembers();
  const settings = { ...DEFAULT_SETTINGS, pantryItems: [...DEFAULT_SETTINGS.pantryItems] };
  return {
    family: 'Al Mansoori', activeMember: 'salem', members, familySettings: settings,
    reps: {}, water: {}, savedMeals: [], savedPlaces: [], chores: [], planChanges: [],
    joined: false, preferences: { reminders: false, displayName: '' }, weatherOverride: 'live',
    timeline: buildFamilyPlan(members, settings), planDate: dayKey(), activityLog: [], messages: [],
    lastPlanReason: '', isSample: true,
  };
}

export function createSampleData(): FamilyData {
  const data = createInitialData();
  data.joined = true;
  data.activeMember = 'khalid';
  data.weatherOverride = 'comfortable';
  for (const [offset, jumps, water] of [[-2, 2, 600], [-1, 6, 1000], [0, 10, 1400]]) {
    const day = dateOffset(offset);
    data.reps[`salem:${day}:jump`] = jumps;
    data.water[`salem:${day}`] = water;
    data.activityLog.push(
      { id: `practice:salem:${day}:jump`, day, memberId: 'salem', kind: 'practice', label: 'jump practice', amount: jumps, demo: true },
      { id: `water:salem:${day}`, day, memberId: 'salem', kind: 'water', label: 'Water logged', amount: water, demo: true },
    );
  }
  const today = dayKey();
  data.water[`khalid:${today}`] = 750;
  data.water[`mariam:${today}`] = 1000;
  data.reps[`noura:${today}:side step`] = 4;
  data.reps[`fatima:${today}:arm raise`] = 3;
  for (const [memberId, amount] of [['khalid', 750], ['mariam', 1000]] as const) {
    data.activityLog.push({ id: `water:${memberId}:${today}`, day: today, memberId, kind: 'water', label: 'Water logged', amount, demo: true });
  }
  for (const [memberId, exercise, amount] of [['noura', 'side step', 4], ['fatima', 'arm raise', 3]] as const) {
    data.activityLog.push({ id: `practice:${memberId}:${today}:${exercise}`, day: today, memberId, kind: 'practice', label: `${exercise} practice`, amount, demo: true });
  }
  for (const [index, item] of data.timeline.entries()) {
    const ids = index === 0 ? ['khalid', 'mariam'] : item.kind === 'chore' ? ['fatima', 'noura'] : [];
    item.completedBy = ids;
    for (const memberId of ids) data.activityLog.push({
      id: `plan:${item.id}:${memberId}`, day: today, memberId, kind: item.kind,
      label: item.title, amount: item.minutes, sharedId: item.id, demo: true,
    });
  }
  data.members = data.members.map((member) => ({ ...member, waterMl: data.water[`${member.id}:${today}`] ?? 0 }));
  data.messages = [
    { id: 'sample-walk', memberId: 'khalid', text: 'Join me for a walk', sticker: 'star', createdAt: new Date().toISOString(), demo: true },
    { id: 'sample-dinner', memberId: 'mariam', text: 'Dinner is ready', sticker: 'heart', createdAt: new Date().toISOString(), demo: true },
    { id: 'sample-support', memberId: 'fatima', text: 'You can do it', sticker: 'sparkles', createdAt: new Date().toISOString(), demo: true },
  ];
  return data;
}

const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const numberMap = (value: unknown): Record<string, number> => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).filter(([, amount]) => typeof amount === 'number' && Number.isFinite(amount) && amount >= 0))
  : {};
const bounded = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function normalizeFamilyData(value: unknown): FamilyData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Saved family data is not a valid household.');
  const raw = value as Partial<FamilyData>;
  const base = createInitialData();
  if (raw.members !== undefined && (!Array.isArray(raw.members) || !raw.members.length)) throw new Error('Saved family members could not be read.');
  const members = (raw.members ?? base.members).map((member, index) => {
    if (!member || typeof member.id !== 'string' || typeof member.name !== 'string' || !member.name.trim()) {
      throw new Error('A saved family profile is incomplete. Your saved data has not been overwritten.');
    }
    return {
      ...createMember(index), ...member,
      foods: strings(member.foods), allergies: strings(member.allergies), restrictions: strings(member.restrictions),
      privateCheckins: strings(member.privateCheckins), sleepTarget: bounded(member.sleepTarget > 0 ? member.sleepTarget : undefined, 8, 5, 12),
      points: Math.max(0, Math.floor(Number.isFinite(member.points) ? member.points : 0)),
      waterTarget: bounded(member.waterTarget, 1500, 0, 5000) || 1500,
      energy: ['low', 'balanced', 'bright'].includes(member.energy) ? member.energy : 'balanced',
    } as Member;
  });
  const storedSettings = raw.familySettings ?? {} as Partial<FamilySettings>;
  const settings: FamilySettings = {
    ...base.familySettings, ...storedSettings,
    weeklyGoal: bounded((storedSettings.weeklyGoal ?? 0) > 0 ? storedSettings.weeklyGoal : undefined, 3, 1, 20),
    weeklyGoalType: storedSettings.weeklyGoalType === 'walks' ? 'walks' : 'activities',
    minutes: bounded((storedSettings.minutes ?? 0) > 0 ? storedSettings.minutes : undefined, 30, 10, 120),
    sleepTarget: bounded(storedSettings.sleepTarget, 8, 5, 12),
    screenTimeGoal: bounded(storedSettings.screenTimeGoal, 2, .5, 8),
    budget: bounded((storedSettings.budget ?? 0) > 0 ? storedSettings.budget : undefined, 250, 20, 2000),
    pantryItems: storedSettings.pantryItems ? strings(storedSettings.pantryItems) : raw.family === 'Al Mansoori' ? [...DEFAULT_SETTINGS.pantryItems] : [],
  };
  const weatherOverride = ['live', 'comfortable', 'highHeat', 'dusty', 'evening'].includes(raw.weatherOverride ?? '')
    ? raw.weatherOverride! : 'live';
  const reps = numberMap(raw.reps);
  const water = numberMap(raw.water);
  const activityLog: ActivityRecord[] = Array.isArray(raw.activityLog) ? raw.activityLog.filter((log) =>
    log && typeof log.id === 'string' && typeof log.day === 'string' && typeof log.memberId === 'string') : [];
  const logIds = new Set(activityLog.map((log) => log.id));
  for (const [key, amount] of Object.entries(reps)) {
    const [memberId, day, exercise] = key.split(':');
    const id = `practice:${key}`;
    if (amount > 0 && memberId && day && exercise && !logIds.has(id)) {
      activityLog.push({ id, day, memberId, kind: 'practice', label: `${exercise} practice`, amount, demo: false });
      logIds.add(id);
    }
  }
  for (const [key, amount] of Object.entries(water)) {
    const [memberId, day] = key.split(':');
    const id = `water:${key}`;
    if (amount > 0 && memberId && day && !logIds.has(id)) {
      activityLog.push({ id, day, memberId, kind: 'water', label: 'Water logged', amount, demo: false });
      logIds.add(id);
    }
  }
  const timeline = raw.planDate === dayKey() && Array.isArray(raw.timeline) && raw.timeline.length &&
    raw.timeline.every((item: PlanItem) => item && typeof item.id === 'string' && Array.isArray(item.completedBy) && item.variants)
    ? raw.timeline : buildFamilyPlan(members, settings, weatherOverride === 'live' ? 'comfortable' : weatherOverride as WeatherMode);
  const recovery: NonNullable<FamilyData['recovery']> = {};
  if (raw.recovery !== undefined) {
    if (!raw.recovery || typeof raw.recovery !== 'object' || Array.isArray(raw.recovery)) throw new Error('Saved recovery data could not be read. It has not been overwritten.');
    for (const [key, entry] of Object.entries(raw.recovery)) {
      if (!entry || typeof entry !== 'object' || !Array.isArray(entry.windDown) ||
          entry.windDown.some((task) => !['screens-away', 'settle-space', 'gentle-stretch'].includes(task)) ||
          (entry.sleepHours !== null && (!Number.isFinite(entry.sleepHours) || entry.sleepHours < 0 || entry.sleepHours > 24 || !Number.isInteger(entry.sleepHours * 4)))) {
        throw new Error('A saved recovery entry could not be read. It has not been overwritten.');
      }
      recovery[key] = { sleepHours: entry.sleepHours, windDown: [...new Set(entry.windDown)] };
    }
  }
  return {
    ...base, ...raw, members, familySettings: settings, reps, water, activityLog, timeline, recovery,
    family: typeof raw.family === 'string' && raw.family.trim() ? raw.family : base.family,
    activeMember: members.some((member) => member.id === raw.activeMember) ? raw.activeMember! : members[0].id,
    weatherOverride, planDate: dayKey(),
    preferences: { ...base.preferences, ...raw.preferences },
    savedMeals: strings(raw.savedMeals), savedPlaces: strings(raw.savedPlaces), chores: strings(raw.chores), planChanges: strings(raw.planChanges),
    messages: Array.isArray(raw.messages) ? raw.messages.filter((message) => message && typeof message.id === 'string' && typeof message.text === 'string') : [],
    lastPlanReason: typeof raw.lastPlanReason === 'string' ? raw.lastPlanReason : '',
    isSample: typeof raw.isSample === 'boolean' ? raw.isSample : raw.family === 'Al Mansoori',
  };
}
