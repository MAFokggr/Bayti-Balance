import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adaptFamilyPlan, createInitialData, createSampleData, dateOffset, dayKey, familyGuide,
  getComparisons, getFamilyNeeds, memberProgress, normalizeFamilyData, recognitionFor,
  recordPlanCompletion, recordReps, recordWater, streakFor, sumReps, waterFor, weeklyProgress,
} from './family-data';
import type { WeatherReading } from './family-types';

test('legacy household migration preserves existing exercise and water records', () => {
  const old = createInitialData();
  const today = dayKey();
  const saved = {
    family: 'Existing family', activeMember: 'salem',
    members: old.members.map(({ energy, ...member }) => ({ ...member, sleepTarget: 0 })),
    familySettings: { weeklyGoal: 0, cuisine: '', minutes: 0, budget: 0, language: 'English', indoorPref: false },
    reps: { [`salem:${today}:squat`]: 12, [`noura:${today}:arm raise`]: 6 },
    water: { [`salem:${today}`]: 750 }, savedMeals: ['A saved meal'], planChanges: ['Earlier change'],
  };
  const result = normalizeFamilyData(saved);
  assert.deepEqual(result.reps, saved.reps);
  assert.deepEqual(result.water, saved.water);
  assert.deepEqual(result.savedMeals, saved.savedMeals);
  assert.equal(result.familySettings.minutes, 30);
  assert.equal(result.familySettings.weeklyGoal, 3);
  assert.equal(result.members[0].sleepTarget, 8);
  assert.ok(result.activityLog.some((record) => record.label === 'squat practice'));
  assert.ok(result.timeline.length);
});

test('invalid stored households are rejected instead of silently discarding profiles', () => {
  assert.throws(() => normalizeFamilyData(null));
  assert.throws(() => normalizeFamilyData({ members: [] }));
  assert.throws(() => normalizeFamilyData({ members: [{ id: 'bad' }] }));
});

test('needs map applies senior, child and low screen-time rules', () => {
  const data = createInitialData();
  const needs = getFamilyNeeds(data.members, { ...data.familySettings, screenTimeGoal: 1.5, indoorPref: false, budget: 40, minutes: 15 });
  for (const title of ['More movement', 'Earlier bedtime', 'More water', 'Budget meals', 'Child-friendly food', 'Low-impact exercise', 'Outdoor after sunset', 'More family time']) {
    assert.ok(needs.some((need) => need.title === title), title);
  }
});

test('all eight plan adaptations make the requested change without deleting history', () => {
  const data = recordReps(createInitialData(), 'squat', 3);
  const short = adaptFamilyPlan(data, 'less-time');
  assert.ok(short.timeline.every((item) => item.minutes >= 10 && item.minutes <= 15));
  const tired = adaptFamilyPlan(data, 'tired');
  assert.ok(tired.timeline.filter((item) => item.kind === 'movement').every((item) => /stretch/i.test(item.title)));
  assert.ok(adaptFamilyPlan(data, 'indoors').timeline.every((item) => item.indoor));
  const everyone = adaptFamilyPlan(data, 'everyone');
  assert.ok(everyone.timeline.every((item) => data.members.every((member) => item.variants[member.id])));
  assert.ok(everyone.timeline.every((item) => /child-safe and senior-safe/i.test(item.description)));
  assert.equal(adaptFamilyPlan(data, 'water').timeline.length, data.timeline.length + 1);
  assert.equal(adaptFamilyPlan(data, 'fun').timeline.length, data.timeline.length + 1);
  const pantry = adaptFamilyPlan(data, 'pantry');
  assert.match(pantry.timeline.find((item) => item.id.endsWith(':dinner'))!.title, /rice, tomatoes, chickpeas/);
  const easy = adaptFamilyPlan(data, 'easier');
  assert.ok(easy.timeline.every((item, i) => item.minutes <= data.timeline[i].minutes));
  assert.ok(easy.timeline.some((item, i) => item.reps < data.timeline[i].reps));
  for (const result of [short, tired, everyone, pantry, easy]) {
    assert.deepEqual(result.reps, data.reps);
    assert.deepEqual(result.activityLog, data.activityLog);
    assert.ok(result.lastPlanReason);
    assert.equal(result.planChanges.length, 1);
  }
  assert.equal(data.planChanges.length, 0, 'adapting does not mutate previous state');
});

test('pantry adaptation does not invent ingredients when none were supplied', () => {
  const data = createInitialData();
  data.familySettings.pantryItems = [];
  assert.throws(() => adaptFamilyPlan(data, 'pantry'), /Choose the ingredients/);
});

test('pantry ingredients are checked against common declared allergies and vegetarian restrictions', () => {
  const data = createInitialData();
  data.members[0].allergies = ['Dairy'];
  data.familySettings.pantryItems = ['Rice', 'Yoghurt'];
  assert.throws(() => adaptFamilyPlan(data, 'pantry'), /allergies: Yoghurt/);
  data.members[0].allergies = [];
  data.members[0].restrictions = ['Vegetarian'];
  data.familySettings.pantryItems = ['Rice', 'Chicken'];
  assert.throws(() => adaptFamilyPlan(data, 'pantry'), /vegetarian shared base/);
});

