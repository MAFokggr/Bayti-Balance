import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Flag, Rabbit, Star, Medal, TreePalm, Droplets, Check } from 'lucide-react';
import { CameraCoach } from '@/components/CameraCoach';
import type { CoachMetrics } from '@/lib/move-types';
import { useMoveTimer } from '@/hooks/use-move-timer';
import { MemberAvatar } from '@/components/shared/kit';
import { MoveHeader, fmt, newId, useReducedMotion, type MoveCtx } from '@/components/move/kit';

const GOAL = 10;
type Phase = 'idle' | 'running' | 'paused' | 'done';

export default function RabbitQuest({ ctx }: { ctx: MoveCtx }) {
  const { member } = ctx;
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [run, setRun] = useState(0);
  const [jumps, setJumps] = useState(0);
  const [rival, setRival] = useState(0);
  const [prompt, setPrompt] = useState('Jump now');
  const [hop, setHop] = useState(0);
  const [higher, setHigher] = useState<{ last: number; prev: number } | null>(null);
  const [bestHip, setBestHip] = useState<number | null>(null);
  const [mode, setMode] = useState<CoachMetrics['mode']>('ready');
  const timer = useMoveTimer();
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const metrics = useRef<CoachMetrics | null>(null);
  const lastCount = useRef(0);
  const jumpsRef = useRef(0);
  const sessionId = useRef(newId());
  const source = useRef<'live' | 'demo' | 'manual'>('manual');
  const best = ctx.move.data.rabbitBest[member.id];

  // Friendly rival: hops on its own while the game runs, then waits at the flag.
  useEffect(() => {
    if (phase !== 'running') return;
    const t = window.setInterval(() => setRival((r) => Math.min(GOAL - 1, r + 1)), 3800);
    return () => window.clearInterval(t);
  }, [phase]);

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
    if (delta <= 0 || phaseRef.current !== 'running') return; // only real counted reps while playing
    const n = Math.min(GOAL, jumpsRef.current + delta); jumpsRef.current = n;
    setJumps(n); setHop((h) => h + 1);
    window.setTimeout(() => {
      const m = metrics.current;
      const valid = m && m.mode === 'live' && m.lastJumpRise != null && m.previousJumpRise != null;
      if (m?.mode === 'live' && m.lastJumpRise != null) setBestHip((b) => Math.max(b ?? 0, m.lastJumpRise as number));
      if (valid && (m.lastJumpRise as number) > (m.previousJumpRise as number)) { setHigher({ last: m.lastJumpRise as number, prev: m.previousJumpRise as number }); setPrompt('Great jump'); }
      else { setHigher(null); setPrompt(n === GOAL - 1 ? 'One more jump' : n % 2 ? 'Higher, higher' : 'Jump now'); }
      if (n >= GOAL) setPhase('done');
    }, 60);
  }, []);

  const stars = jumps >= GOAL ? 3 : jumps >= 6 ? 2 : jumps >= 1 ? 1 : 0;
  const saved = useRef(false);
  useEffect(() => {
    if (phase !== 'done' || saved.current) return;
    saved.current = true; timer.pause();
    if (jumps > 0) {
      ctx.move.recordRabbit(stars, bestHip ?? 0);
      ctx.move.saveSession({ id: sessionId.current, memberId: member.id, exerciseId: 'rabbit-jump', label: 'Rabbit Jump Quest', exercise: 'jump', reps: jumps, target: GOAL, seconds: timer.seconds, consistency: source.current === 'live' ? Math.round(metrics.current?.consistency ?? 0) : 0, mode: source.current });
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => { setPhase('running'); timer.start(); setPrompt('Jump now'); };
  const pause = () => { setPhase('paused'); timer.pause(); };
  const restart = () => {
    timer.reset(); setPhase('idle'); setJumps(0); jumpsRef.current = 0; lastCount.current = 0; setRival(0); setHigher(null); setBestHip(null);
    setPrompt('Jump now'); metrics.current = null; source.current = 'manual'; saved.current = false; sessionId.current = newId(); setRun((r) => r + 1);
  };
  const finish = () => setPhase('done');

  if (phase === 'done') return <main className="mv-page mv-kids motion-in">
    <MoveHeader back="/move/games" kicker="Rabbit Jump Quest" title="You did it!" />
    <div className="mv-card mv-end" data-testid="card-rabbit-end">
      <div className="mv-badge"><Medal size={58} /></div>
      <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>Movement complete. Time for a water break.</h2>
      <div className="mv-stars" aria-label={`${stars} of 3 stars`}>{[0, 1, 2].map((i) => <Star key={i} size={40} fill={i < stars ? '#F6D477' : 'none'} />)}</div>
      <p className="mv-lead" data-testid="text-rabbit-jumps">{jumps} happy hops in {fmt(timer.seconds)}</p>
      {bestHip != null && <p className="mv-fine">Best hip rise this game: {bestHip.toFixed(3)} (relative to your body, not centimeters)</p>}
      {jumps === 0 && <p className="mv-fine">No jumps were counted this time, so nothing was saved. Ready when you are.</p>}
      {jumps > 0 && <span className="mv-points"><Check size={14} /> Saved · +5 points</span>}
      <div className="mv-note" style={{ marginTop: 14 }}><Droplets size={18} /> Sip some water and shake out your legs.</div>
      <button className="mv-btn full sun mv-kidbtn" onClick={restart} data-testid="button-rabbit-again"><RotateCcw size={22} /> Play again</button>
    </div>
  </main>;

  const pos = (n: number) => 8 + (n / GOAL) * 80;
  return <main className="mv-page mv-kids motion-in">
    <MoveHeader back="/move/games" kicker="Rabbit Jump Quest" title={<>Hop to<br />the flag!</>} demo={mode === 'demo' ? 'Demo taps' : undefined}
      right={best ? <span className="mv-tag sun"><Star size={11} /> {best.stars}</span> : undefined} />
    <div className="mv-game" role="img" aria-label={`You ${jumps} of ${GOAL}. Rabbit ${rival} of ${GOAL}.`}>
      {phase !== 'idle' && <div key={prompt + hop} className="mv-prompt" aria-live="assertive" data-testid="text-rabbit-prompt">{prompt}</div>}
      <TreePalm size={46} style={{ position: 'absolute', left: 14, bottom: 40, color: 'var(--oasis)' }} />
      <TreePalm size={36} style={{ position: 'absolute', left: '55%', bottom: 42, color: 'var(--oasis)' }} />
      {[18, 38, 58, 78].map((x, i) => <div key={x} className="mv-plat" style={{ left: `${x}%`, bottom: 110 + (i % 2) * 26 }}><Star size={14} fill="#F6D477" style={{ position: 'absolute', top: -18, left: 14 }} /></div>)}
      <Flag className="mv-finish-flag" size={34} />
      <div className="mv-runner" style={{ left: `${pos(rival)}%`, bottom: 82, background: '#fffdf7', transition: reduced ? 'none' : undefined }} data-testid="status-rival"><Rabbit size={24} /></div>
      <div key={hop} className={`mv-runner ${hop && !reduced ? 'hop' : ''}`} style={{ left: `${pos(jumps)}%`, background: member.color, width: 50, height: 50 }} data-testid="status-child-runner"><MemberAvatar member={member} size={40} /></div>
    </div>
    <div className="mv-row" style={{ marginBottom: 10 }}>
      <span className="mv-tag sun" style={{ fontSize: 14, padding: '6px 12px' }} data-testid="text-rabbit-count">{jumps} / {GOAL}</span>
      <span className="mv-tag">{fmt(timer.seconds)}</span><span className="mv-grow" />
      {higher && <span className="mv-tag ok" data-testid="text-higher-jump">Higher than your last jump ({higher.last.toFixed(3)} vs {higher.prev.toFixed(3)} hip rise)</span>}
    </div>
    <div className="mv-grid2" style={{ marginBottom: 12 }}>
      {phase === 'running' ? <button className="mv-btn mv-kidbtn" onClick={pause} data-testid="button-rabbit-pause"><Pause size={24} /> Pause</button>
        : <button className="mv-btn sun mv-kidbtn" onClick={start} data-testid="button-rabbit-start"><Play size={24} /> {phase === 'paused' ? 'Go' : 'Start'}</button>}
      <button className="mv-btn ghost mv-kidbtn" onClick={restart} data-testid="button-rabbit-restart"><RotateCcw size={22} /> Restart</button>
    </div>
    <button className="mv-btn coral full" onClick={finish} disabled={phase === 'idle'} data-testid="button-rabbit-finish"><Flag size={18} /> Finish</button>
    <p className="mv-fine" style={{ margin: '10px 0' }}>Your character moves only when the camera counts a jump{mode === 'demo' ? ' (here: Demo taps, no camera analysis, no jump height)' : ''}. Pause here or on the camera pauses both; Stop ends the game and saves your hops.</p>
    <CameraCoach key={`${member.id}-${run}`} member={member.name} onRep={onRep} initialCount={0} initialCounts={{}} initialExercise="jump" allowedExercises={['jump']} targetReps={GOAL} onMetrics={onMetrics} paused={phase === 'paused'} onStop={onStop} />
  </main>;
}
