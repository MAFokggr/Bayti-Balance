import { Link, useLocation } from 'wouter';
import { ArrowRight, Check, Target, UserPlus } from 'lucide-react';
import type { FamilyStore } from '@/hooks/use-family-store';
import { memberProgress } from '@/lib/family-data';
import type { Member } from '@/lib/family-types';
import { Logo, MemberAvatar, Ring } from '@/components/shared/kit';

export function EnergyBars({ energy }: { energy: Member['energy'] }) {
  const lvl = energy === 'low' ? 1 : energy === 'balanced' ? 2 : 3;
  return <span className="sl-energy" data-testid="text-energy"><span className="sl-bars" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={n <= lvl ? 'on' : ''} style={{ height: 4 + n * 4 }} />)}</span>{energy === 'low' ? 'Low energy' : energy === 'balanced' ? 'Balanced' : 'Bright'}</span>;
}

export default function WhoPage({ store }: { store: FamilyStore }) {
  const [, go] = useLocation();
  const { data, current } = store;
  return <main className="sl-page motion-in">
    <div className="sl-between"><Logo /><span className="eyebrow">{data.family}</span></div>
    <h1 className="title" style={{ marginTop: 22 }}>Who is here<br />today?</h1>
    <p className="copy" style={{ marginTop: 0 }}>Each person gets their own version of the family plan.</p>
    <div className="sl-stack" style={{ marginTop: 16 }}>
      {data.members.map((m, i) => {
        const p = memberProgress(data, m.id);
        return <button key={m.id} className={`sl-who-card ${current.id === m.id ? 'is-current' : ''}`} style={{ borderLeftColor: m.color, animation: `rise .4s ${i * 0.06}s both` }}
          onClick={() => { store.selectMember(m.id); go('/home'); }} data-testid={`card-member-${m.id}`}>
          <MemberAvatar member={m} size={58} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="sl-row" style={{ gap: 6 }}><strong style={{ fontSize: 18 }}>{m.name}</strong>{current.id === m.id && <Check size={15} aria-label="Current" />}</span>
            <span style={{ display: 'block', fontSize: 11, color: '#5b6f80', fontWeight: 700 }}>{m.role}</span>
            <span className="sl-row" style={{ gap: 5, fontSize: 12, fontWeight: 800, marginTop: 5 }}><Target size={13} />{m.goal}</span>
            <span className="sl-row" style={{ gap: 10, marginTop: 4 }}><EnergyBars energy={m.energy} /><span style={{ fontSize: 11, fontWeight: 800 }}>{p.actions}/{p.goal} done</span></span>
          </span>
          <Ring percent={p.percent} size={54} stroke={6} color={m.color === '#F6D477' || m.color === '#E9C98B' ? '#c08a1e' : m.color} label={`${m.name} progress`}>{Math.round(p.percent)}%</Ring>
        </button>;
      })}
    </div>
    {data.members.length === 0 && <div className="sl-empty"><UserPlus size={24} /><br />No family members yet.<br /><Link href="/register" className="sl-btn sl-btn-sm" style={{ marginTop: 10 }}>Build our family plan</Link></div>}
    <Link href="/register" className="sl-btn sl-btn-ghost sl-full" style={{ marginTop: 18 }} data-testid="link-register"><UserPlus size={16} /> Set up a new family <ArrowRight size={15} /></Link>
  </main>;
}
