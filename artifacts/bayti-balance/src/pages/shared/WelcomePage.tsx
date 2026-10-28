import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, ArrowRight, Droplets, MoonStar, Users, Utensils, Info } from 'lucide-react';
import type { FamilyStore } from '@/hooks/use-family-store';
import { Logo } from '@/components/shared/kit';

const PILLARS = [
  { label: 'Move', note: 'Play, walk, stretch', Icon: Activity, bg: '#F59B7A' },
  { label: 'Eat', note: 'Shared plates', Icon: Utensils, bg: '#A9D9B8' },
  { label: 'Hydrate', note: 'Water breaks', Icon: Droplets, bg: '#78D5C5' },
  { label: 'Recover', note: 'Rest and sleep', Icon: MoonStar, bg: '#CDBBEA' },
];

export default function WelcomePage({ store }: { store: FamilyStore }) {
  const [, go] = useLocation();
  const [confirm, setConfirm] = useState(false);
  const { data } = store;
  const hasOwn = Boolean(store.storageError) || (data.joined && !data.isSample) || Object.values(data.reps).some((v) => v > 0) || data.activityLog.some((r) => !r.demo);
  const load = () => { store.loadSample(); setConfirm(false); go('/who'); };

  return <main className="sl-welcome motion-in">
    <div className="sl-between"><Logo /><Link href="/about" className="sl-icon-btn" aria-label="About Bayti Balance" data-testid="link-about"><Info size={18} /></Link></div>
    <p className="eyebrow" style={{ marginTop: 26, marginBottom: 0 }}>One family. Different needs. One healthier day.</p>
    <h1 className="sl-hero-line" data-testid="text-welcome">Bayti Balance helps every family member <em>move, eat, hydrate, rest,</em> and feel better in a way that fits real life.</h1>
    <div className="sl-pillars">
      {PILLARS.map(({ label, note, Icon, bg }, i) => <div key={label} className="sl-pillar" style={{ background: bg, animationDelay: `${i * 0.12}s` }} data-testid={`pillar-${label.toLowerCase()}`}>
        <div className="sl-pillar-icon"><Icon size={24} strokeWidth={2.4} /></div>
        <div><strong>{label}</strong><br /><small>{note}</small></div>
      </div>)}
    </div>
    <div className="sl-stack" style={{ marginTop: 22 }}>
      <Link href="/register" className="sl-btn sl-full" data-testid="button-build-plan">Build our family plan <ArrowRight size={17} /></Link>
      <button className="sl-btn sl-btn-ghost sl-full" onClick={() => hasOwn ? setConfirm(true) : load()} data-testid="button-sample">
        <Users size={17} /> Explore a sample family
      </button>
      {!data.isSample && data.joined && <Link href="/who" className="sl-btn sl-btn-soft sl-full" data-testid="link-continue">Continue as {data.family} <ArrowRight size={16} /></Link>}
    </div>
    <div className="sl-about-mini" data-testid="text-about-summary">
      <strong>6th Annual COE STEM Programming with AI Competition</strong><br />
      Made by Omar (6th grade) and Jomana (8th grade), Islamia English School. A student prototype. <Link href="/about" style={{ fontWeight: 900, textDecoration: 'underline' }}>About</Link>
    </div>

    {confirm && <div className="sl-modal-back" onClick={() => setConfirm(false)}>
      <div className="sl-modal" role="dialog" aria-modal="true" aria-label="Replace family" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, fontWeight: 900 }}>Replace your family?</h2>
        <p className="sl-sub" style={{ fontSize: 14 }}>Loading the Al Mansoori sample replaces your saved family and progress on this device.</p>
        <div className="sl-row" style={{ marginTop: 16 }}>
          <button className="sl-btn" onClick={load} data-testid="button-confirm-sample">Load sample</button>
          <button className="sl-btn sl-btn-ghost" onClick={() => setConfirm(false)} data-testid="button-cancel-sample">Keep mine</button>
        </div>
      </div>
    </div>}
  </main>;
}
