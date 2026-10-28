import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Camera, Check, SkipForward, Shuffle, HeartPulse, Timer, Play, Pause, RotateCcw, Minus, Plus, Dumbbell, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { EXERCISE_LIBRARY, lowerRoundTarget } from '@/lib/move-data';
import type { GymDay, GymExercise } from '@/lib/move-types';
import { useMoveTimer } from '@/hooks/use-move-timer';
import { ErrorNote, Figure, figureFor, MoveHeader, fmt, newId, type MoveCtx } from '@/components/move/kit';
import { MoveCamera, SessionSummary, type CameraResult } from '@/components/move/MoveCamera';
import { isSkipped } from './GymPlanPage';

const CAMERA_OK = new Set(['squat', 'arm raise', 'side step']);

function useExercise(ctx: MoveCtx) {
  const params = new URLSearchParams(useSearch());
  const dayId = params.get('day') ?? '', id = params.get('id') ?? '';
  const day: GymDay | undefined = ctx.move.weeklyPlan.find((d) => d.id === dayId);
  const ex: GymExercise | undefined = day?.exercises.find((e) => e.id === id) ?? (day ? undefined : EXERCISE_LIBRARY.find((e) => e.id === id));
  const idx = day && ex ? day.exercises.findIndex((e) => e.id === ex.id) : -1;
  const next = day && idx >= 0 ? day.exercises[idx + 1] : undefined;
  const target = ex ? ctx.move.data.roundTargets[`${ctx.member.id}:${ex.id}`] ?? ex.reps : 0;
  return { dayId, day, ex, next, target };
}

function Missing() {
  return <main className="mv-page"><MoveHeader back="/move/gym" title="Exercise not found" lead="It may have been replaced or your plan was regenerated." /><Link href="/move/gym" className="mv-btn full" data-testid="link-back-plan">Back to my plan</Link></main>;
}

