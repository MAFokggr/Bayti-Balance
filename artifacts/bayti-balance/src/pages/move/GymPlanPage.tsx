import { useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { Sparkles, Footprints, Trophy, Droplets, ChevronRight, Check, SkipForward, Moon } from 'lucide-react';
import { dayKey } from '@/lib/family-data';
import type { Equipment, GymLevel, GymSetup } from '@/lib/move-types';
import { MoveHeader, type MoveCtx } from '@/components/move/kit';

const LEVELS: GymLevel[] = ['starting out', 'beginner', 'intermediate'];
const DAYS: GymSetup['days'][] = [2, 3, 4, 5];
const EQUIP: Equipment[] = ['bodyweight', 'dumbbells', 'bands', 'full gym'];

export const isSkipped = (skipped: string[], memberId: string, dayId: string, exId: string) =>
  skipped.includes(`${memberId}:${dayKey()}:${dayId}:${exId}`);
export const today = () => new Date().toISOString().slice(0, 10);

export default function GymPlanPage({ ctx }: { ctx: MoveCtx }) {
  const { move, member } = ctx;
  const [setup, setSetup] = useState<GymSetup>(move.gymSetup);
  const [flash, setFlash] = useState('');
  const plan = move.weeklyPlan;
  const doneToday = new Set(move.data.sessions.filter((s) => s.memberId === member.id && s.createdAt.slice(0, 10) === today()).map((s) => s.exerciseId));
  const generate = () => { move.generateGym(setup); setFlash(`New plan ready for ${member.name}.`); };
  const Card = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => <div className="mv-card soft"><div className="mv-row" style={{ marginBottom: 10 }}><span className="mv-tag sun">{n}</span><strong>{title}</strong></div>{children}</div>;

  return <main className="mv-page mv-sky motion-in">
    <MoveHeader kicker={`Gym and walking · ${member.name}`} title={<>Your gentle<br />week.</>} weather={ctx.weather} lead="Three choices, one realistic plan. Adjust any time. Rest days are part of it." />
    <div className="mv-grid2" style={{ marginBottom: 14 }}>
      <Link href="/move/walking" className="mv-big" style={{ background: '#A9D9B8', minHeight: 110, padding: 14 }} data-testid="link-walking"><Footprints size={22} /><h2 style={{ fontSize: 18, maxWidth: '100%' }}>Nature walk</h2></Link>
      <Link href="/move/sports" className="mv-big" style={{ background: '#CDBBEA', minHeight: 110, padding: 14 }} data-testid="link-sports"><Trophy size={22} /><h2 style={{ fontSize: 18, maxWidth: '100%' }}>Sports</h2></Link>
    </div>
    <div className="mv-stack">
      <Card n={1} title="Level"><div className="mv-row">{LEVELS.map((l) => <button key={l} className="mv-chip" aria-pressed={setup.level === l} onClick={() => setSetup({ ...setup, level: l })} data-testid={`button-level-${l.replace(' ', '-')}`} style={{ textTransform: 'capitalize' }}>{l}</button>)}</div></Card>
      <Card n={2} title="Days per week"><div className="mv-grid4">{DAYS.map((d) => <button key={d} className="mv-chip" style={{ justifyContent: 'center' }} aria-pressed={setup.days === d} onClick={() => setSetup({ ...setup, days: d })} data-testid={`button-days-${d}`}>{d}</button>)}</div></Card>
      <Card n={3} title="Equipment"><div className="mv-row">{EQUIP.map((e) => <button key={e} className="mv-chip" aria-pressed={setup.equipment === e} onClick={() => setSetup({ ...setup, equipment: e })} data-testid={`button-equipment-${e.replace(' ', '-')}`} style={{ textTransform: 'capitalize' }}>{e}</button>)}</div></Card>
      <button className="mv-btn full sun" onClick={generate} data-testid="button-generate-plan"><Sparkles size={17} /> {plan.length ? 'Regenerate my week' : 'Make my weekly plan'}</button>
      {flash && <div className="mv-note" role="status">{flash}</div>}
    </div>
    <h2 className="mv-h2">This week</h2>
    {plan.length === 0 ? <div className="mv-card soft" style={{ textAlign: 'center' }}><Moon size={26} /><p className="mv-lead" style={{ margin: '8px 0 0' }}>No plan yet. Choose above and tap Make my weekly plan.</p></div> :
      <div className="mv-stack">{plan.map((day) => {
        const rec = day.exercises.length === 0;
        return <section key={day.id} className="mv-card soft" data-testid={`card-day-${day.id}`} style={rec ? { background: '#f1ecff' } : undefined}>
          <div className="mv-row"><span className="mv-tag">{day.day.slice(0, 3)}</span><strong style={{ fontSize: 16 }}>{day.title}</strong><span className="mv-grow" />{day.optional && <span className="mv-tag sun">optional</span>}</div>
          {rec ? <p className="mv-fine" style={{ margin: '8px 0 0' }}>Recovery day. {day.warmUp.join(' ')} {day.coolDown.join(' ')}</p> : <>
            <p className="mv-fine" style={{ margin: '8px 0' }}><strong>Warm-up:</strong> {day.warmUp.join(' ')}</p>
            <div className="mv-stack" style={{ gap: 7 }}>{day.exercises.map((ex) => {
              const skipped = isSkipped(move.data.skipped, member.id, day.id, ex.id);
              const done = doneToday.has(ex.id);
              const target = move.data.roundTargets[`${member.id}:${ex.id}`] ?? ex.reps;
              return <Link key={ex.id} href={`/move/exercise?day=${day.id}&id=${ex.id}`} className={`mv-stop ${skipped ? 'mv-done' : ''}`} data-testid={`link-exercise-${day.id}-${ex.id}`}>
                <div className="mv-grow"><h3 style={{ margin: 0, fontSize: 14 }}>{ex.name}</h3><span className="mv-fine">{ex.sets} x {target} · rest {ex.restSeconds}s · {ex.group}</span></div>
                {done && <span className="mv-tag ok"><Check size={11} /> done</span>}{skipped && <span className="mv-tag"><SkipForward size={11} /> skipped</span>}
                <ChevronRight size={18} />
              </Link>;
            })}</div>
            <p className="mv-fine" style={{ margin: '8px 0 0' }}><strong>Cool-down:</strong> {day.coolDown.join(' ')}</p>
          </>}
          <p className="mv-fine" style={{ margin: '6px 0 0', display: 'flex', gap: 5 }}><Droplets size={13} /> {day.hydration}</p>
        </section>;
      })}</div>}
    <p className="mv-fine" style={{ marginTop: 14 }}>General guidance only: start light, stop if anything hurts, and ask a qualified professional about any health concerns.</p>
  </main>;
}
