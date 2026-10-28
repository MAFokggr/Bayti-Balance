import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Star, Trophy, Droplets, Lock } from 'lucide-react';
import { CameraCoach } from '@/components/CameraCoach';
import type { CoachMetrics } from '@/lib/move-types';
import { ropeAtBottom, ropePeriod } from '@/lib/move-data';
import { useMoveTimer } from '@/hooks/use-move-timer';
import { MoveHeader, newId, useReducedMotion, type MoveCtx } from '@/components/move/kit';

type Speed = 'slow' | 'normal' | 'fast';
type Phase = 'idle' | 'running' | 'paused' | 'done';
const LIMIT = 30;

export default function StarRope({ ctx }: { ctx: MoveCtx }) {
  const { member } = ctx;
  const reduced = useReducedMotion();
  const [speed, setSpeed] = useState<Speed>('normal');
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [mode, setMode] = useState<CoachMetrics['mode']>('ready');
  const timer = useMoveTimer(LIMIT);
  const elapsed = useRef(0);
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const speedRef = useRef(speed); speedRef.current = speed;
  const lastCount = useRef(0);
  const scoreRef = useRef(0);
  const rope = useRef<SVGPathElement>(null);
  const glow = useRef<SVGPathElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const sessionId = useRef(newId());
  const source = useRef<'live' | 'demo' | 'manual'>('manual');
  const metrics = useRef<CoachMetrics | null>(null);
  const best = ctx.move.data.ropeBest[`${member.id}:${speed}`] ?? 0;

  const draw = useCallback((t: number) => {
    const p = (t % ropePeriod(speedRef.current)) / ropePeriod(speedRef.current);
    // Rope bottom is centred in the timing window (~0.83 of the period).
    let c = Math.cos(2 * Math.PI * (p - 0.83));
    if (reduced) c = ropeAtBottom(t, speedRef.current) ? 1 : -1;
    const y = 120 + 105 * c;
    const d = `M30 120 Q170 ${y} 310 120`;
    rope.current?.setAttribute('d', d); glow.current?.setAttribute('d', d);
    zone.current?.classList.toggle('hot', ropeAtBottom(t, speedRef.current));
  }, [reduced]);

  // Visual rope driven by the same clock used to judge timing.
  useEffect(() => {
    draw(elapsed.current);
    if (phase !== 'running') return;
    let raf = 0; let prev = performance.now();
    const tick = (now: number) => { elapsed.current += (now - prev) / 1000; prev = now; draw(elapsed.current); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, draw]);

  useEffect(() => { if (timer.remaining === 0 && phase === 'running') setPhase('done'); }, [timer.remaining, phase]);
  const saved = useRef(false);
  useEffect(() => {
    if (phase !== 'done' || saved.current) return;
    saved.current = true; timer.pause();
    ctx.move.recordRope(scoreRef.current, speed);
    if (scoreRef.current > 0) ctx.move.saveSession({ id: sessionId.current, memberId: member.id, exerciseId: `star-rope-${speed}`, label: `Star Rope (${speed})`, exercise: 'jump', reps: scoreRef.current, target: scoreRef.current, seconds: Math.min(LIMIT, Math.round(elapsed.current)), consistency: source.current === 'live' ? Math.round(metrics.current?.consistency ?? 0) : 0, mode: source.current });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const timerRef = useRef(timer); timerRef.current = timer;
  // Native camera Pause also pauses the game (timer, rival/rope).
  const onMetrics = useCallback((m: CoachMetrics) => {
    metrics.current = m; setMode((o) => o === m.mode ? o : m.mode);
    if (m.mode === 'live' || m.mode === 'demo') source.current = m.mode;
    if (m.mode === 'paused' && phaseRef.current === 'running') { phaseRef.current = 'paused'; setPhase('paused'); timerRef.current.pause(); }
  }, []);
  // Native camera Stop ends the game: no more reps are counted, results are saved once.
  const onStop = useCallback(() => {
    if (phaseRef.current === 'idle' || phaseRef.current === 'done') return;
    phaseRef.current = 'done'; timerRef.current.pause(); setPhase('done');
  }, []);
  const onRep = useCallback((ex: string, count: number) => {
    if (ex !== 'jump') return;
    const delta = count - lastCount.current; lastCount.current = count;
    if (delta <= 0 || phaseRef.current !== 'running') return;
    if (ropeAtBottom(elapsed.current, speedRef.current)) { scoreRef.current += 1; setScore(scoreRef.current); setFlash('Star jump!'); }
    else { setMisses((m) => m + 1); setFlash('Wait for the glow'); }
  }, []);

  const start = () => { setPhase('running'); timer.start(); };
  const pause = () => { setPhase('paused'); timer.pause(); };
  const restart = () => {
    timer.reset(); elapsed.current = 0; lastCount.current = 0; scoreRef.current = 0; saved.current = false; metrics.current = null;
    sessionId.current = newId(); source.current = 'manual'; setScore(0); setMisses(0); setFlash(null); setPhase('idle'); setRun((r) => r + 1);
  };
  const locked = phase === 'running' || phase === 'paused';

  return <main className="mv-page mv-kids motion-in">
    <MoveHeader back="/move/games" kicker="Star Rope" title={<>Jump the<br />glow.</>} demo={mode === 'demo' ? 'Demo taps' : undefined} right={<span className="mv-tag sun" data-testid="text-rope-best"><Trophy size={11} /> best {best}</span>} />
    <div className="mv-row" style={{ marginBottom: 12 }} role="group" aria-label="Rope speed">
      {(['slow', 'normal', 'fast'] as Speed[]).map((s) => <button key={s} className="mv-chip" style={{ flex: 1, justifyContent: 'center', textTransform: 'capitalize', minHeight: 52, fontSize: 16 }} aria-pressed={speed === s} disabled={locked} onClick={() => { setSpeed(s); restart(); }} data-testid={`button-speed-${s}`}>{locked && speed === s && <Lock size={13} />}{s}</button>)}
    </div>
    <div className="mv-rope-stage" aria-label={`Rope swinging every ${ropePeriod(speed)} seconds`}>
      <div className="mv-score"><span data-testid="text-rope-score"><Star size={16} fill="#F6D477" /> {score}</span><span data-testid="text-rope-time">{phase === 'done' ? 0 : timer.remaining ?? LIMIT}s</span></div>
      <svg viewBox="0 0 340 240" aria-hidden="true">
        {[[40, 40], [290, 30], [120, 70], [220, 55], [300, 90]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.8} fill="#F6D477" />)}
        <circle cx="30" cy="120" r="7" fill="#CDBBEA" /><circle cx="310" cy="120" r="7" fill="#CDBBEA" />
        <path ref={glow} d="M30 120 Q170 225 310 120" stroke="#F6D47755" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path ref={rope} d="M30 120 Q170 225 310 120" stroke="#F6D477" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
      <div ref={zone} className="mv-rope-zone" />
      {flash && phase === 'running' && <div key={score + misses} className="mv-prompt" style={{ top: 'auto', bottom: 56, fontSize: 18 }} aria-live="polite">{flash}</div>}
    </div>
    {phase === 'done' ? <div className="mv-card mv-end" data-testid="card-rope-end">
      <div className="mv-badge"><Star size={58} fill="#F6D477" /></div>
      <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>{score} star jumps!</h2>
      <p className="mv-lead">{score > 0 && score >= best ? 'A new personal best. Wonderful timing.' : 'Lovely jumping. Every try builds rhythm.'}</p>
      <div className="mv-note"><Droplets size={18} /> Movement complete. Time for a water break.</div>
      <button className="mv-btn full sun mv-kidbtn" onClick={restart} data-testid="button-rope-again"><RotateCcw size={22} /> Again</button>
    </div> : <>
      <div className="mv-grid2" style={{ marginBottom: 10 }}>
        {phase === 'running' ? <button className="mv-btn mv-kidbtn" onClick={pause} data-testid="button-rope-pause"><Pause size={24} /> Pause</button>
          : <button className="mv-btn sun mv-kidbtn" onClick={start} data-testid="button-rope-start"><Play size={24} /> {phase === 'paused' ? 'Go' : 'Start 30 s'}</button>}
        <button className="mv-btn ghost mv-kidbtn" onClick={restart} data-testid="button-rope-restart"><RotateCcw size={22} /> Restart</button>
      </div>
      <p className="mv-fine">Only jumps the camera counts while the glow zone is lit become stars{mode === 'demo' ? ' (Demo taps here, no camera analysis)' : ''}. Missed timing: {misses}. Pause pauses the rope and the camera together; camera Stop ends the challenge.</p>
      <CameraCoach key={`${member.id}-${run}`} member={member.name} onRep={onRep} initialCount={0} initialCounts={{}} initialExercise="jump" allowedExercises={['jump']} onMetrics={onMetrics} paused={phase === 'paused'} onStop={onStop} />
    </>}
  </main>;
}
