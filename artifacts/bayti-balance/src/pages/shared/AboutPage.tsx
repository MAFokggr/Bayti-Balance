import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Camera, CloudSun, LineChart, Lock, RotateCcw, ScanSearch, ShieldCheck, Shuffle, UserCog, GraduationCap } from 'lucide-react';
import type { FamilyStore } from '@/hooks/use-family-store';
import { Demo, Logo, SafetyNote } from '@/components/shared/kit';

const AI = [
  { label: 'Image recognition', note: 'Pantry photo reading is simulated.', Icon: ScanSearch, status: 'demo' },
  { label: 'Personalization', note: 'Rules shape each member\'s version of the plan.', Icon: UserCog, status: 'rules' },
  { label: 'Weather-aware planning', note: 'Live Open-Meteo for Abu Dhabi, with Demo fallback and switch.', Icon: CloudSun, status: 'live' },
  { label: 'Camera movement tracking', note: 'Pose model runs on this device. Demo mode is labelled.', Icon: Camera, status: 'live' },
  { label: 'Adaptive routines', note: 'Eight rule-based plan changes.', Icon: Shuffle, status: 'rules' },
  { label: 'Progress tracking', note: 'Real saved reps, water and actions, plus Demo history.', Icon: LineChart, status: 'live' },
];

export default function AboutPage({ store }: { store: FamilyStore }) {
  const [, go] = useLocation();
  const [confirm, setConfirm] = useState(false);
  return <main className="sl-page motion-in">
    <div className="sl-between"><Logo /><span className="eyebrow">Student prototype</span></div>
    <h1 className="title" style={{ marginTop: 22 }}>About<br />Bayti Balance.</h1>
    <p className="copy" style={{ marginTop: 0 }}>One family. Different needs. One healthier day.</p>
    <section className="sl-card sl-card-navy" data-testid="card-competition">
      <div className="eyebrow">Made for</div>
      <strong style={{ fontSize: 17, display: 'block', marginTop: 4 }}>6th Annual COE STEM Programming with AI Competition</strong>
      <div className="sl-stack" style={{ marginTop: 14 }}>
        {[['Omar', '6th grade'], ['Jomana', '8th grade']].map(([n, g]) => <div key={n} className="sl-row" style={{ gap: 10 }}><span className="sl-avatar" style={{ width: 40, height: 40, background: n === 'Omar' ? '#78D5C5' : '#F59B7A', borderColor: '#FBF8F1' }}><GraduationCap size={19} /></span><div><strong>{n}</strong><div className="sl-sub" style={{ margin: 0 }}>{g}, Islamia English School</div></div></div>)}
      </div>
      <p className="sl-sub" style={{ marginTop: 12 }}>A student prototype built in one day.</p>
    </section>

    <h2 className="sl-h2">AI components</h2>
    <div className="sl-ai-grid">{AI.map(({ label, note, Icon, status }) => <div key={label} className="sl-ai" data-testid={`ai-${label}`}>
      <div className="sl-between"><Icon size={22} />{status === 'demo' ? <Demo /> : status === 'rules' ? <span className="sl-demo" style={{ background: '#CDBBEA' }}>Rules</span> : <span className="sl-demo sl-live">Live</span>}</div>
      {label}<small>{note}</small></div>)}</div>
    <p className="sl-sub" style={{ fontSize: 11 }}>The family guide and message board are rule-based Demo features. No language model is used.</p>

    <section className="sl-card" style={{ marginTop: 16 }}>
      <div className="eyebrow sl-row" style={{ gap: 5 }}><ShieldCheck size={14} />Safety</div>
      <SafetyNote />
      <div className="eyebrow sl-row" style={{ gap: 5, marginTop: 14 }}><Lock size={14} />Privacy</div>
      <p className="sl-sub">Family details, photos and progress stay in this browser's local storage. Camera video is processed on this device and never recorded or uploaded.</p>
    </section>

    <section className="sl-card" style={{ marginTop: 14 }} data-testid="card-reset">
      <div className="eyebrow">Demo controls</div>
      <p className="sl-sub">Clear all family data on this device and return to Welcome.</p>
      {confirm ? <div className="sl-row" style={{ marginTop: 10 }}>
        <button className="sl-btn" style={{ background: '#b9472c' }} onClick={() => { store.resetDemo(); setConfirm(false); go('/welcome'); }} data-testid="button-confirm-reset"><RotateCcw size={15} /> Yes, reset</button>
        <button className="sl-btn sl-btn-ghost" onClick={() => setConfirm(false)} data-testid="button-cancel-reset">Cancel</button>
      </div> : <button className="sl-btn sl-btn-ghost" style={{ marginTop: 10 }} onClick={() => setConfirm(true)} data-testid="button-reset"><RotateCcw size={15} /> Reset demo</button>}
    </section>
    <Link href="/welcome" className="sl-btn sl-btn-soft sl-full" style={{ marginTop: 16 }}>Welcome screen <ArrowRight size={15} /></Link>
  </main>;
}