export function ExercisePage({ ctx }: { ctx: MoveCtx }) {
  const [, go] = useLocation();
  const { dayId, day, ex, next, target } = useExercise(ctx);
  const [completed, setCompleted] = useState(target);
  const [message, setMessage] = useState<string | null>(null);
  const [discomfort, setDiscomfort] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [roundSaved, setRoundSaved] = useState(false);
  const sessionId = useRef(newId());
  const rest = useMoveTimer(ex?.restSeconds ?? 60);
  useEffect(() => { if (!roundSaved) setCompleted(target); }, [target, ex?.id, roundSaved]);
  useEffect(() => { setRoundSaved(false); setMessage(null); sessionId.current = newId(); }, [ex?.id]);
  if (!ex) return <Missing />;
  const skipped = isSkipped(ctx.move.data.skipped, ctx.member.id, dayId, ex.id);
  const gear = ctx.move.gymSetup.equipment;
  const replacements = EXERCISE_LIBRARY.filter((e) => e.id !== ex.id && (e.group === ex.group || e.group === 'Mobility') && !day?.exercises.some((d) => d.id === e.id)
    && (e.equipment === 'bodyweight' || e.equipment === gear || gear === 'full gym'));
  const done = () => {
    if (roundSaved) return;
    try {
    ctx.move.recordRound(ex.id, target, completed);
    ctx.move.saveSession({ id: sessionId.current, memberId: ctx.member.id, exerciseId: ex.id, label: ex.name, exercise: ex.cameraExercise, reps: completed, target, seconds: 0, consistency: 0, mode: 'manual' });
    setRoundSaved(true);
    const lowered = lowerRoundTarget(target, completed);
    setMessage(completed < target
      ? `You did ${completed} of ${target}. Next round is set to ${lowered} reps, about 20 percent lower, so it matches how today feels. That is smart training, not a step back.`
      : `All ${target} reps done. Saved with +5 points.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The round could not be saved. Please retry.'); }
  };
  const skip = () => { if (day) ctx.move.skipExercise(day.id, ex.id); setMessage('Skipped. No points for this one, and that is okay.'); };
  const replace = (rid: string) => {
    if (!day) return;
    try { ctx.move.replaceExercise(day.id, ex.id, rid); setReplacing(false); setReplaceError(null); go(`/move/exercise?day=${day.id}&id=${rid}`); }
    catch (e) { setReplaceError(e instanceof Error ? e.message : 'That replacement could not be used.'); }
  };

  return <main className="mv-page mv-sky motion-in">
    <MoveHeader back="/move/gym" kicker={`${day ? `${day.day} · ${day.title}` : 'Exercise'} · ${ctx.member.name}`} title={ex.name} />
    <div className="mv-card" style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff6dc' }}>
      <Figure kind={figureFor(ex.cameraExercise ?? (ex.group === 'Cardio' ? 'jump' : ex.group === 'Lower' ? 'squat' : ex.group === 'Upper' ? 'arm raise' : undefined))} label={`Animated example of ${ex.name}`} />
      <div className="mv-stack" style={{ gap: 6 }}>
        <span className="mv-tag"><Dumbbell size={11} /> {ex.equipment}</span>
        <strong style={{ fontSize: 22 }} data-testid="text-target">{ex.sets} x {target}</strong>
        <span className="mv-fine">{ex.group} · rest {ex.restSeconds}s</span>
        <span className="mv-fine">{ex.weightGuidance || 'Start light.'}</span>
      </div>
    </div>
    {target < ex.reps && <div className="mv-note"><TrendingDown size={18} /><span>Target lowered from {ex.reps} to {target} after a shorter round. It will feel more doable.</span></div>}
    {message && <div className="mv-note" role="status" data-testid="status-exercise-message">{completed < target ? <TrendingDown size={18} /> : <TrendingUp size={18} />}<span>{message}</span></div>}
    {discomfort && <div className="mv-alert" role="alert" data-testid="status-discomfort"><AlertTriangle size={18} /><span><strong>Stop and consider asking a qualified professional.</strong> Rest, sip water, and do not push through pain.</span></div>}

    <div className="mv-card soft">
      <div className="mv-row"><Timer size={18} /><strong>Rest timer</strong><span className="mv-grow" /><span className="mv-timer" style={{ fontSize: 28 }} data-testid="text-rest-timer">{fmt(rest.remaining ?? 0)}</span></div>
      <div className="mv-row" style={{ marginTop: 10 }}>
        {rest.running ? <button className="mv-btn" onClick={rest.pause} data-testid="button-rest-pause"><Pause size={16} /> Pause</button> : <button className="mv-btn oasis" onClick={rest.start} disabled={rest.remaining === 0} data-testid="button-rest-start"><Play size={16} /> {rest.seconds ? 'Resume' : 'Start rest'}</button>}
        <button className="mv-btn ghost" onClick={rest.reset} data-testid="button-rest-reset"><RotateCcw size={16} /> Reset</button>
        {rest.remaining === 0 && <span className="mv-tag ok">Rest done</span>}
      </div>
    </div>

    <div className="mv-grid2" style={{ marginBottom: 14 }}>
      <div className="mv-card soft" style={{ margin: 0 }}><div className="mv-kicker">Common mistake</div><p style={{ fontSize: 13, margin: '6px 0 0' }}>{ex.mistake}</p></div>
      <div className="mv-card soft" style={{ margin: 0 }}><div className="mv-kicker">Easier</div><p style={{ fontSize: 13, margin: '6px 0 8px' }}>{ex.easier}</p><div className="mv-kicker">Harder</div><p style={{ fontSize: 13, margin: '6px 0 0' }}>{ex.harder}</p></div>
    </div>

    <div className="mv-card">
      <div className="mv-kicker">Reps completed this round</div>
      <div className="mv-row" style={{ justifyContent: 'center', margin: '10px 0' }}>
        <button className="mv-back" aria-label="Fewer reps" onClick={() => setCompleted((c) => Math.max(0, c - 1))} data-testid="button-reps-minus"><Minus size={18} /></button>
        <input className="mv-num" type="number" min={0} max={99} value={completed} onChange={(e) => setCompleted(Math.max(0, Math.min(99, Number(e.target.value) || 0)))} aria-label="Reps completed" data-testid="input-reps-completed" />
        <button className="mv-back" aria-label="More reps" onClick={() => setCompleted((c) => Math.min(99, c + 1))} data-testid="button-reps-plus"><Plus size={18} /></button>
      </div>
      <button className="mv-btn full sun" onClick={done} disabled={roundSaved} data-testid="button-exercise-done"><Check size={17} /> {roundSaved ? 'Saved' : 'Done'}</button>
      {roundSaved && <button className="mv-btn full ghost" style={{ marginTop: 9 }} onClick={() => { sessionId.current = newId(); setRoundSaved(false); setMessage(null); setCompleted(target); }} data-testid="button-next-round">Start next round</button>}
      <div className="mv-grid2" style={{ marginTop: 9 }}>
        <button className="mv-btn ghost" onClick={skip} disabled={!day || skipped} data-testid="button-exercise-skip"><SkipForward size={16} /> {skipped ? 'Skipped' : 'Skip'}</button>
        <button className="mv-btn ghost" onClick={() => setReplacing((r) => !r)} disabled={!day} aria-expanded={replacing} data-testid="button-exercise-replace"><Shuffle size={16} /> Replace</button>
      </div>
      {replaceError && <div style={{ marginTop: 10 }}><ErrorNote text={replaceError} onClose={() => setReplaceError(null)} /></div>}
      {replacing && <div className="mv-stack" style={{ marginTop: 10, gap: 7 }}>
        {replacements.length === 0 ? <p className="mv-fine">No similar swap fits your {gear} setup. Change equipment in your plan setup for more options.</p> : replacements.map((r) => <button key={r.id} className="mv-choice" onClick={() => replace(r.id)} data-testid={`button-replace-with-${r.id}`}>{r.name}<small>{r.group} · {r.equipment}</small></button>)}
      </div>}
      <button className="mv-btn coral full" style={{ marginTop: 9 }} onClick={() => setDiscomfort(true)} data-testid="button-discomfort"><HeartPulse size={16} /> I feel discomfort</button>
    </div>
    {ex.cameraExercise && CAMERA_OK.has(ex.cameraExercise) && <Link href={`/move/camera?day=${dayId}&id=${ex.id}`} className="mv-btn full oasis" data-testid="link-camera-mode"><Camera size={17} /> Try camera mode</Link>}
    {next && <Link href={`/move/exercise?day=${dayId}&id=${next.id}`} className="mv-btn full ghost" style={{ marginTop: 9 }} data-testid="link-next">Next: {next.name}</Link>}
  </main>;
}

export function GymCameraPage({ ctx }: { ctx: MoveCtx }) {
  const { dayId, day, ex, next, target } = useExercise(ctx);
  const [result, setResult] = useState<CameraResult | null>(null);
  const [run, setRun] = useState(0);
  if (!ex || !ex.cameraExercise || !CAMERA_OK.has(ex.cameraExercise)) return <Missing />;
  const finish = (r: CameraResult) => {
    ctx.move.recordRound(ex.id, target, r.reps);
    ctx.move.saveSession({ id: r.id, memberId: ctx.member.id, exerciseId: ex.id, label: ex.name, exercise: r.exercise, reps: r.reps, target, seconds: r.seconds, consistency: r.consistency, mode: r.mode });
    setResult(r);
  };
  return <main className="mv-page mv-sky motion-in">
    <MoveHeader back={`/move/exercise?day=${dayId}&id=${ex.id}`} kicker={`Camera mode · ${ctx.member.name}`} title={ex.name} lead={`Target ${target} reps. Advice cards change every few seconds. Pause or Stop any time.`} />
    {result ? <>
      <SessionSummary result={result} target={result.target ?? target} label={ex.name} next={next ? { href: `/move/exercise?day=${day?.id}&id=${next.id}`, label: next.name } : { href: '/move/gym', label: 'back to plan' }} onAgain={() => { setResult(null); setRun((n) => n + 1); }} />
      {result.reps < (result.target ?? target) && <div className="mv-note" style={{ marginTop: 12 }}><TrendingDown size={18} /><span>Next round lowers to {lowerRoundTarget(result.target ?? target, result.reps)} reps so it fits today.</span></div>}
    </> : <MoveCamera key={`${ctx.member.id}-${ex.id}-${run}`} member={ctx.member} exercise={ex.cameraExercise} target={target} onFinish={finish} />}
  </main>;
}
