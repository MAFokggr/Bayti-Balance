import { useCallback, useEffect, useRef, useState } from 'react';
import type { FamilyStore } from './use-family-store';
import type { GymSetup, MoveData, MoveSession, OasisState, TripChange, TripPreferences } from '@/lib/move-types';
import type { WeatherMode } from '@/lib/family-types';
import {
  awardMoveSession, changeTrip as changeTripRule, createMoveData, DEFAULT_GYM_SETUP, EXERCISE_LIBRARY,
  generateTrip, generateWeeklyPlan, lowerRoundTarget, makeOasis, MOVE_STORAGE_KEY, normalizeMoveData, tripToFamily,
} from '@/lib/move-data';
import { dayKey } from '@/lib/family-data';

function read() {
  try {
    const value = localStorage.getItem(MOVE_STORAGE_KEY);
    return { data: value ? normalizeMoveData(JSON.parse(value)) : createMoveData(), error: null };
  } catch {
    return { data: createMoveData(), error: 'Saved Move data could not be read. It has not been overwritten. Retry or explicitly Reset demo from About.' };
  }
}
export function useMoveStore(family: FamilyStore) {
  const [initial] = useState(read);
  const [data, setData] = useState<MoveData>(initial.data);
  const [storageError, setStorageError] = useState<string | null>(initial.error);
  const blocked = useRef(Boolean(initial.error));
  const memberId = family.current.id;
  useEffect(() => {
    if (blocked.current) return;
    try { localStorage.setItem(MOVE_STORAGE_KEY, JSON.stringify(data)); setStorageError(null); }
    catch { setStorageError('Move changes are only in memory because browser storage could not save them. Free space, then retry.'); }
  }, [data]);
  const retryStorage = useCallback(() => {
    try {
      if (blocked.current) {
        const saved = localStorage.getItem(MOVE_STORAGE_KEY);
        const restored = saved ? normalizeMoveData(JSON.parse(saved)) : createMoveData();
        localStorage.setItem(MOVE_STORAGE_KEY, JSON.stringify(restored));
        blocked.current = false; setData(restored);
      } else localStorage.setItem(MOVE_STORAGE_KEY, JSON.stringify(data));
      setStorageError(null);
    } catch { setStorageError('Move storage is still unavailable or unreadable. Your current in-memory session is still available.'); }
  }, [data]);
  const gymSetup = data.gymSetups[memberId] ?? DEFAULT_GYM_SETUP;
  const weeklyPlan = data.weeklyPlans[memberId] ?? [];
  const generateGym = (setup: GymSetup) => {
    const plan = generateWeeklyPlan(setup, family.current);
    setData((old) => ({ ...old, gymSetups: { ...old.gymSetups, [memberId]: setup }, weeklyPlans: { ...old.weeklyPlans, [memberId]: plan } }));
  };
  const replaceExercise = (dayId: string, exerciseId: string, replacementId: string) => {
    const replacement = EXERCISE_LIBRARY.find((item) => item.id === replacementId);
    if (!replacement) throw new Error('Choose an available replacement exercise.');
    if (replacement.equipment !== 'bodyweight' && replacement.equipment !== gymSetup.equipment && gymSetup.equipment !== 'full gym') {
      throw new Error('That replacement needs different equipment. Choose a bodyweight option or change your setup.');
    }
    setData((old) => ({ ...old, weeklyPlans: { ...old.weeklyPlans, [memberId]: (old.weeklyPlans[memberId] ?? []).map((day) =>
      day.id === dayId ? { ...day, exercises: day.exercises.map((item) => item.id === exerciseId ? { ...replacement, sets: item.sets, reps: item.reps } : item) } : day) } }));
  };
  const skipExercise = (dayId: string, exerciseId: string) =>
    setData((old) => ({ ...old, skipped: [...new Set([...old.skipped, `${memberId}:${dayKey()}:${dayId}:${exerciseId}`])] }));
  const recordRound = (exerciseId: string, target: number, completed: number) =>
    setData((old) => ({ ...old, roundTargets: { ...old.roundTargets, [`${memberId}:${exerciseId}`]: lowerRoundTarget(target, completed) } }));
  const saveSession = (input: Omit<MoveSession, 'createdAt' | 'points'>) => {
    if (blocked.current) throw new Error('Move data is unreadable. Retry storage or Reset demo before saving a new session.');
    if (!input.id || !Number.isFinite(input.reps) || input.reps < 0 || !Number.isFinite(input.seconds) || !Number.isFinite(input.target) || input.target < 0 ||
      !family.data.members.some((member) => member.id === input.memberId)) throw new Error('This session needs a valid member, duration and repetition count.');
    const session: MoveSession = {
      ...input, reps: Math.floor(input.reps), seconds: Math.max(0, Math.round(input.seconds)),
      target: Math.max(0, input.target), consistency: Math.max(0, Math.min(100, input.consistency || 0)),
      createdAt: new Date().toISOString(), points: 5,
    };
    setData((old) => old.sessions.some((item) => item.id === session.id) ? old : { ...old, sessions: [...old.sessions, session] });
    family.setData((old) => awardMoveSession(old, session));
  };
  const updateOasis = (patch: Partial<OasisState>) => setData((old) => ({ ...old, oasis: { ...old.oasis, ...patch } }));
  const resetOasis = () => setData((old) => ({ ...old, oasis: makeOasis() }));
  const recordRabbit = (stars: number, hipRise: number) => setData((old) => ({
    ...old, rabbitBest: { ...old.rabbitBest, [memberId]: {
      stars: Math.max(old.rabbitBest[memberId]?.stars ?? 0, stars),
      hipRise: Math.max(old.rabbitBest[memberId]?.hipRise ?? 0, hipRise),
    } },
  }));
  const recordRope = (score: number, speed: 'slow' | 'normal' | 'fast' = 'normal') => setData((old) => ({
    ...old, ropeBest: { ...old.ropeBest, [`${memberId}:${speed}`]: Math.max(old.ropeBest[`${memberId}:${speed}`] ?? 0, score) },
  }));
  const toggleSport = (id: string) => {
    const saved = data.savedSports.includes(id);
    setData((old) => ({ ...old, savedSports: saved ? old.savedSports.filter((item) => item !== id) : [...old.savedSports, id] }));
    family.setData((old) => ({ ...old, savedPlaces: saved ? old.savedPlaces.filter((item) => item !== `sport:${id}`) : [...new Set([...old.savedPlaces, `sport:${id}`])] }));
  };
  const buildTrip = (preferences: TripPreferences, weather: WeatherMode) => {
    const trip = generateTrip(preferences, weather);
    setData((old) => ({ ...old, tripPreferences: preferences, trip }));
  };
  const changeTrip = (action: TripChange, weather: WeatherMode, stopId?: string) => {
    if (!data.trip) throw new Error('Build an itinerary first.');
    const trip = changeTripRule(data.trip, action, data.tripPreferences, weather, stopId);
    setData((old) => ({ ...old, trip }));
  };
  const saveTripToFamily = () => {
    if (!data.trip) throw new Error('Build a route before saving.');
    family.setData((old) => tripToFamily(old, data.trip!));
  };
  return {
    data, setData, storageError, retryStorage, gymSetup, weeklyPlan, generateGym, replaceExercise,
    skipExercise, recordRound, saveSession, updateOasis, resetOasis, recordRabbit, recordRope,
    toggleSport, buildTrip, changeTrip, saveTripToFamily,
  };
}
export type MoveStore = ReturnType<typeof useMoveStore>;
