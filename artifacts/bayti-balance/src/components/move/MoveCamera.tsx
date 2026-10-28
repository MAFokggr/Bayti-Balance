import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, Sparkles, Star, ArrowRight } from 'lucide-react';
import { CameraCoach } from '@/components/CameraCoach';
import type { CameraExercise, CoachMetrics } from '@/lib/move-types';
import type { Member } from '@/lib/family-types';
import { fmt, newId } from './kit';

export interface CameraResult { id: string; reps: number; seconds: number; consistency: number; mode: 'live' | 'demo' | 'manual'; exercise: CameraExercise; target?: number }

/** Wraps the shared CameraCoach: session-local counts, metrics capture and a single Finish. */
export function MoveCamera({ member, exercise, target, showExample = true, onFinish, onRep, onMetrics, finishLabel = 'Finish and save', autoFinish = false }: {
  member: Member; exercise: CameraExercise; target: number; showExample?: boolean; finishLabel?: string; autoFinish?: boolean;
  onFinish: (r: CameraResult) => void; onRep?: (reps: number, metrics: CoachMetrics | null) => void; onMetrics?: (m: CoachMetrics) => void;
}) {
  const sessionId = useRef(newId());
  const metricsRef = useRef<CoachMetrics | null>(null);
  const [reps, setReps] = useState(0);
  const [mode, setMode] = useState<CoachMetrics['mode']>('ready');
  const done = useRef(false);
  const source = useRef<CameraResult['mode']>('manual');
  const finishTimer = useRef<number | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  useEffect(() => () => { if (finishTimer.current !== null) window.clearTimeout(finishTimer.current); }, []);
  const onRepRef = useRef(onRep); onRepRef.current = onRep;
  const onMetricsRef = useRef(onMetrics); onMetricsRef.current = onMetrics;
  const onFinishRef = useRef(onFinish); onFinishRef.current = onFinish;

  const finish = useCallback((count: number) => {
    if (done.current) return;
    done.current = true;
    const m = metricsRef.current;
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
    try {
      onFinishRef.current({ id: sessionId.current, target, reps: count, seconds: Math.round(m?.elapsedSeconds ?? 0), consistency: source.current === 'live' ? Math.round(m?.consistency ?? 0) : 0, mode: source.current, exercise });
    } catch (error) {
      done.current = false;
      setFinishError(error instanceof Error ? error.message : 'The session could not be saved. Please retry.');
    }
  }, [exercise, target]);

  const handleRep = useCallback((ex: string, count: number) => {
    if (ex !== exercise || done.current) return;
    setReps(count);
    onRepRef.current?.(count, metricsRef.current);
    if (count < target && finishTimer.current !== null) { window.clearTimeout(finishTimer.current); finishTimer.current = null; }
    if (autoFinish && count >= target && finishTimer.current === null) finishTimer.current = window.setTimeout(() => finish(count), 600);
  }, [exercise, autoFinish, target, finish]);
  const handleMetrics = useCallback((m: CoachMetrics) => {
    metricsRef.current = m;
    if (m.mode === 'live' || m.mode === 'demo') source.current = m.mode;
    setMode((old) => old === m.mode ? old : m.mode);
    onMetricsRef.current?.(m);
  }, []);

  return <div>
    {finishError && <p className="mv-alert" role="alert">{finishError}</p>}
    <CameraCoach member={member.name} onRep={handleRep} initialCount={0} initialCounts={{}} initialExercise={exercise} allowedExercises={[exercise]} targetReps={target} showExample={showExample} onMetrics={handleMetrics} />
    <div className="mv-card soft" style={{ marginTop: 12 }}>
      <div className="mv-row"><strong data-testid="text-camera-reps">{reps} / {target} {exercise}</strong><span className="mv-grow" /><span className={`mv-tag ${mode === 'demo' ? 'sun' : 'ok'}`} data-testid="status-camera-mode">{mode === 'demo' ? 'Demo taps, no camera analysis' : mode}</span></div>
      <div className="mv-meter" style={{ margin: '10px 0' }}><span style={{ transform: `scaleX(${Math.min(1, reps / target)})` }} /></div>
      <button className="mv-btn full sun" onClick={() => finish(reps)} disabled={reps === 0} data-testid="button-finish-camera"><CheckCircle2 size={18} /> {finishLabel}</button>
      {reps === 0 && <p className="mv-fine" style={{ margin: '8px 0 0' }}>Finish unlocks after your first counted move. No rush.</p>}
    </div>
  </div>;
}

const CHEERS = ['Steady and strong. That counts.', 'You showed up for yourself today.', 'Nice rhythm. Your body did good work.', 'Every rep is a little gift to future you.'];

export function SessionSummary({ result, target, label, next, onAgain }: { result: CameraResult; target: number; label: string; next?: { href: string; label: string }; onAgain?: () => void }) {
  const cheer = CHEERS[result.reps % CHEERS.length];
  return <section className="mv-summary" data-testid="card-session-summary" aria-live="polite">
    <div className="mv-row"><Sparkles size={18} /><strong>{label} complete</strong><span className="mv-grow" /><span className="mv-points" data-testid="text-points-earned"><Star size={14} /> +5 points</span></div>
    <div className="mv-grid2" style={{ margin: '14px 0' }}>
      <div className="mv-stat"><b data-testid="text-summary-reps">{result.reps}</b><span>reps of {target}</span></div>
      <div className="mv-stat"><b>~{fmt(result.seconds)}</b><span>approx. time</span></div>
      <div className="mv-stat"><b>{result.mode !== 'live' ? 'n/a' : `${result.consistency}%`}</b><span>{result.mode !== 'live' ? `${result.mode}, not analysed` : 'pose visible'}</span></div>
      <div className="mv-stat"><b style={{ fontSize: 15, textTransform: 'capitalize' }}>{result.mode}</b><span>mode</span></div>
    </div>
    <p style={{ fontWeight: 800, margin: '0 0 6px' }}>{cheer}</p>
    <p style={{ fontSize: 11.5, opacity: .75, margin: '0 0 14px' }}>Consistency means how steadily the camera could see you, not a judgement of form. This is not medical advice.</p>
    <div className="mv-row">
      {next && <Link href={next.href} className="mv-btn sun mv-grow" data-testid="link-next-exercise">Next: {next.label} <ArrowRight size={16} /></Link>}
      {onAgain && <button className="mv-btn ghost" onClick={onAgain} data-testid="button-again">Again</button>}
    </div>
  </section>;
}