test('a selected weekly budget survives reload and drives the budget needs card', () => {
  const data = createInitialData();
  data.familySettings.budget = 1200;
  assert.equal(normalizeFamilyData(data).familySettings.budget, 1200);
  assert.ok(!getFamilyNeeds(data.members, data.familySettings).some((need) => need.id === 'budget'));
  data.familySettings.budget = 250;
  assert.ok(getFamilyNeeds(data.members, data.familySettings).some((need) => need.id === 'budget'));
});

test('resetting one exercise preserves other movements, members and water', () => {
  let data = recordReps(createInitialData(), 'squat', 9);
  data = recordReps(data, 'arm raise', 2);
  data = recordWater(data, 250);
  data = recordReps({ ...data, activeMember: 'noura' }, 'squat', 6);
  data = recordReps({ ...data, activeMember: 'salem' }, 'squat', 0);
  const today = dayKey();
  assert.equal(data.reps[`salem:${today}:squat`], 0);
  assert.equal(data.reps[`salem:${today}:arm raise`], 2);
  assert.equal(data.reps[`noura:${today}:squat`], 6);
  assert.equal(waterFor(data, 'salem'), 250);
  assert.equal(sumReps(data, 'salem'), 2);
  assert.ok(!data.activityLog.some((log) => log.id === `practice:salem:${today}:squat`));
  assert.equal(recordReps(data, 'squat', NaN), data);
});

test('water logging is scoped to the active member and current day', () => {
  const data = recordWater(recordWater(createInitialData(), 250), 250);
  assert.equal(waterFor(data, 'salem'), 500);
  assert.equal(waterFor(data, 'noura'), 0);
  assert.equal(waterFor(data, 'salem', dateOffset(-1)), 0);
  assert.equal(data.activityLog.filter((log) => log.kind === 'water').length, 1);
});

test('a late camera update remains attributed to its original member after switching', () => {
  const data = { ...createInitialData(), activeMember: 'noura' };
  const updated = recordReps(data, 'squat', 9, 'salem');
  assert.equal(updated.activeMember, 'noura');
  assert.equal(sumReps(updated, 'salem'), 9);
  assert.equal(sumReps(updated, 'noura'), 0);
  assert.equal(recordReps(data, 'squat', 9, 'missing-profile'), data);
});

test('shared completion is idempotent and weekly progress counts activities, not people', () => {
  let data = createInitialData();
  const activity = data.timeline.find((item) => item.kind === 'movement')!;
  data = recordPlanCompletion(data, activity.id, ['khalid', 'salem', 'not-a-member']);
  assert.equal(weeklyProgress(data).done, 1);
  assert.deepEqual(data.timeline.find((item) => item.id === activity.id)!.completedBy, ['khalid', 'salem']);
  assert.equal(recordPlanCompletion(data, activity.id, ['khalid', 'salem']), data);
  assert.ok(memberProgress(data, 'salem').actions > 0);
  assert.equal(memberProgress(data, 'noura').actions, 0);
});

test('walk goal excludes other shared activities', () => {
  let data = createInitialData();
  data.familySettings.weeklyGoalType = 'walks';
  data.familySettings.weeklyGoal = 2;
  data = recordPlanCompletion(data, data.timeline.find((item) => item.kind === 'chore')!.id, ['khalid', 'mariam']);
  assert.equal(weeklyProgress(data).done, 0);
});

test('sample comparisons use dated demo records and recognition is not a ranking', () => {
  const data = createSampleData();
  const comparisons = getComparisons(data, 'salem');
  assert.equal(comparisons[0].before, 2);
  assert.equal(comparisons[0].after, 10);
  assert.equal(comparisons[1].before, 600);
  assert.equal(comparisons[1].after, 1400);
  assert.ok(comparisons.every((comparison) => comparison.hasHistory));
  const praise = data.members.map(recognitionFor);
  assert.equal(new Set(praise).size, data.members.length);
  assert.ok(data.messages.every((message) => message.demo));
  assert.equal(streakFor(data, 'salem'), 3);
  assert.equal(streakFor(createInitialData(), 'salem'), 0);
});

test('guide reacts to weather, Dubai time and available minutes', () => {
  const data = createInitialData();
  const weather: WeatherReading = { mode: 'comfortable', temperature: 26, isDemo: true, loading: false, error: null };
  const morning = new Date('2026-10-28T05:00:00Z');
  const evening = new Date('2026-10-28T18:00:00Z');
  const message = familyGuide(data, weather, morning);
  assert.notEqual(familyGuide(data, weather, evening), message);
  assert.match(familyGuide(data, { ...weather, mode: 'highHeat' }, morning), /indoor/);
  assert.match(familyGuide(data, { ...weather, mode: 'dusty' }, morning), /indoors/);
  assert.match(familyGuide({ ...data, familySettings: { ...data.familySettings, minutes: 15 } }, weather, morning), /15 minutes/);
});
