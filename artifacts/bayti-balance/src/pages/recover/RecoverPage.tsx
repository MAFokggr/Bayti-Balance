import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Check, Minus, MoonStar, Plus, Sparkles, Star, Trophy, Wind } from 'lucide-react';
import type { FamilyStore } from '@/hooks/use-family-store';
import { useRecoveryStore } from '@/hooks/use-recovery-store';
import './recover.css';

type Msg = { kind: 'ok' | 'err'; text: string } | null;
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Could not save. Use Retry above.');

function RecoverInner({ store }: { store: FamilyStore }) {
  const rec = useRecoveryStore(store);
  const { current } = store;
  const saved = rec.record.sleepHours;
  const [hours, setHours] = useState<number>(saved ?? current.sleepTarget ?? 8);
  const [msg, setMsg] = useState<Msg>(null);
  const [breathing, setBreathing] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const say = (m: Msg) => { window.clearTimeout(t.current); setMsg(m); if (m?.kind === 'ok') t.current = window.setTimeout(() => setMsg(null), 4500); };
  const run = (fn: () => void, ok: string) => { try { fn(); say({ kind: 'ok', text: ok }); } catch (e) { say({ kind: 'err', text: errText(e) }); } };
  const clamp = (n: number) => Math.min(24, Math.max(0, Math.round(n * 4) / 4));
  const done = rec.tasks.filter((x) => rec.record.windDown.includes(x.id)).length;
  const all = done === rec.tasks.length && rec.tasks.length > 0;
  const fmtH = (n: number) => n.toFixed(2).replace(/\.?0+$/, '');

  return <main className="rc motion-in" data-testid="page-recover">
    <div className="rc-eyebrow">Recover · {current.name}</div>
    <h1 className="rc-title">Rest is part<br />of the <em>plan.</em></h1>
    <p className="rc-sub">A simple sleep log and a gentle wind-down. Nothing here is sensed or diagnosed.</p>

    <section className="rc-card" data-testid="card-sleep">
      <h2><MoonStar size={18} />Last night's sleep</h2>
      <p className="rc-sub">Your saved preference is {fmtH(current.sleepTarget || 0)} h. It is a preference, not a medical target.</p>
      <div className="rc-hours">
        <button className="rc-step" onClick={() => setHours((h) => clamp(h - 0.25))} disabled={hours <= 0} aria-label="Quarter hour less" data-testid="button-sleep-minus"><Minus size={18} /></button>
        <output aria-live="polite" data-testid="text-sleep-hours">{fmtH(hours)}<small>h</small></output>
        <button className="rc-step" onClick={() => setHours((h) => clamp(h + 0.25))} disabled={hours >= 24} aria-label="Quarter hour more" data-testid="button-sleep-plus"><Plus size={18} /></button>
      </div>
      <input className="rc-range" type="range" min={0} max={24} step={0.25} value={hours} onChange={(e) => setHours(clamp(Number(e.target.value)))} aria-label="Hours slept" data-testid="input-sleep-hours" />
      <button className="rc-btn" style={{ marginTop: 10 }} onClick={() => run(() => rec.saveSleep(hours), `Saved ${fmtH(hours)} hours for today. Sleep logs never earn points.`)} data-testid="button-save-sleep"><Check size={16} />{saved === null ? 'Save sleep' : 'Update sleep'}</button>
      {saved !== null && <p className="rc-sub" style={{ marginTop: 8 }} data-testid="text-sleep-saved">Saved today: {fmtH(saved)} h{saved !== hours ? ' · unsaved change above' : ''}</p>}
    </section>

    <section className="rc-card" data-testid="card-winddown">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2><Star size={18} />Wind-down</h2>
        <span className={`rc-pill ${rec.completed ? 'gold' : ''}`} data-testid="status-winddown">{rec.completed ? <><Trophy size={12} />+5 earned today</> : `${done} of ${rec.tasks.length}`}</span>
      </div>
      <p className="rc-sub">Tick all three, then finish to earn 5 family points, once per day.</p>
      <div className="rc-dots" aria-hidden="true">{rec.tasks.map((x) => <i key={x.id} className={rec.record.windDown.includes(x.id) ? 'on' : ''} />)}</div>
      {rec.tasks.map((x) => { const on = rec.record.windDown.includes(x.id); return <button key={x.id} className="rc-task" role="checkbox" aria-checked={on} onClick={() => run(() => rec.toggleTask(x.id), on ? `Unticked ${x.title}.` : `${x.title} ticked.`)} data-testid={`checkbox-task-${x.id}`}>
        <span className="rc-box">{on && <Check size={16} strokeWidth={3} />}</span><span><b>{x.title}</b><span className="d">{x.description}</span></span></button>; })}
      <button className="rc-btn" style={{ marginTop: 12 }} disabled={!all || rec.completed} onClick={() => run(() => rec.finishRoutine(), 'Wind-down finished. 5 points added to the family board.')} data-testid="button-finish-winddown">
        <Sparkles size={16} />{rec.completed ? 'Finished today' : all ? 'Finish and earn 5 points' : `Tick ${rec.tasks.length - done} more to finish`}</button>
      {rec.completed && <p className="rc-sub" style={{ marginTop: 8 }}>You can still change the checklist. Points stay counted once.</p>}
      <div role="status" aria-live="polite">{msg && <div className={`rc-msg ${msg.kind === 'err' ? 'err' : ''}`} data-testid="feedback-recover">{msg.text}</div>}</div>
    </section>

    <section className="rc-card" data-testid="card-breathing">
      <h2><Wind size={18} />Slow down, optional</h2>
      <p className="rc-sub">Watch the circle and breathe comfortably at your own pace. No holding your breath. Skip any time.</p>
      {breathing && <div className="rc-breath" aria-label="Slowly growing and shrinking circle"><i /><span>Easy breaths</span></div>}
      <button className="rc-btn ghost" style={{ marginTop: 12 }} onClick={() => setBreathing((b) => !b)} aria-pressed={breathing} data-testid="button-toggle-breathing">{breathing ? 'Stop the circle' : 'Show the circle'}</button>
    </section>

    <Link href="/progress" className="rc-btn ghost" style={{ marginTop: 14 }} data-testid="link-progress"><Trophy size={16} />See the family points board</Link>
    <p className="rc-note">Bayti Balance is an educational prototype. It does not diagnose sleep or medical conditions. If sleep worries you, talk to a qualified professional.</p>
  </main>;
}

export default function RecoverPage({ store }: { store: FamilyStore }) {
  return <RecoverInner key={store.current.id} store={store} />;
}
