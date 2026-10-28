import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Repeat, Check } from 'lucide-react';
import { useMoveTimer } from '@/hooks/use-move-timer';
import { MemberAvatar } from '@/components/shared/kit';
import { Figure, MoveHeader, newId, type FigureKind, type MoveCtx } from '@/components/move/kit';

const MOVES: { id: string; label: string; fig: FigureKind; cue: string }[] = [
  { id: 'arm circles', label: 'Arm circles', fig: 'arms', cue: 'Big slow circles' },
  { id: 'side steps', label: 'Side steps', fig: 'step', cue: 'Step, together, step' },
  { id: 'squats', label: 'Squats', fig: 'squat', cue: 'Sit back like a chair' },
  { id: 'reaches', label: 'Reaches', fig: 'arms', cue: 'Reach up to the palms' },
  { id: 'balance', label: 'Balance', fig: 'still', cue: 'One foot, hold a wall' },
];

export default function MirrorMoves({ ctx }: { ctx: MoveCtx }) {
  const { members } = ctx.store.data;
  const o = ctx.move.data.oasis;
  const a = members.find((m) => m.id === o.parentId) ?? members.find((m) => m.ageGroup === 'adult') ?? members[0];
  const b = members.find((m) => m.id === o.childId) ?? members.find((m) => m.ageGroup === 'child' && m.id !== a?.id) ?? members[1] ?? members[0];
  const [leaderIsA, setLeaderIsA] = useState(true);
  const [move, setMove] = useState<string | null>(null);
  const [rounds, setRounds] = useState(0);
  const [saved, setSaved] = useState(false);
  const timer = useMoveTimer(10);
  const sessionId = useRef(newId());
  const leader = leaderIsA ? a : b, copier = leaderIsA ? b : a;
  const chosen = MOVES.find((m) => m.id === move);
  const finished = timer.remaining === 0;
  const counted = useRef(false);
  useEffect(() => {
    if (finished && !counted.current) { counted.current = true; setRounds((r) => r + 1); }
    if (!finished) counted.current = false;
  }, [finished]);
  const switchRoles = () => { timer.reset(); setMove(null); setLeaderIsA((v) => !v); };
  const save = () => {
    if (saved || !copier) return;
    ctx.move.saveSession({ id: sessionId.current, memberId: ctx.member.id, exerciseId: 'mirror-moves', label: 'Mirror Moves', reps: rounds, target: rounds, seconds: rounds * 10, consistency: 0, mode: 'manual' });
    setSaved(true);
  };

  return <main className="mv-page mv-sky motion-in">
    <MoveHeader back="/move/oasis" kicker="No camera needed" title={<>Mirror<br />Moves.</>} lead="The leader picks a movement. The copier mirrors it for 10 seconds. Then swap." />
    <div className="mv-card">
      <div className="mv-row">{leader && <MemberAvatar member={leader} size={36} />}<div><div className="mv-kicker">Leader</div><strong data-testid="text-leader">{leader?.name}</strong></div><span className="mv-grow" /><div style={{ textAlign: 'right' }}><div className="mv-kicker">Copier</div><strong data-testid="text-copier">{copier?.name}</strong></div>{copier && <MemberAvatar member={copier} size={36} />}</div>
    </div>
    <div className="mv-kicker" style={{ margin: '4px 0 8px' }}>{leader?.name}, pick a move</div>
    <div className="mv-grid2" style={{ marginBottom: 14 }}>
      {MOVES.map((m) => <button key={m.id} className="mv-choice" aria-pressed={move === m.id} disabled={timer.running} onClick={() => { setMove(m.id); timer.reset(); }} data-testid={`button-mirror-${m.id.replace(' ', '-')}`}>{m.label}<small>{m.cue}</small></button>)}
    </div>
    {chosen && <div className="mv-card" style={{ textAlign: 'center', background: finished ? '#dff3e6' : 'var(--paper)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}><Figure kind={chosen.fig} label={`${chosen.label} leader`} color="#78D5C5" /><Figure kind={chosen.fig} label={`${chosen.label} copier`} /></div>
      <div className="mv-timer" aria-live="polite" data-testid="text-mirror-timer">{finished ? 'Done' : `${timer.remaining ?? 10}s`}</div>
      <p className="mv-lead" style={{ margin: '6px 0 12px' }}>{finished ? `Lovely mirroring. Now ${copier?.name} leads.` : `${copier?.name}, copy ${leader?.name}'s ${chosen.label.toLowerCase()}.`}</p>
      <div className="mv-row" style={{ justifyContent: 'center' }}>
        {!finished && (timer.running ? <button className="mv-btn" onClick={timer.pause} data-testid="button-mirror-pause"><Pause size={16} /> Pause</button> : <button className="mv-btn sun" onClick={timer.start} data-testid="button-mirror-start"><Play size={16} /> {timer.seconds > 0 ? 'Resume' : 'Start 10 s'}</button>)}
        <button className="mv-btn ghost" onClick={timer.reset} data-testid="button-mirror-reset"><RotateCcw size={16} /> Reset</button>
        {finished && <button className="mv-btn oasis" onClick={switchRoles} data-testid="button-switch-roles"><Repeat size={16} /> Switch roles</button>}
      </div>
    </div>}
    {!chosen && <button className="mv-btn ghost full" onClick={switchRoles} data-testid="button-switch-roles-early"><Repeat size={16} /> Switch who leads</button>}
    <div className="mv-card soft" style={{ marginTop: 14 }}>
      <div className="mv-row"><strong>Rounds mirrored</strong><span className="mv-grow" /><span className="mv-tag sun" data-testid="text-mirror-rounds">{rounds}</span></div>
      <button className="mv-btn full" style={{ marginTop: 10 }} disabled={rounds === 0 || saved} onClick={save} data-testid="button-save-mirror"><Check size={16} /> {saved ? 'Saved, +5 points' : `Save for ${ctx.member.name}`}</button>
    </div>
  </main>;
}
