import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ADJUSTMENTS, advanceCookingSession, afterExercise, applyMealAdjustments, createEatData, CUISINES,
  familyMealWarnings, favoriteKey, grocerySummary, ingredientWarnings, leftoverSuggestions, MEALS,
  mergeDetection, normalizeEatData, preferenceNotes, sampleDetection, validateLunchbox, WATER_NOTE, waterRange,
} from './eat-data';
import { createInitialData, dayKey, recordWater } from './family-data';
import type { CookingSession, Lunchbox } from './eat-types';

const members = createInitialData().members;
test('eight complete local meals cover cuisines and provide all cooking roles without an AI service', () => {
  assert.equal(MEALS.length, 8);
  assert.equal(CUISINES.length, 9);
  assert.equal(ADJUSTMENTS.length, 11);
  for (const meal of MEALS) {
    assert.ok(meal.ingredients.length && meal.childOption && meal.leftoverPotential && meal.dietaryInfo.length);
    assert.ok(meal.cost > 0 && meal.prepMinutes > 0);
    assert.deepEqual(new Set(meal.steps.map((step) => step.role)), new Set(['parent', 'child', 'teenager', 'shared']));
  }
});
test('each photo type produces explicit Demo data with low-confidence review and receipt prices', () => {
  for (const type of ['pantry', 'receipt', 'leftovers'] as const) {
    const detected = sampleDetection(type);
    assert.ok(detected.every((item) => item.source === 'demo' && !item.confirmed && item.unitPrice >= 0));
    assert.ok(detected.some((item) => item.confidence < .7));
    assert.ok(detected.every((item) => item.leftover === (type === 'leftovers')));
  }
  assert.deepEqual(sampleDetection('receipt').map((item) => item.name), sampleDetection('pantry').map((item) => item.name));
});
test('confirming a detection is idempotent and a new photo updates matching inventory rather than doubling it', () => {
  const photo = sampleDetection('pantry').map((item) => ({ ...item, confirmed: true }));
  const once = mergeDetection([], photo);
  assert.deepEqual(mergeDetection(once, photo), once);
  const receipt = sampleDetection('receipt').map((item) => ({ ...item, confirmed: true, quantity: 2 }));
  const updated = mergeDetection(once, receipt);
  assert.equal(updated.length, 7);
  assert.equal(updated[0].quantity, 2);
  assert.equal(updated[0].id, once[0].id);
  assert.throws(() => mergeDetection([], sampleDetection('pantry')), /Confirm/);
});
test('profile allergens and vegetarian/vegan restrictions are respected, not assumed from cuisine', () => {
  const dairy = [{ ...members[0], allergies: ['Milk'], restrictions: [] }];
  assert.ok(familyMealWarnings(MEALS[0], dairy).length);
  assert.equal(familyMealWarnings(MEALS.find((meal) => meal.id === 'lemon-bowl')!, dairy).length, 0);
  const vegan = [{ ...members[0], allergies: [], restrictions: ['Vegan'] }];
  assert.ok(familyMealWarnings(MEALS[0], vegan).length);
  assert.equal(familyMealWarnings(MEALS.find((meal) => meal.id === 'chickpea-curry')!, vegan).length, 0);
  const gluten = [{ ...members[0], allergies: ['Gluten allergy'], restrictions: [] }];
  assert.ok(familyMealWarnings(MEALS.find((meal) => meal.id === 'tomato-pasta')!, gluten).length);
  assert.equal(ingredientWarnings(['eggplant'], [{ ...members[0], allergies: ['Egg'], restrictions: [] }]).length, 0);
  assert.ok(ingredientWarnings(['Peanut butter'], [{ ...members[0], allergies: ['Peanuts'], restrictions: [] }]).length);
  assert.ok(preferenceNotes(MEALS[0], [{ ...members[0], foods: ['Rice'] }]).length);
});
test('quicker and cheaper options actually lower time/cost for every base meal and do not mutate the catalogue', () => {
  for (const meal of MEALS) {
    const quicker = applyMealAdjustments(meal, ['quicker'], [], []);
    const cheaper = applyMealAdjustments(meal, ['cheaper'], [], []);
    assert.ok(quicker.prepMinutes < meal.prepMinutes, meal.name);
    assert.ok(cheaper.cost < meal.cost, meal.name);
    assert.equal(meal.changes.length, 0);
    assert.equal(meal.explanations.length, 0);
  }
});
test('cumulative recipe edits update quantities, seasoning, cooking method and steps', () => {
  const base = MEALS.find((meal) => meal.id === 'chickpea-curry')!;
  const result = applyMealAdjustments(base, ['more protein', 'more vegetables', 'less spicy', 'less salt', 'child-friendly', 'one-pan', 'air fryer'], [], members);
  assert.equal(result.spice, 'none');
  assert.ok(result.ingredients.find((item) => item.name === 'chickpea')!.quantity > 3);
  assert.ok(result.ingredients.find((item) => item.name === 'spinach')!.quantity > 1);
  assert.match(result.method, /air.fr/i);
  assert.match(result.salt, /No added salt/);
  assert.equal(result.explanations.length, 7);
  assert.ok(result.steps.find((step) => step.title === 'Cook with care')!.instruction.includes(result.method));
});
test('protein additions avoid a family allergy and familiar-food edits use real profile preferences', () => {
  const restricted = [{ ...members[0], allergies: ['Legumes'], restrictions: [], foods: ['Rice'] }];
  const result = applyMealAdjustments(MEALS[0], ['more protein', 'familiar ingredients'], [], restricted);
  assert.ok(!result.ingredients.some((item) => /chickpea|lentil/.test(item.name)));
  assert.ok(result.ingredients.find((item) => item.name === 'rice')!.quantity > 2);
  assert.ok(!familyMealWarnings(result, restricted).length);
});
test('grocery arithmetic accounts for quantities only when units match and never uses unconfirmed stock', () => {
  const pantry = sampleDetection('pantry').map((item) => ({ ...item, confirmed: true }));
  const rice = pantry.find((item) => item.name === 'rice')!;
  rice.quantity = 1;
  const summary = grocerySummary(MEALS[0], pantry);
  assert.equal(summary.items.find((item) => item.name === 'rice')!.needed, 1);
  assert.ok(summary.total < MEALS[0].cost);
  assert.ok(summary.savings > 0);
  const unconfirmed = grocerySummary(MEALS[0], pantry.map((item) => ({ ...item, confirmed: false })));
  assert.equal(unconfirmed.total, Math.round(MEALS[0].cost * 100) / 100);
  const differentUnit = grocerySummary(MEALS[0], [{ ...rice, unit: 'kg', quantity: 99 }]);
  assert.equal(differentUnit.items.find((item) => item.name === 'rice')!.needed, 2);
});
test('leftovers return three safe suggestions and report potential portions instead of fabricated grams', () => {
  assert.equal(leftoverSuggestions([], members).length, 0);
  const leftovers = sampleDetection('leftovers').map((item) => ({ ...item, confirmed: true }));
  const suggestions = leftoverSuggestions(leftovers, members);
  assert.equal(suggestions.length, 3);
  assert.ok(suggestions.every((suggestion) => suggestion.used.length && suggestion.wasteAvoided > 0 && !familyMealWarnings(suggestion.meal, members).length));
});
test('lunchbox validation requires foods, a name, rating and allergy-compatible ingredients', () => {
  const box: Lunchbox = { id: 'test-box', memberId: members[0].id, name: 'Star garden', shape: 'star', character: 'Rabbit', layout: 'bento', sections: { main: ['rice'], vegetables: ['carrot'] }, rating: 4, createdAt: new Date().toISOString() };
  assert.equal(validateLunchbox(box, members).name, 'Star garden');
  assert.throws(() => validateLunchbox({ ...box, name: '' }, members));
  assert.throws(() => validateLunchbox({ ...box, rating: 0 }, members));
  assert.throws(() => validateLunchbox({ ...box, sections: { main: ['yogurt'] } }, [{ ...members[0], allergies: ['Dairy'] }]));
});
test('cooking repeat/skip/done persist an honest sequence without marking skipped steps done', () => {
  let session: CookingSession = { id: 'cook', memberId: members[0].id, meal: MEALS[0], stepIndex: 0, statuses: {}, completed: false };
  session = advanceCookingSession(session, 'repeat');
  assert.equal(session.stepIndex, 0);
  session = advanceCookingSession(session, 'skip');
  assert.equal(session.statuses[MEALS[0].steps[0].id], 'skipped');
  assert.equal(session.stepIndex, 1);
  while (!session.completed) session = advanceCookingSession(session, 'done');
  assert.equal(session.statuses[MEALS[0].steps[0].id], 'skipped');
  assert.equal(advanceCookingSession(session, 'done'), session);
  assert.equal(advanceCookingSession(session, 'repeat').completed, false);
});
test('water logging can target another bottle without switching profiles or losing earlier movement records', () => {
  const data = createInitialData();
  data.reps[`salem:${dayKey()}:jump`] = 9;
  const result = recordWater(data, 200, 'noura');
  assert.equal(result.activeMember, data.activeMember);
  assert.equal(result.water[`noura:${dayKey()}`], 200);
  assert.equal(result.water[`salem:${dayKey()}`], undefined);
  assert.equal(result.reps[`salem:${dayKey()}:jump`], 9);
  assert.equal(recordWater(result, 200, 'missing-member'), result);
});
test('water ranges depend on age, heat and activity, with mandatory general guidance', () => {
  const child = { ...members[0], ageGroup: 'child' as const, fitness: 'gentle' as const };
  const normal = waterRange(child, 'comfortable');
  const hotActive = waterRange(child, 'highHeat', true);
  assert.deepEqual([normal.minMl, normal.maxMl], [1000, 1500]);
  assert.ok(hotActive.minMl > normal.minMl && hotActive.maxMl > normal.maxMl);
  const adult = waterRange({ ...child, ageGroup: 'adult' }, 'comfortable');
  assert.deepEqual([adult.minMl, adult.maxMl], [2000, 3000]);
  assert.match(WATER_NOTE, /Health conditions may require different guidance from a qualified professional/);
  const data = createInitialData();
  data.activityLog.push({ id: 'demo-exercise', day: dayKey(), memberId: child.id, kind: 'practice', label: 'Demo', amount: 3, demo: true });
  assert.equal(afterExercise(data, child.id), false);
});
test('saved adjusted recipes, pantry and hydration milestones round-trip while corrupt data is rejected', () => {
  const data = createEatData();
  data.favorites = [applyMealAdjustments(MEALS[0], ['quicker', 'less salt'], [], members)];
  data.pantry = sampleDetection('receipt');
  data.hydrationMilestones[dayKey()] = ['salem'];
  const restored = normalizeEatData(JSON.parse(JSON.stringify(data)));
  assert.equal(favoriteKey(restored.favorites[0]), favoriteKey(data.favorites[0]));
  assert.equal(restored.pantry.length, 7);
  assert.deepEqual(restored.hydrationMilestones[dayKey()], ['salem']);
  assert.throws(() => normalizeEatData({ pantry: 'bad' }));
  assert.throws(() => normalizeEatData({ selectedMealId: null }));
});
