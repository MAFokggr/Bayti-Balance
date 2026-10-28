import type { Member, WeatherMode } from './family-types';
import type { CameraExercise } from './camera-types';
import type { GymExercise, GymSetup, GymDay, Sport } from './move-types';

export const DEFAULT_GYM_SETUP: GymSetup = { level: 'starting out', days: 3, equipment: 'bodyweight' };
const exercise = (id: string, name: string, group: GymExercise['group'], equipment: GymExercise['equipment'],
  cameraExercise: CameraExercise | undefined, mistake: string, easier: string, harder: string): GymExercise => ({
  id, name, group, equipment, cameraExercise, mistake, easier, harder, sets: 2, reps: 8, restSeconds: 60,
  weightGuidance: equipment === 'bodyweight' ? 'Bodyweight is enough. Use a stable support if needed.' : 'Start light. Choose a load you can move comfortably and stop if it hurts.',
});
export const EXERCISE_LIBRARY: GymExercise[] = [
  exercise('squat', 'Comfortable squat', 'Lower', 'bodyweight', 'squat', 'Rushing or going deeper than feels comfortable.', 'A shallow squat beside a stable chair.', 'A slower lowering phase, only if comfortable.'),
  exercise('arm-raise', 'Gentle arm raise', 'Upper', 'bodyweight', 'arm raise', 'Shrugging or swinging the arms quickly.', 'Seated, with a smaller range.', 'A slower, controlled raise and lower.'),
  exercise('side-step', 'Side steps', 'Cardio', 'bodyweight', 'side step', 'Crossing the feet or stepping onto clutter.', 'Smaller steps beside a stable support.', 'Slightly longer steps at a comfortable pace.'),
  exercise('wall-press', 'Wall press', 'Upper', 'bodyweight', undefined, 'Letting the shoulders tense up.', 'Stand closer to the wall.', 'Stand slightly farther away, if comfortable.'),
  exercise('heel-raise', 'Supported heel raise', 'Lower', 'bodyweight', undefined, 'Bouncing or losing support.', 'Seated heel raises.', 'Slowly lower the heels after each raise.'),
  exercise('reach', 'Gentle reaches', 'Mobility', 'bodyweight', 'arm raise', 'Holding the breath or straining.', 'Seated reaches within a comfortable range.', 'Alternate sides slowly.'),
  exercise('dumbbell-row', 'Light dumbbell row', 'Upper', 'dumbbells', undefined, 'Jerking the weight or rounding over.', 'Use no weight and a supported position.', 'Use a slower lowering phase, not a heavier weight.'),
  exercise('band-row', 'Seated band row', 'Upper', 'bands', undefined, 'Using a damaged or unsecured band.', 'A lighter band with smaller movement.', 'A short, controlled pause at the end.'),
  exercise('step-touch', 'Full-body step and reach', 'Full Body', 'bodyweight', 'side step', 'Trying to keep up when you need a break.', 'A seated alternating reach.', 'Add a comfortable arm reach.'),
];

export function parentExercise(member: Member): CameraExercise {
  return member.ageGroup === 'senior' || member.fitness === 'gentle' ? 'arm raise' :
    member.fitness === 'active' ? 'squat' : 'side step';
}

export function lowerRoundTarget(target: number, completed: number): number {
  if (!Number.isFinite(target) || target < 1) return 1;
  return completed < target ? Math.max(1, Math.round(target * .8)) : target;
}

