import type { FamilyData, FamilyNeed, FamilySettings, Member, WeatherReading } from './family-types';

// Keep the date convention used by existing camera records.
export function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function dateOffset(offset: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return dayKey(date);
}

export function getFamilyNeeds(members: Member[], settings: FamilySettings): FamilyNeed[] {
  const needs: FamilyNeed[] = [];
  const add = (id: string, title: string, reason: string) => needs.push({ id, title, reason });
  if (settings.minutes < 30 || members.some((m) => /move|active|fitness/i.test(m.goal))) {
    add('movement', 'More movement', 'Small movement breaks fit the time and goals your family chose.');
  }
  if (settings.screenTimeGoal < 2 || settings.sleepTarget < 8) {
    add('bedtime', 'Earlier bedtime', 'A quieter evening supports your chosen sleep and screen-time goals.');
  }
  if (members.some((m) => m.waterTarget > m.waterMl || /water|hydrat/i.test(m.goal))) {
    add('water', 'More water', 'Your family can build regular water breaks into the shared day.');
  }
  if (settings.budget <= 350 || members.some((m) => m.foods.includes('Budget-friendly'))) {
    add('budget', 'Budget meals', 'Simple ingredients can help meals stay within your weekly food budget.');
  }
  if (members.some((m) => m.ageGroup === 'child')) {
    add('children', 'Child-friendly food', 'You have children in your family, so include familiar, adaptable meals.');
  }
  if (members.some((m) => m.ageGroup === 'senior' || m.fitness === 'gentle')) {
    add('gentle', 'Low-impact exercise', 'A senior or gentle-movement preference calls for seated and low-impact choices.');
  }
  if (!settings.indoorPref) {
    add('sunset', 'Outdoor after sunset', 'Save outdoor time for suitable evening conditions and check the weather first.');
  }
  if (members.length > 1) {
    add('together', 'More family time', 'One shared routine lets different ages join in their own way.');
  }
  return needs;
}

export function sumReps(data: FamilyData, memberId: string, day = dayKey()): number {
  return Object.entries(data.reps).reduce((sum, [key, value]) =>
    key.startsWith(`${memberId}:${day}:`) ? sum + value : sum, 0);
}

export function waterFor(data: FamilyData, memberId: string, day = dayKey()): number {
  return data.water[`${memberId}:${day}`] ?? 0;
}

export function memberProgress(data: FamilyData, memberId: string, day = dayKey()) {
  const activityIds = new Set(data.activityLog
    .filter((log) => log.memberId === memberId && log.day === day && (log.kind !== 'practice' || log.id.startsWith('move:')) && (log.kind !== 'water' || Boolean(log.sharedId)))
    .map((log) => log.sharedId ?? log.id));
  const moveReps = data.activityLog.filter((log) => log.memberId === memberId && log.day === day && log.kind === 'practice' && log.id.startsWith('move:'))
    .reduce((sum, log) => sum + log.amount, 0);
  if (sumReps(data, memberId, day) > moveReps) activityIds.add('practice');
  if (waterFor(data, memberId, day) > 0) activityIds.add('water');
  const actions = activityIds.size;
  const goal = 3;
  return {
    actions, goal, percent: Math.min(100, Math.round(actions / goal * 100)),
    energy: data.members.find((member) => member.id === memberId)?.energy ?? 'balanced',
  };
}

export function streakFor(data: FamilyData, memberId: string): number {
  const days = new Set(data.activityLog.filter((log) => log.memberId === memberId).map((log) => log.day));
  let streak = 0;
  // A streak remains current until the end of a day without an action.
  let offset = days.has(dayKey()) ? 0 : -1;
  while (days.has(dateOffset(offset))) { streak++; offset--; }
  return streak;
}

