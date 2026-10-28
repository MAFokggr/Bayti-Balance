import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ACTIVITY_STOPS, awardMoveSession, changeTrip, createMoveData, DEFAULT_TRIP_PREFERENCES,
  generateTrip, generateWeeklyPlan, lowerRoundTarget, makeOasis, normalizeMoveData, parentExercise,
  ropeAtBottom, ropePeriod, tripToFamily, walkingNote, weekendPlan,
} from './move-data';
import { createInitialData, dayKey, memberProgress, normalizeFamilyData } from './family-data';
import type { MoveSession, TripPreferences } from './move-types';

test('weekly plans honor training days, equipment, recovery and gentle preferences', () => {
  const member = createInitialData().members[0];
  for (const days of [2, 3, 4, 5] as const) {
    const plan = generateWeeklyPlan({ level: 'beginner', days, equipment: 'bodyweight' }, member);
    assert.equal(plan.length, 7);
    assert.equal(plan.filter((day) => !day.optional && day.title !== 'Recovery').length, days);
    assert.ok(plan.filter((day) => day.title === 'Recovery').every((day) => day.exercises.length === 0));
    assert.ok(plan.every((day) => day.warmUp.length && day.coolDown.length && day.hydration));
    assert.ok(plan.flatMap((day) => day.exercises).every((item) => item.equipment === 'bodyweight'));
  }
  const gentle = createInitialData().members.find((m) => m.ageGroup === 'senior')!;
  const plan = generateWeeklyPlan({ level: 'intermediate', days: 3, equipment: 'bodyweight' }, gentle);
  assert.ok(plan.flatMap((day) => day.exercises).every((exercise) => exercise.reps === 5));
  assert.ok(!plan.flatMap((day) => day.exercises).some((exercise) => exercise.cameraExercise === 'squat'));
  assert.equal(parentExercise(gentle), 'arm raise');
  assert.equal(parentExercise({ ...member, fitness: 'moderate' }), 'side step');
  assert.equal(parentExercise({ ...member, fitness: 'active' }), 'squat');
});

test('short rounds lower the next target about 20 percent without punishing complete rounds', () => {
  assert.equal(lowerRoundTarget(10, 6), 8);
  assert.equal(lowerRoundTarget(10, 10), 10);
  assert.equal(lowerRoundTarget(5, 2), 4);
  assert.equal(lowerRoundTarget(1, 0), 1);
});

test('session awards are exactly once, member-scoped and preserve existing camera reps', () => {
  let family = createInitialData();
  const day = dayKey();
  family.reps[`salem:${day}:squat`] = 9;
  const session: MoveSession = {
    id: 'unique-session', memberId: 'salem', exerciseId: 'squat', exercise: 'squat', label: 'Squat practice',
    reps: 5, target: 5, seconds: 20, consistency: 80, mode: 'demo', createdAt: new Date().toISOString(), points: 5,
  };
  const result = awardMoveSession(family, session);
  assert.equal(result.members.find((m) => m.id === 'salem')!.points, 5);
  assert.equal(result.members.find((m) => m.id === 'noura')!.points, 0);
  assert.equal(result.reps[`salem:${day}:squat`], 14);
  assert.equal(awardMoveSession(result, session), result);
  assert.ok(result.activityLog.some((log) => log.id === 'move:unique-session' && log.demo));
  assert.equal(memberProgress(result, 'salem').actions, 2, 'legacy practice plus one finished Move activity');
  const onlyMove = awardMoveSession(createInitialData(), session);
  assert.equal(memberProgress(onlyMove, 'salem').actions, 1);
  assert.equal(memberProgress(normalizeFamilyData(onlyMove), 'salem').actions, 1, 'reload does not double count');
});

test('a zero-rep finished walking session still records effort and five encouragement points', () => {
  const family = createInitialData();
  const result = awardMoveSession(family, {
    id: 'walk-session', memberId: 'salem', exerciseId: 'nature-walk', label: 'Nature walk', reps: 0, target: 0,
    seconds: 60, consistency: 0, mode: 'demo', createdAt: new Date().toISOString(), points: 5,
  });
  assert.equal(memberProgress(result, 'salem').actions, 1);
  assert.equal(result.activityLog[0].kind, 'walk');
  assert.equal(result.members.find((m) => m.id === 'salem')!.points, 5);
  assert.deepEqual(result.reps, {});
});

test('catalogue has all twelve illustrative Abu Dhabi stops and useful planning fields', () => {
  assert.equal(ACTIVITY_STOPS.length, 12);
  assert.equal(new Set(ACTIVITY_STOPS.map((stop) => stop.id)).size, 12);
  assert.ok(ACTIVITY_STOPS.every((stop) => stop.description && stop.illustration && Number.isFinite(stop.lat) && Number.isFinite(stop.lng) && stop.minutes > 0));
});

test('route generation uses indoor stops in heat during daytime and in dust even at sunset', () => {
  for (const [weather, timeOfDay] of [['highHeat', 'daytime'], ['dusty', 'sunset']] as const) {
    const preferences = { ...DEFAULT_TRIP_PREFERENCES, timeOfDay };
    const plan = generateTrip(preferences, weather);
    assert.ok(plan.stops.every((stop) => stop.indoor));
    assert.ok(plan.explanations.some((text) => /indoor/i.test(text)));
    assert.ok(plan.cost <= preferences.budget);
    assert.ok(plan.minutes <= preferences.minutes);
    assert.ok(plan.stops.some((stop) => stop.kind === 'alternative' && stop.optional));
  }
});

