import type { FamilyData, PlanItem } from './family-types';
import type { MoveData, MoveSession, OasisState, TripPlan } from './move-types';
import { DEFAULT_TRIP_PREFERENCES } from './move-stops';
import { dayKey } from './family-rules';
import { memberVersion } from './family-plan';

export const MOVE_STORAGE_KEY = 'bayti-balance-move-v1';
export function makeOasis(): OasisState {
  return { id: crypto.randomUUID(), childId: '', parentId: '', pieces: 0, turn: 'child', stage: 'setup' };
}
export function createMoveData(): MoveData {
  return {
    gymSetups: {}, weeklyPlans: {}, roundTargets: {}, skipped: [], sessions: [], oasis: makeOasis(),
    rabbitBest: {}, ropeBest: {}, savedSports: [],
    tripPreferences: { ...DEFAULT_TRIP_PREFERENCES, interests: [...DEFAULT_TRIP_PREFERENCES.interests] }, trip: null,
  };
}
export function normalizeMoveData(value: unknown): MoveData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The saved Move data could not be read.');
  const raw = value as Partial<MoveData>;
  for (const field of ['gymSetups', 'weeklyPlans', 'roundTargets', 'rabbitBest', 'ropeBest'] as const) {
    if (raw[field] !== undefined && (!raw[field] || typeof raw[field] !== 'object' || Array.isArray(raw[field]))) {
      throw new Error('The saved Move settings could not be read and have not been overwritten.');
    }
  }
  if (raw.sessions !== undefined && (!Array.isArray(raw.sessions) || raw.sessions.some((session) =>
    !session || typeof session.id !== 'string' || typeof session.memberId !== 'string' || !Number.isFinite(session.reps)))) {
    throw new Error('Saved Move sessions are unreadable and have not been overwritten.');
  }
  const base = createMoveData();
  return {
    ...base, ...raw,
    oasis: { ...base.oasis, ...raw.oasis },
    tripPreferences: { ...base.tripPreferences, ...raw.tripPreferences },
    sessions: raw.sessions ?? [], skipped: Array.isArray(raw.skipped) ? raw.skipped : [],
    savedSports: Array.isArray(raw.savedSports) ? raw.savedSports : [],
  };
}

export function awardMoveSession(data: FamilyData, session: MoveSession): FamilyData {
  const id = `move:${session.id}`;
  if (!data.members.some((member) => member.id === session.memberId) || data.activityLog.some((log) => log.id === id)) return data;
  const day = dayKey(new Date(session.createdAt));
  const key = `${session.memberId}:${day}:${session.exercise ?? session.exerciseId}`;
  const reps = session.reps > 0 && session.exerciseId !== 'mirror-moves' ? { ...data.reps, [key]: (data.reps[key] ?? 0) + session.reps } : data.reps;
  return {
    ...data, reps,
    members: data.members.map((member) => member.id === session.memberId ? { ...member, points: (member.points || 0) + 5 } : member),
    activityLog: [...data.activityLog, {
      id, day, memberId: session.memberId, kind: ['walking', 'nature-walk'].includes(session.exerciseId) ? 'walk' : session.exerciseId === 'mirror-moves' ? 'movement' : 'practice',
      label: session.label, amount: session.reps, demo: session.mode === 'demo',
    }],
  };
}

export function tripToFamily(data: FamilyData, trip: TripPlan): FamilyData {
  let clock = trip.timeOfDay === 'sunset' || trip.weather === 'highHeat' || trip.weather === 'evening' ? 18 * 60 : 14 * 60;
  const previous = new Map(data.timeline.map((item) => [item.id, item]));
  const additions: PlanItem[] = trip.stops.filter((stop) => !stop.optional).map((stop) => {
    const kind = stop.kind === 'meal' ? 'meal' : stop.kind === 'water' ? 'water' :
      stop.kind === 'rest' ? 'recover' : stop.kind === 'walk' ? 'walk' : 'movement';
    const time = `${String(Math.floor(clock / 60) % 24).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
    clock += stop.minutes;
    const id = `trip:${trip.id}:${stop.id}`;
    return {
      id, time, kind, title: stop.name, minutes: stop.minutes, reps: 0, indoor: stop.indoor,
      description: `Demo itinerary estimate: AED ${stop.cost}, ${stop.minutes} min. Confirm access and conditions; travel is not included.`,
      variants: Object.fromEntries(data.members.map((member) => [member.id, memberVersion(member, kind)])),
      completedBy: previous.get(id)?.completedBy ?? [],
    };
  });
  const additionIds = new Set(additions.map((item) => item.id));
  const timeline = [...data.timeline.filter((item) =>
    !additionIds.has(item.id) && (!item.id.startsWith('trip:') || item.completedBy.length > 0)), ...additions]
    .sort((a, b) => a.time.localeCompare(b.time));
  return {
    ...data, timeline, lastPlanReason: 'The saved activity route was added to the family’s shared plan.',
    savedPlaces: [...new Set([...data.savedPlaces, ...trip.stops.filter((stop) => !stop.optional).map((stop) => stop.id)])],
  };
}
