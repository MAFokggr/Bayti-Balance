import type { CameraExercise } from '@/lib/camera-types';
export function CameraExerciseExample({ exercise }: { exercise: CameraExercise }) {
  const copy = exercise === 'squat' ? 'Bend only as far as comfortable, then stand tall.' :
    exercise === 'arm raise' ? 'Raise and lower gently. A seated version is welcome.' :
      exercise === 'side step' ? 'Step to the side, then return to the center.' :
        exercise === 'jump' ? 'A small comfortable jump, then a soft landing.' : 'Raise one knee at a time, slowly.';
  return <figure className="coach-example" data-exercise={exercise}>
    <svg viewBox="0 0 96 96" role="img" aria-label={`${exercise} movement illustration`}>
      <path d="M12 84H84" stroke="#78D5C5" strokeWidth="4" strokeLinecap="round" />
      <g className="example-person" stroke="#17264D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="48" cy="18" r="8" fill="#F6D477" /><path d="M48 27V54" />
        <path className="example-arms" d="M25 44L48 32L71 44" /><path className="example-legs" d="M30 78L48 54L66 78" />
      </g>
    </svg><figcaption><strong>Movement example</strong><span>{copy}</span><small>Illustration, not an assessment of your body.</small></figcaption>
  </figure>;
}
