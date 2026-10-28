import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Hand, PartyPopper, RotateCcw, Home as HomeIcon, FlipHorizontal } from 'lucide-react';
import { MemberAvatar } from '@/components/shared/kit';
import { parentExercise } from '@/lib/move-data';
import type { CameraExercise } from '@/lib/move-types';
import { GoalBar, MoveHeader, OasisScene, OASIS_PIECES, isHot, WaterNote, type MoveCtx } from '@/components/move/kit';
import { MoveCamera, SessionSummary, type CameraResult } from '@/components/move/MoveCamera';

function useOasisPeople(ctx: MoveCtx) {
  const { members } = ctx.store.data;
  const o = ctx.move.data.oasis;
  const child = members.find((m) => m.id === o.childId);
  const parent = members.find((m) => m.id === o.parentId);
  return { child, parent, o };
}

export function OasisSetup({ ctx }: { ctx: MoveCtx }) {
  const [, go] = useLocation();
  const { members } = ctx.store.data;
  const { o } = useOasisPeople(ctx);
  const kids = members.filter((m) => m.ageGroup === 'child' || m.ageGroup === 'teen');
  const grown = members.filter((m) => m.ageGroup === 'adult' || m.ageGroup === 'senior');
  const [childId, setChild] = useState(o.childId || kids[0]?.id || members[0]?.id || '');
  const [parentId, setParent] = useState(o.parentId || grown[0]?.id || members[1]?.id || '');
  const inProgress = o.pieces > 0 && o.stage !== 'opened' && o.stage !== 'setup';
  const parent = members.find((m) => m.id === parentId);
  const pEx = parent ? parentExercise(parent) : null;
  const start = () => {
    ctx.move.updateOasis({ childId, parentId, stage: 'child', turn: 'child', pieces: 0 });
    go('/move/oasis-child');
  };
  const resume = () => go(o.stage === 'handoff' ? '/move/handoff' : o.turn === 'child' ? '/move/oasis-child' : '/move/oasis-parent');
  const Picker = ({ list, value, set, label }: { list: typeof members; value: string; set: (v: string) => void; label: string }) => <div>
    <div className="mv-kicker" style={{ marginBottom: 6 }}>{label}</div>
    <div className="mv-grid2">{(list.length ? list : members).map((m) => <button key={m.id} className="mv-choice" aria-pressed={value === m.id} onClick={() => set(m.id)} data-testid={`button-pick-${label.toLowerCase()}-${m.id}`}>
      <span className="mv-row"><MemberAvatar member={m} size={28} />{m.name}</span><small>{m.role}</small></button>)}</div>
  </div>;

  return <main className="mv-page mv-sky motion-in">
    <MoveHeader kicker="Parent and child" title={<>Build the<br />Oasis.</>} weather={ctx.weather}
      lead="Two separate turns, one shared goal. The child jumps, the grown-up moves, and the oasis grows piece by piece." />
    <GoalBar pieces={o.pieces} />
    <OasisScene pieces={o.pieces} />
    {o.stage === 'opened' && <div className="mv-card" style={{ background: '#fff2c9' }}><strong>Your oasis is open.</strong><p className="mv-lead" style={{ margin: '6px 0 10px' }}>Build a new one any time.</p><button className="mv-btn full" onClick={() => ctx.move.resetOasis()} data-testid="button-reset-oasis"><RotateCcw size={16} /> Start a fresh oasis</button></div>}
    {inProgress && <button className="mv-btn full oasis" style={{ marginBottom: 14 }} onClick={resume} data-testid="button-resume-oasis">Continue turn {o.pieces + 1} of 5 <ArrowRight size={16} /></button>}
    <div className="mv-card soft mv-stack">
      <Picker list={kids} value={childId} set={setChild} label="Child" />
      <Picker list={grown} value={parentId} set={setParent} label="Parent" />
      {isHot(ctx.weather) && <p className="mv-fine" style={{ margin: 0 }}>Indoor-safe today: jumps in place on a soft mat, and indoor parent moves only.</p>}
      {pEx && <p className="mv-fine" style={{ margin: 0 }}>{parent?.name}'s move: <strong>{pEx}</strong>{pEx === 'arm raise' ? ' (gentle adaptation)' : ''}, 5 reps.</p>}
      <button className="mv-btn full sun" disabled={!childId || !parentId || childId === parentId} onClick={start} data-testid="button-start-oasis">{inProgress ? 'Restart from the first piece' : 'Start the first turn'} <ArrowRight size={16} /></button>
      {childId === parentId && <p className="mv-fine" style={{ margin: 0 }}>Choose two different people.</p>}
    </div>
    <Link href="/move/mirror" className="mv-big" style={{ background: '#CDBBEA', minHeight: 120 }} data-testid="card-mirror-moves">
      <div className="mv-ico"><FlipHorizontal size={22} /></div>
      <div><h2>Mirror Moves</h2><p>No camera. One leads, one copies, 10 seconds each.</p></div>
    </Link>
  </main>;
}

export function OasisTurn({ ctx, role }: { ctx: MoveCtx; role: 'child' | 'parent' }) {
  const [, go] = useLocation();
  const { child, parent, o } = useOasisPeople(ctx);
  const person = role === 'child' ? child : parent;
  const [result, setResult] = useState<CameraResult | null>(null);
  const exercise: CameraExercise = useMemo(() => role === 'child' ? 'jump' : parent ? parentExercise(parent) : 'side step', [role, parent]);
  const piece = OASIS_PIECES[Math.min(o.pieces, 4)];
  if (!person || o.stage === 'setup') return <main className="mv-page"><MoveHeader back="/move/oasis" title="Pick the team first" lead="Choose a child and a parent to start the oasis." /><Link href="/move/oasis" className="mv-btn full" data-testid="link-oasis-setup">Go to setup</Link></main>;
  if (o.turn !== role && !result) return <main className="mv-page"><MoveHeader back="/move/oasis" title="Not this turn yet" lead={`It is the ${o.turn}'s turn.`} /><Link href="/move/handoff" className="mv-btn full" data-testid="link-handoff">Go to the handoff</Link></main>;

  const finish = (r: CameraResult) => {
    ctx.move.saveSession({ id: r.id, memberId: person.id, exerciseId: `oasis-${piece.id}`, label: `Oasis ${piece.label}`, exercise: r.exercise, reps: r.reps, target: 5, seconds: r.seconds, consistency: r.consistency, mode: r.mode });
    const pieces = o.pieces + 1;
    ctx.move.updateOasis({ pieces, turn: role === 'child' ? 'parent' : 'child', stage: pieces >= 5 ? 'opened' : 'handoff' });
    setResult(r);
  };
  return <main className="mv-page mv-sky motion-in">
    <MoveHeader back="/move/oasis" kicker={`Turn ${Math.min(o.pieces + (result ? 0 : 1), 5)} of 5 · ${role}`} title={<>{person.name},<br />{role === 'child' ? 'jump for the ' : 'move for the '}{piece.label.toLowerCase()}.</>} weather={ctx.weather}
      lead={role === 'child' ? `Five jumps on the spot${isHot(ctx.weather) ? ', indoors on a soft surface' : ''}. Land softly.` : `Five ${exercise}s at a comfortable pace${exercise === 'arm raise' ? ', adapted to be gentle' : ''}.`} />
    <GoalBar pieces={o.pieces} />
    {result ? <>
      <SessionSummary result={result} target={5} label={`${piece.label} piece`} />
      <div style={{ marginTop: 14 }}>
        {o.stage === 'opened' ? <Link href="/move/handoff" className="mv-btn full sun" data-testid="link-oasis-opened"><PartyPopper size={18} /> See the opened oasis</Link>
          : <Link href="/move/handoff" className="mv-btn full sun" data-testid="link-pass-on">Pass to the {o.turn} <Hand size={18} /></Link>}
      </div>
    </> : <MoveCamera key={`${person.id}-${o.pieces}`} member={person} exercise={exercise} target={5} autoFinish finishLabel={`Finish and unlock the ${piece.label.toLowerCase()}`} onFinish={finish} />}
    {!result && <button className="mv-btn ghost full" style={{ marginTop: 10 }} onClick={() => go('/move/oasis')} data-testid="button-stop-turn">Stop this turn for now</button>}
  </main>;
}

export function OasisHandoff({ ctx }: { ctx: MoveCtx }) {
  const [, go] = useLocation();
  const { child, parent, o } = useOasisPeople(ctx);
  if (o.stage === 'opened') return <main className="mv-page mv-sky motion-in">
    <MoveHeader back="/move/oasis" kicker="Five turns together" title={<>Oasis<br />opened.</>} weather={ctx.weather} lead={`${child?.name ?? 'Child'} and ${parent?.name ?? 'parent'} built every piece: palm, path, bridge, fountain and pond.`} />
    <OasisScene pieces={5} />
    <GoalBar pieces={5} />
    <WaterNote />
    <div className="mv-stack">
      <button className="mv-btn full sun" onClick={() => { ctx.move.resetOasis(); go('/move/oasis'); }} data-testid="button-build-another">Build another oasis</button>
      <Link href="/progress" className="mv-btn full ghost" data-testid="link-progress"><HomeIcon size={16} /> See family progress</Link>
    </div>
  </main>;
  const next = o.turn === 'child' ? child : parent;
  const ready = () => { ctx.move.updateOasis({ stage: o.turn }); go(o.turn === 'child' ? '/move/oasis-child' : '/move/oasis-parent'); };
  return <main className="mv-page mv-sky motion-in">
    <MoveHeader back="/move/oasis" kicker="Handoff" title={`Pass to the ${o.turn}`} weather={ctx.weather} />
    <GoalBar pieces={o.pieces} />
    <div className="mv-hand">
      <div className="mv-hand-orb">{next ? <MemberAvatar member={next} size={92} /> : <Hand size={60} />}</div>
      <h2 className="mv-h1" style={{ fontSize: 26 }}>{next?.name ?? 'Next player'}, your turn.</h2>
      <p className="mv-lead">The camera is off while you swap. Only one person moves in front of it at a time.</p>
      <button className="mv-btn full sun" onClick={ready} disabled={!next} data-testid="button-ready-turn">I am ready <ArrowRight size={18} /></button>
    </div>
  </main>;
}