export function weeklyProgress(data: FamilyData) {
  const now = new Date();
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  now.setUTCDate(now.getUTCDate() - daysSinceMonday);
  const firstDay = dayKey(now);
  const today = dayKey();
  const groups = new Map<string, Set<string>>();
  const memberIds = new Set(data.members.map((member) => member.id));
  for (const log of data.activityLog) {
    if (!log.sharedId || !memberIds.has(log.memberId) || log.day < firstDay || log.day > today) continue;
    if (data.familySettings.weeklyGoalType === 'walks' && log.kind !== 'walk') continue;
    const participants = groups.get(log.sharedId) ?? new Set<string>();
    participants.add(log.memberId);
    groups.set(log.sharedId, participants);
  }
  const requiredParticipants = Math.min(2, data.members.length);
  const done = [...groups.values()].filter((ids) => ids.size >= requiredParticipants).length;
  const target = Math.max(1, data.familySettings.weeklyGoal);
  return {
    done, target, percent: Math.min(100, Math.round(done / target * 100)),
    label: data.familySettings.weeklyGoalType === 'walks' ? 'Walk together twice' : 'Complete three shared activities',
  };
}

const PRAISE = [
  'Your steady steps help everyone get started.',
  'Your thoughtful choices bring the family together.',
  'Your playful energy makes practice more fun.',
  'Your little moments of effort are worth celebrating.',
  'Your gentle consistency shows that every pace belongs.',
  'Your kindness makes the shared routine feel welcoming.',
  'Your curiosity helps the family try something new.',
  'Your encouragement helps everyone feel included.',
];

export function recognitionFor(member: Member, index: number): string {
  return `${member.name}, ${PRAISE[index % PRAISE.length].replace(/^Your/, 'your')}`;
}

export function familyGuide(data: FamilyData, weather: WeatherReading, now: Date): string {
  const minutes = data.familySettings.minutes;
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', hour12: false }).format(now));
  const current = data.members.find((member) => member.id === data.activeMember);
  const gentle = current?.ageGroup === 'senior' || current?.energy === 'low';
  if (current?.ageGroup === 'child') {
    const suggestion = weather.mode === 'highHeat' ? 'Hot outside. Let’s play indoors.' :
      weather.mode === 'dusty' ? 'Dusty outside. Let’s move indoors.' :
        weather.mode === 'evening' || hour >= 17 ? 'Evening time. Try a gentle family walk if conditions feel comfortable.' : 'Let’s move and take a water break.';
    return `${suggestion} We have ${minutes} minutes. ${hour >= 21 ? 'Then it’s time to wind down.' : hour >= 17 ? 'A small evening step counts.' : hour < 12 ? 'A small morning step counts.' : 'A small afternoon step counts.'}`;
  }
  const timeNote = hour >= 21 ? 'Keep the rest of the evening quiet and screen-free.' :
    hour < 12 ? 'Start with a water break, then a small shared activity.' : 'Leave room for a water break and a quieter evening.';
  if (weather.mode === 'highHeat') {
    return `Abu Dhabi is warm today. With ${minutes} minutes available, a short indoor family ${gentle ? 'stretch' : 'game'} is recommended now. A sunset walk may be comfortable later. ${timeNote}`;
  }
  if (weather.mode === 'dusty') {
    return `Dusty conditions are selected. Use your ${minutes} minutes indoors for gentle movement and a family water break. ${timeNote}`;
  }
  if (weather.mode === 'evening' || hour >= 17) {
    return `You have ${minutes} minutes this evening. ${gentle ? 'Try a gentle seated stretch together.' : 'A short shared walk may suit the family if local conditions feel comfortable.'} ${timeNote}`;
  }
  return `With ${minutes} minutes available, ${gentle ? 'a gentle stretch with a seated option' : 'a short family movement break'} fits today. ${timeNote}`;
}

export function getComparisons(data: FamilyData, memberId: string) {
  const jumpDays = new Map<string, number>();
  for (const [key, amount] of Object.entries(data.reps)) {
    const [id, day, exercise] = key.split(':');
    if (id === memberId && exercise === 'jump') jumpDays.set(day, amount);
  }
  const waterDays = new Map<string, number>();
  for (const [key, amount] of Object.entries(data.water)) {
    const [id, day] = key.split(':');
    if (id === memberId) waterDays.set(day, amount);
  }
  return [
    { label: 'Jump practice', unit: 'reps', days: jumpDays },
    { label: 'Water logged', unit: 'ml', days: waterDays },
  ].map(({ label, unit, days }) => {
    const ordered = [...days.entries()].sort(([a], [b]) => a.localeCompare(b));
    return { label, unit, before: ordered[0]?.[1] ?? 0, after: ordered.at(-1)?.[1] ?? 0, hasHistory: ordered.length > 1 };
  });
}
