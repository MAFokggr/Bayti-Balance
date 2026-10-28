import type { CameraExercise } from './camera-types';
import type { WeatherMode } from './family-types';
export type { CameraExercise, CoachMetrics } from './camera-types';
export type GymLevel = 'starting out' | 'beginner' | 'intermediate';
export type Equipment = 'bodyweight' | 'dumbbells' | 'bands' | 'full gym';
export interface GymSetup { level: GymLevel; days: 2 | 3 | 4 | 5; equipment: Equipment }
export interface GymExercise {
  id: string; name: string; group: 'Upper' | 'Lower' | 'Full Body' | 'Cardio' | 'Mobility';
  equipment: Equipment; cameraExercise?: CameraExercise; sets: number; reps: number;
  restSeconds: number; mistake: string; easier: string; harder: string; weightGuidance: string;
}
export interface GymDay {
  id: string; day: string; title: string; optional: boolean;
  warmUp: string[]; exercises: GymExercise[]; coolDown: string[]; hydration: string;
}
export interface MoveSession {
  id: string; memberId: string; exerciseId: string; label: string;
  exercise?: CameraExercise; reps: number; target: number; seconds: number; consistency: number;
  mode: 'live' | 'demo' | 'manual'; createdAt: string; points: number;
}
export interface OasisState {
  id: string; childId: string; parentId: string; pieces: number; turn: 'child' | 'parent';
  stage: 'setup' | 'child' | 'parent' | 'handoff' | 'opened';
}
export type Interest = 'nature' | 'sport' | 'food' | 'culture' | 'play';
export interface TripPreferences {
  budget: number; interests: Interest[]; location: 'any' | 'indoor' | 'outdoor';
  accessible: boolean; minutes: number; timeOfDay: 'daytime' | 'sunset';
}
export interface ActivityStop {
  id: string; name: string; lat: number; lng: number; distanceKm: number;
  minutes: number; cost: number; indoor: boolean; heatSuitable: boolean; accessible: boolean;
  familySuitability: string; interests: Interest[]; illustration: string; description: string;
}
export interface TripStop extends ActivityStop {
  kind: 'walk' | 'activity' | 'meal' | 'water' | 'rest' | 'alternative';
  optional?: boolean;
}
export interface TripPlan {
  id: string; stops: TripStop[]; cost: number; minutes: number;
  weather: WeatherMode; explanations: string[]; createdAt: string; timeOfDay?: 'daytime' | 'sunset';
}
export type TripChange = 'add' | 'remove' | 'cheaper' | 'less-walking' | 'rest' | 'water' | 'indoor';
export interface Sport {
  id: string; name: string; indoor: boolean; difficulty: string; minutes: number;
  equipment: string[]; checklist: string[]; weather: string;
}
export interface MoveData {
  gymSetups: Record<string, GymSetup>; weeklyPlans: Record<string, GymDay[]>;
  roundTargets: Record<string, number>; skipped: string[]; sessions: MoveSession[];
  oasis: OasisState; rabbitBest: Record<string, { stars: number; hipRise: number }>;
  ropeBest: Record<string, number>; savedSports: string[];
  tripPreferences: TripPreferences; trip: TripPlan | null;
}
