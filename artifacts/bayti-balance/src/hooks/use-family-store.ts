import { useCallback, useEffect, useRef, useState } from 'react';
import {
  adaptFamilyPlan, buildFamilyPlan, createInitialData, createSampleData, dayKey, DRAFT_STORAGE_KEY,
  normalizeFamilyData, recordPlanCompletion, recordReps, recordWater, STORAGE_KEY,
} from '@/lib/family-data';
import type { AdaptationId, FamilyData, FamilyDraft, FamilyMessage, Member, WeatherMode } from '@/lib/family-types';

function loadStoredFamily() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return { data: saved ? normalizeFamilyData(JSON.parse(saved)) : createInitialData(), error: null, blocked: false };
  } catch (cause) {
    console.error('[Bayti storage] Could not read saved family', cause);
    return {
      data: createInitialData(), blocked: true,
      error: 'Saved family data could not be read. It has not been overwritten. Retry, or use Reset demo to start fresh.',
    };
  }
}

export function useFamilyStore() {
  const [initial] = useState(loadStoredFamily);
  const [data, setData] = useState<FamilyData>(initial.data);
  const [storageError, setStorageError] = useState<string | null>(initial.error);
  const blockedReadRef = useRef(initial.blocked);
  const current = data.members.find((member) => member.id === data.activeMember) ?? data.members[0];

  useEffect(() => {
    if (blockedReadRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError(null);
    } catch (cause) {
      console.error('[Bayti storage] Could not save family', cause);
      setStorageError('Your latest changes are only in memory because this browser could not save them. Free some browser storage, then retry.');
    }
  }, [data]);

  // Roll the shared timeline over without deleting previous activity records.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setData((old) => old.planDate === dayKey() ? old : {
        ...old, planDate: dayKey(), lastPlanReason: '',
        timeline: buildFamilyPlan(old.members, old.familySettings, old.weatherOverride === 'live' ? 'comfortable' : old.weatherOverride),
        members: old.members.map((member) => ({ ...member, waterMl: old.water[`${member.id}:${dayKey()}`] ?? 0 })),
      });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const retryStorage = useCallback(() => {
    try {
      if (blockedReadRef.current) {
        const saved = localStorage.getItem(STORAGE_KEY);
        const restored = saved ? normalizeFamilyData(JSON.parse(saved)) : createInitialData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
        blockedReadRef.current = false;
        setData(restored);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      setStorageError(null);
    } catch (cause) {
      console.error('[Bayti storage] Retry failed', cause);
      setStorageError('Browser storage is still unavailable or the saved file is unreadable. Your in-memory session remains available.');
    }
  }, [data]);

  const selectMember = useCallback((id: string) => setData((old) =>
    old.members.some((member) => member.id === id) ? { ...old, activeMember: id } : old), []);
  const loadSample = useCallback(() => {
    blockedReadRef.current = false;
    setData(createSampleData());
  }, []);
  const resetDemo = useCallback(() => {
    blockedReadRef.current = false;
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* the persistent banner reports storage errors */ }
    setData(createInitialData());
  }, []);
  const saveFamily = useCallback((draft: FamilyDraft) => {
    if (blockedReadRef.current) throw new Error('Your previous family data is unreadable and has not been overwritten. Retry storage or explicitly Reset demo before replacing it.');
    if (!draft.family.trim() || !draft.members.length || draft.members.some((member) => !member.name.trim())) {
      throw new Error('Add the family name and a name for every member before saving.');
    }
    if (new Set(draft.members.map((member) => member.id)).size !== draft.members.length) {
      throw new Error('Each family member needs a separate profile. Return to the member questions and retry.');
    }
    const members = draft.members.map((member) => ({
      ...member, name: member.name.trim(),
      sleepTarget: draft.familySettings.sleepTarget,
    }));
    blockedReadRef.current = false;
    setData((old) => ({
      ...old, family: draft.family.trim(), members, familySettings: { ...draft.familySettings },
      joined: true, isSample: false, activeMember: members[0].id, planDate: dayKey(), lastPlanReason: '',
      timeline: buildFamilyPlan(members, draft.familySettings, old.weatherOverride === 'live' ? 'comfortable' : old.weatherOverride),
      messages: old.messages.filter((message) => members.some((member) => member.id === message.memberId)),
    }));
  }, []);
  // A late camera frame must still belong to the member who started it.
  const updateReps = useCallback((exercise: string, reps: number) =>
    setData((old) => recordReps(old, exercise, reps, data.activeMember)), [data.activeMember]);
  const addWater = useCallback((ml: number) => setData((old) => recordWater(old, ml)), []);
  const completeActivity = useCallback((itemId: string, memberIds?: string[]) =>
    setData((old) => recordPlanCompletion(old, itemId, memberIds)), []);
  const adaptPlan = useCallback((choice: AdaptationId) => {
    // Validate before the state updater so callers can catch and display errors.
    if (choice === 'pantry' && !data.familySettings.pantryItems.length) {
      throw new Error('Choose your pantry ingredients before applying this change.');
    }
    const next = adaptFamilyPlan(data, choice);
    setData(next);
  }, [data]);
  const setWeatherOverride = useCallback((weatherOverride: WeatherMode | 'live') =>
    setData((old) => ({ ...old, weatherOverride })), []);
  const setAvailableMinutes = useCallback((minutes: number) => setData((old) => ({
    ...old, familySettings: { ...old.familySettings, minutes: Math.max(10, Math.min(120, minutes)) },
  })), []);
  const setWeeklyGoal = useCallback((type: 'activities' | 'walks') => setData((old) => ({
    ...old, familySettings: { ...old.familySettings, weeklyGoalType: type, weeklyGoal: type === 'walks' ? 2 : 3 },
  })), []);
  const sendMessage = useCallback((text: string, sticker: FamilyMessage['sticker'], memberId?: string) => setData((old) => {
    const sender = memberId ?? old.activeMember;
    if (!text.trim() || !old.members.some((member) => member.id === sender)) return old;
    return { ...old, messages: [...old.messages, {
      id: crypto.randomUUID(), memberId: sender, text: text.trim().slice(0, 180), sticker,
      createdAt: new Date().toISOString(), demo: true,
    }].slice(-50) };
  }), []);
  const setEnergy = useCallback((memberId: string, energy: Member['energy']) => setData((old) => ({
    ...old, members: old.members.map((member) => member.id === memberId ? { ...member, energy } : member),
  })), []);

  return {
    data, current, setData, storageError, retryStorage, selectMember, loadSample, resetDemo, saveFamily,
    updateReps, addWater, completeActivity, adaptPlan, setWeatherOverride, setAvailableMinutes,
    setWeeklyGoal, sendMessage, setEnergy,
  };
}

export type FamilyStore = ReturnType<typeof useFamilyStore>;