export function generateWeeklyPlan(setup: GymSetup, member: Member): GymDay[] {
  const gentle = member.ageGroup === 'senior' || member.fitness === 'gentle';
  const reps = gentle ? 5 : setup.level === 'starting out' ? 8 : setup.level === 'beginner' ? 10 : 12;
  const sets = gentle || setup.level === 'starting out' ? 2 : 3;
  const available = EXERCISE_LIBRARY.filter((item) => item.equipment === 'bodyweight' || item.equipment === setup.equipment || setup.equipment === 'full gym');
  const focuses = setup.days === 2 ? ['Full Body', 'Recovery', 'Mobility', 'Full Body', 'Recovery', 'Cardio', 'Recovery'] :
    setup.days === 3 ? ['Upper', 'Recovery', 'Lower', 'Mobility', 'Full Body', 'Cardio', 'Recovery'] :
      setup.days === 4 ? ['Upper', 'Lower', 'Recovery', 'Full Body', 'Cardio', 'Mobility', 'Recovery'] :
        ['Upper', 'Lower', 'Full Body', 'Recovery', 'Cardio', 'Mobility', 'Recovery'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const activeDays = new Set(setup.days === 2 ? [0, 3] : setup.days === 3 ? [0, 2, 4] : setup.days === 4 ? [0, 1, 3, 4] : [0, 1, 2, 4, 5]);
  return focuses.map((focus, index) => {
    const recovery = focus === 'Recovery';
    const optional = !recovery && !activeDays.has(index);
    const choices = recovery ? [] : available.filter((item) =>
      focus === 'Full Body' || item.group === focus || (focus === 'Mobility' && item.id === 'arm-raise'));
    const selected = recovery ? [] : choices.length ? choices.slice(0, 3) : available.slice(0, 2);
    return {
      id: `gym-${index}`, day: dayNames[index], title: gentle && !recovery ? `Gentle ${focus}` : focus,
      optional, warmUp: recovery ? ['An easy, unhurried start.'] : ['2 minutes of gentle marching or seated movement.', '1 minute of comfortable shoulder circles.'],
      exercises: selected.map((item) => ({
        ...(gentle && item.id === 'squat' ? EXERCISE_LIBRARY.find((entry) => entry.id === 'arm-raise')! : item),
        sets, reps, restSeconds: gentle ? 75 : 60,
      })).filter((item, i, list) => list.findIndex((entry) => entry.id === item.id) === i),
      coolDown: ['Slow down gradually.', 'Try a comfortable stretch without straining.'],
      hydration: 'Have water available and take a break when you need one. Follow any personal fluid advice.',
    };
  });
}

export function walkingNote(seconds: number, weather: WeatherMode): string {
  if (seconds >= 120 && seconds % 120 < 18) return 'Water break now. Pause, have a drink if appropriate, and rest.';
  if (seconds % 60 >= 20 && seconds % 60 < 40) return 'Water break in 2 minutes. Keep your water nearby.';
  if (weather === 'highHeat') return 'It is warm, slow down a little. Stay indoors while conditions are too hot.';
  if (weather === 'dusty') return 'Dusty outside. Enjoy your indoor nature walk today.';
  if (weather === 'evening') return 'A calm evening pace. Check local conditions before an outdoor walk.';
  return 'Good steady pace. Choose a speed that feels comfortable.';
}

export function ropePeriod(speed: 'slow' | 'normal' | 'fast') { return speed === 'slow' ? 2.6 : speed === 'fast' ? 1.3 : 1.9; }
export function ropeAtBottom(seconds: number, speed: 'slow' | 'normal' | 'fast') {
  const phase = (Math.max(0, seconds) % ropePeriod(speed)) / ropePeriod(speed);
  return phase >= .68 && phase <= .98;
}

export const SPORTS: Sport[] = [
  { id: 'paddle', name: 'Paddle / padel', indoor: true, difficulty: 'Beginner-friendly practice', minutes: 30, equipment: ['Racket', 'Soft practice balls', 'Court shoes'], weather: 'An indoor court is suitable for high heat or dust; confirm venue conditions.',
    checklist: ['Book an appropriate court.', 'Clear the playing area.', 'Start with gentle rallies.', 'Keep water nearby.'] },
  { id: 'basketball', name: 'Basketball', indoor: false, difficulty: 'Easy to moderate', minutes: 25, equipment: ['Basketball', 'Court', 'Supportive shoes'], weather: 'Choose an indoor court during high heat or dust; an outdoor court needs comfortable local conditions.',
    checklist: ['Check the court surface.', 'Try close-range shots first.', 'Use an indoor alternative in unsafe weather.', 'Take water breaks.'] },
  { id: 'swimming', name: 'Swimming', indoor: true, difficulty: 'Supervised, ability-matched', minutes: 25, equipment: ['Swimwear', 'Towel', 'Venue-approved swim aids'], weather: 'An indoor, staffed pool avoids direct sun; check venue rules.',
    checklist: ['Choose a staffed pool and follow lifeguard instructions.', 'Children need constant, close adult supervision.', 'Never swim alone.', 'Stay within your ability; no breath-holding games.', 'Only dive where clearly permitted.', 'Check depth, access and pool rules before entering.'] },
  { id: 'cycling', name: 'Cycling', indoor: false, difficulty: 'Gentle route or stationary bike', minutes: 30, equipment: ['Properly fitted helmet', 'Suitable bike', 'Water'], weather: 'Use a stationary bike indoors in high heat or dust; outdoor riding needs safe weather and a suitable route.',
    checklist: ['Check brakes and helmet fit.', 'Choose a traffic-free family route.', 'Have an adult supervise children.', 'Avoid outdoor riding in unsafe heat or dust.'] },
];
