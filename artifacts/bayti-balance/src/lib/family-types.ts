export type AgeGroup = 'child' | 'teen' | 'adult' | 'senior';
export type WeatherMode = 'comfortable' | 'highHeat' | 'dusty' | 'evening';
export type AdaptationId = 'less-time' | 'tired' | 'indoors' | 'everyone' | 'water' | 'pantry' | 'fun' | 'easier';
export type PlanKind = 'movement' | 'walk' | 'water' | 'meal' | 'chore' | 'recover';

export interface Member {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  ageGroup: AgeGroup;
  fitness: 'gentle' | 'moderate' | 'active';
  foods: string[];
  allergies: string[];
  restrictions: string[];
  goal: string;
  sleepTarget: number;
  waterMl: number;
  waterTarget: number;
  points: number;
  streak: number;
  privateCheckins: string[];
  energy: 'low' | 'balanced' | 'bright';
  notes?: string;
}

export interface FamilySettings {
  weeklyGoal: number;
  weeklyGoalType: 'activities' | 'walks';
  cuisine: string;
  budget: number;
  language: string;
  indoorPref: boolean;
  minutes: number;
  sleepTarget: number;
  screenTimeGoal: number;
  pantryItems: string[];
  pantryPhoto?: string;
}

export interface PlanItem {
  id: string;
  time: string;
  title: string;
  description: string;
  kind: PlanKind;
  minutes: number;
  reps: number;
  indoor: boolean;
  variants: Record<string, string>;
  completedBy: string[];
}

export interface ActivityRecord {
  id: string;
  day: string;
  memberId: string;
  kind: PlanKind | 'practice';
  label: string;
  amount: number;
  sharedId?: string;
  demo: boolean;
}

export interface FamilyMessage {
  id: string;
  memberId: string;
  text: string;
  sticker: 'star' | 'heart' | 'sparkles';
  createdAt: string;
  demo: boolean;
}

export interface RecoveryRecord {
  sleepHours: number | null;
  windDown: string[];
}

export interface FamilyData {
  recovery?: Record<string, RecoveryRecord>;
  family: string;
  activeMember: string;
  members: Member[];
  familySettings: FamilySettings;
  reps: Record<string, number>;
  water: Record<string, number>;
  savedMeals: string[];
  savedPlaces: string[];
  chores: string[];
  planChanges: string[];
  joined: boolean;
  preferences: { reminders: boolean; displayName: string };
  weatherOverride: WeatherMode | 'live';
  timeline: PlanItem[];
  planDate: string;
  activityLog: ActivityRecord[];
  messages: FamilyMessage[];
  lastPlanReason: string;
  isSample: boolean;
}

export interface FamilyDraft {
  family: string;
  members: Member[];
  familySettings: FamilySettings;
}

export interface FamilyNeed {
  id: string;
  title: string;
  reason: string;
}

export interface WeatherReading {
  mode: WeatherMode;
  temperature: number;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
}
