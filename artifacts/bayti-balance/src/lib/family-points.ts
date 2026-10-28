import type { FamilyData, RecoveryRecord } from './family-types';
import { dayKey } from './family-rules';

export const WIND_DOWN_TASKS = [
  { id: 'screens-away', title: 'Put screens aside', description: 'Choose a short break from screens before resting.' },
  { id: 'settle-space', title: 'Settle your space', description: 'Make your resting space comfortable and prepare for tomorrow.' },
  { id: 'gentle-stretch', title: 'Rest comfortably', description: 'Choose comfortable sitting, gentle movement or quiet rest. Avoid anything uncomfortable.' },
] as const;
export type WellbeingAward = 'meal' | 'recover';
export const awardId = (kind: WellbeingAward, memberId: string, day = dayKey()) => `wellbeing:${kind}:${memberId}:${day}`;
export function awardWellbeing(data: FamilyData, kind: WellbeingAward, memberId: string, day = dayKey()): FamilyData {
  const id = awardId(kind, memberId, day);
  if (!data.members.some((member) => member.id === memberId) || data.activityLog.some((record) => record.id === id)) return data;
  return {
    ...data,
    members: data.members.map((member) => member.id === memberId ? { ...member, points: (member.points || 0) + 5 } : member),
    activityLog: [...data.activityLog, {
      id, day, memberId, kind, label: kind === 'meal' ? 'Cooking completed · +5 points' : 'Wind-down completed · +5 points',
      amount: 1, demo: false,
    }],
  };
}
export function familyLeaderboard(data: FamilyData) {
  const rows = data.members.map((member, index) => ({ member, index, points: Number.isFinite(member.points) ? Math.max(0, member.points) : 0 }))
    .sort((a, b) => b.points - a.points || a.index - b.index);
  let rank = 0;
  return rows.map((row, index) => {
    if (index === 0 || row.points !== rows[index - 1].points) rank = index + 1;
    return { member: row.member, points: row.points, rank };
  });
}
export function recoveryFor(data: FamilyData, memberId: string, day = dayKey()): RecoveryRecord {
  return data.recovery?.[`${memberId}:${day}`] ?? { sleepHours: null, windDown: [] };
}
export function updateRecovery(data: FamilyData, memberId: string, patch: Partial<RecoveryRecord>, day = dayKey()): FamilyData {
  if (!data.members.some((member) => member.id === memberId)) throw new Error('Choose a current family member.');
  if (patch.sleepHours !== undefined && patch.sleepHours !== null &&
      (!Number.isFinite(patch.sleepHours) || patch.sleepHours < 0 || patch.sleepHours > 24 || !Number.isInteger(patch.sleepHours * 4))) {
    throw new Error('Enter hours from 0 to 24 in quarter-hour steps, such as 7.5.');
  }
  if (patch.windDown && patch.windDown.some((id) => !WIND_DOWN_TASKS.some((task) => task.id === id))) throw new Error('Choose one of the listed wind-down steps.');
  const key = `${memberId}:${day}`;
  return { ...data, recovery: { ...data.recovery, [key]: { ...recoveryFor(data, memberId, day), ...patch } } };
}
export function finishRecovery(data: FamilyData, memberId: string, day = dayKey()) {
  if (!WIND_DOWN_TASKS.every((task) => recoveryFor(data, memberId, day).windDown.includes(task.id))) {
    throw new Error('Check all three wind-down steps before finishing. Comfortable quiet rest counts.');
  }
  return awardWellbeing(data, 'recover', memberId, day);
}