test('small budgets keep a cafe optional rather than claiming a paid restaurant is free', () => {
  const preferences: TripPreferences = { ...DEFAULT_TRIP_PREFERENCES, budget: 0, location: 'outdoor', timeOfDay: 'sunset', minutes: 30 };
  const plan = generateTrip(preferences, 'comfortable');
  const cafe = plan.stops.find((stop) => stop.kind === 'meal')!;
  assert.equal(cafe.cost, 25);
  assert.equal(cafe.optional, true);
  assert.equal(plan.cost, 0);
  assert.ok(plan.minutes <= 30);
  assert.throws(() => generateTrip({ ...preferences, location: 'indoor' }, 'dusty'), /No suitable stop/);
});

test('all route controls change itinerary or provide a concrete explanation', () => {
  const preferences = { ...DEFAULT_TRIP_PREFERENCES, minutes: 240, budget: 300, accessible: false };
  const original = generateTrip(preferences, 'comfortable');
  const water = changeTrip(original, 'water', preferences, 'comfortable');
  assert.equal(water.stops.length, original.stops.length + 1);
  const rest = changeTrip(original, 'rest', preferences, 'comfortable');
  assert.equal(rest.stops.length, original.stops.length + 1);
  const short = changeTrip(original, 'less-walking', preferences, 'comfortable');
  assert.ok(short.minutes < original.minutes);
  const cheap = changeTrip(original, 'cheaper', preferences, 'comfortable');
  assert.ok(cheap.cost < original.cost);
  const indoors = changeTrip(original, 'indoor', preferences, 'comfortable');
  assert.ok(indoors.stops.every((stop) => stop.indoor));
  const added = changeTrip(original, 'add', preferences, 'comfortable', 'boat');
  assert.ok(added.stops.some((stop) => stop.id === 'boat'));
  const removed = changeTrip(added, 'remove', preferences, 'comfortable', 'boat');
  assert.ok(!removed.stops.some((stop) => stop.id === 'boat'));
  for (const plan of [water, rest, short, cheap, indoors, added, removed]) assert.ok(plan.explanations.length > original.explanations.length);
  assert.equal(weekendPlan(original).length, 7);
});

test('saving an itinerary is idempotent, visible on shared timeline and preserves earlier progress', () => {
  const family = createInitialData();
  family.reps[`salem:${dayKey()}:jump`] = 9;
  const trip = generateTrip(DEFAULT_TRIP_PREFERENCES, 'comfortable');
  const saved = tripToFamily(family, trip);
  const repeated = tripToFamily(saved, trip);
  assert.equal(repeated.timeline.length, saved.timeline.length);
  assert.deepEqual(repeated.reps, family.reps);
  assert.ok(saved.timeline.some((item) => item.id.startsWith('trip:') && item.time.startsWith('18:')));
  assert.ok(saved.timeline.filter((item) => item.id.startsWith('trip:')).every((item) => item.completedBy.length === 0 && Object.keys(item.variants).length === family.members.length));
});

test('edits to an old route also enforce newly unsafe weather', () => {
  const preferences = { ...DEFAULT_TRIP_PREFERENCES, timeOfDay: 'daytime' as const };
  const oldRoute = generateTrip(preferences, 'comfortable');
  assert.ok(oldRoute.stops.some((stop) => !stop.indoor));
  const updated = changeTrip(oldRoute, 'water', preferences, 'dusty');
  assert.ok(updated.stops.every((stop) => stop.indoor));
  assert.ok(updated.explanations.some((text) => /indoor/i.test(text)));
});

test('timed Mirror Moves rounds do not invent camera repetition measurements', () => {
  const result = awardMoveSession(createInitialData(), {
    id: 'mirror-session', memberId: 'salem', exerciseId: 'mirror-moves', label: 'Mirror Moves', reps: 2, target: 2,
    seconds: 20, consistency: 0, mode: 'manual', createdAt: new Date().toISOString(), points: 5,
  });
  assert.deepEqual(result.reps, {});
  assert.equal(memberProgress(result, 'salem').actions, 1);
});

test('rope success window matches each mode period and weather notes change', () => {
  for (const speed of ['slow', 'normal', 'fast'] as const) {
    assert.equal(ropeAtBottom(ropePeriod(speed) * .8, speed), true);
    assert.equal(ropeAtBottom(ropePeriod(speed) * .2, speed), false);
    assert.equal(ropeAtBottom(ropePeriod(speed) * 1.8, speed), true);
  }
  assert.notEqual(walkingNote(5, 'highHeat'), walkingNote(5, 'comfortable'));
  assert.match(walkingNote(25, 'comfortable'), /Water break in 2 minutes/);
});

test('move defaults have no invented sessions and invalid saved data is rejected', () => {
  const data = createMoveData();
  assert.equal(data.sessions.length, 0);
  assert.equal(makeOasis().pieces, 0);
  assert.deepEqual(normalizeMoveData(data).ropeBest, {});
  assert.throws(() => normalizeMoveData({ sessions: [{}] }));
  assert.throws(() => normalizeMoveData({ gymSetups: null }));
});
