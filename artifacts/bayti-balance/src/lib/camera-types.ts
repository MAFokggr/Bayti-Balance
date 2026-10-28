export type CameraExercise = 'squat' | 'arm raise' | 'side step' | 'jump' | 'high knees';
export type CoachMode = 'ready' | 'loading' | 'preview' | 'live' | 'paused' | 'error' | 'demo';
export interface CoachMetrics {
  exercise: CameraExercise;
  reps: number;
  elapsedSeconds: number;
  mode: CoachMode;
  phase: string;
  tracking: 'searching' | 'tracking' | 'lost';
  lastJumpRise: number | null;
  previousJumpRise: number | null;
  consistency: number;
}
