import { useState } from 'react';
import { Activity, Droplets, Plus, TreePalm } from 'lucide-react';
import { MemberAvatar } from '@/components/shared/kit';
import { afterExercise, WATER_NOTE, waterRange } from '@/lib/eat-data';
import { dayKey } from '@/lib/family-data';
import type { Member } from '@/lib/family-types';
import { Feedback, useFeedback, type EatCtx } from '@/components/eat/kit';

function Bottle({ member, ml, maxMl, minMl, selected, over, onSelect, onDrop, onOver, onLeave }: {
  member: Member; ml: number; minMl: number; maxMl: number; selected: boolean; over: boolean;
  onSelect(): void; onDrop(ml: number): void; onOver(): void; onLeave(): void;
}) {
  const fill = Math.min(1, ml / Math.max(1, maxMl));
  return <button className={`eat-bottle ${over ? 'drop-over' : ''}`} aria-pressed={selected} onClick={onSelect}
    onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-bayti-water')) { e.preventDefault(); onOver(); } }} onDragLeave={onLeave} onDrop={(e) => {
      e.preventDefault();
      const payload = e.dataTransfer.getData('application/x-bayti-water');
      if (payload && Number.isInteger(Number(payload))) onDrop(Number(payload));
    }}
    aria-label={`${member.name}'s bottle, ${ml} ml today, estimate ${(minMl / 1000).toFixed(1)} to ${(maxMl / 1000).toFixed(1)} litres`} data-testid={`bottle-${member.id}`}>
    <svg width="54" height="96" viewBox="0 0 54 96" aria-hidden>
      <defs><clipPath id={`clip-${member.id}`}><path d="M14 20 h26 v6 q8 6 8 16 v44 q0 6 -6 6 h-30 q-6 0 -6 -6 v-44 q0 -10 8 -16 z" /></clipPath></defs>
      <rect x="18" y="6" width="18" height="14" rx="3" fill={member.color || '#78D5C5'} stroke="#17264D" strokeWidth="2" />
      <g clipPath={`url(#clip-${member.id})`}><rect className="eat-water" x="0" y="20" width="54" height="72" fill="#78D5C5" style={{ transform: `scaleY(${fill})` }} /></g>
      <path d="M14 20 h26 v6 q8 6 8 16 v44 q0 6 -6 6 h-30 q-6 0 -6 -6 v-44 q0 -10 8 -16 z" fill="none" stroke="#17264D" strokeWidth="2" />
      <line x1="44" x2="50" y1={92 - 72 * (minMl / Math.max(1, maxMl))} y2={92 - 72 * (minMl / Math.max(1, maxMl))} stroke="#17264D" strokeWidth="2" />
    </svg>
    <span className="eat-row" style={{ gap: 4 }}><MemberAvatar member={member} size={20} />{member.name}</span>
    <small data-testid={`text-water-${member.id}`}>{(ml / 1000).toFixed(1)} / {(minMl / 1000).toFixed(1)}–{(maxMl / 1000).toFixed(1)} L</small>
  </button>;
}

export function WaterPage({ ctx }: { ctx: EatCtx }) {
  const { data } = ctx.store;
  const [selectedId, setSelectedId] = useState(ctx.member.id);
  const [amount, setAmount] = useState(200);
  const [custom, setCustom] = useState('');
  const [over, setOver] = useState<string | null>(null);
  const fb = useFeedback();
  const today = dayKey();
  const selected = data.members.find((m) => m.id === selectedId) ?? ctx.member;
  const rangeFor = (m: Member) => waterRange(m, ctx.weather, afterExercise(data, m.id));
  const mlFor = (m: Member) => data.water[`${m.id}:${today}`] ?? 0;
  const log = (memberId: string, ml: number) => {
    const who = data.members.find((m) => m.id === memberId);
    return fb.run(() => {
      if (!who) throw new Error('That family member could not be found.');
      if (!Number.isInteger(ml) || ml <= 0 || ml > 1000) throw new Error('Choose a whole amount between 1 and 1000 ml.');
      ctx.eat.logWater(memberId, ml);
    }, `Added ${Math.round(ml)} ml to ${who?.name}'s bottle.`);
  };
  const range = rangeFor(selected);
  const exercised = afterExercise(data, selected.id);
  const grown = ctx.eat.hydrationIds.length;

  return <div className="eat-body">
    <p className="eat-sub">Tap a bottle to choose who is drinking, then add water — or drag the drop straight into any bottle.</p>
    <div className="eat-bottles">{data.members.map((m) => { const r = rangeFor(m); return <Bottle key={m.id} member={m} ml={mlFor(m)} minMl={r.minMl} maxMl={r.maxMl} selected={m.id === selected.id} over={over === m.id}
      onSelect={() => setSelectedId(m.id)} onOver={() => setOver(m.id)} onLeave={() => setOver(null)} onDrop={(droppedMl) => { setOver(null); log(m.id, droppedMl); }} />; })}</div>

    {exercised && <div className="eat-card eat-card-navy eat-row" data-testid="text-water-break"><Activity size={18} /><b>Movement complete. Add a water break before the next activity.</b></div>}

    <div className="eat-card" style={{ display: 'grid', gap: 10 }}>
      <div className="eat-between"><b>Adding for {selected.name}</b><span className="eat-pill eat-pill-tq" data-testid="text-water-range">{(range.minMl / 1000).toFixed(1)}–{(range.maxMl / 1000).toFixed(1)} L today</span></div>
      <div className="eat-grid3">{[100, 200, 300].map((ml) => <button key={ml} className="sl-btn sl-btn-soft sl-btn-sm" onClick={() => log(selected.id, ml)} data-testid={`button-water-${ml}`}><Plus size={13} />{ml} ml</button>)}</div>
      <div className="eat-row">
        <input className="eat-input" style={{ flex: 1 }} type="number" min="1" max="1000" step="1" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom ml" aria-label="Custom water amount in ml" data-testid="input-water-custom" />
        <button className="sl-btn sl-btn-sm" disabled={!custom} onClick={() => { if (log(selected.id, Number(custom))) setCustom(''); }} data-testid="button-water-custom">Add</button>
      </div>
      <div className="eat-row" style={{ gap: 14 }}>
        <div className="eat-drop" draggable onDragStart={(e) => e.dataTransfer.setData('application/x-bayti-water', String(amount))} aria-hidden data-testid="drag-water-drop"><span>{amount}</span></div>
        <div style={{ flex: 1 }}>
          <div className="eat-wrap">{[100, 200, 300].map((ml) => <button key={ml} className="eat-toggle" aria-pressed={amount === ml} onClick={() => setAmount(ml)} data-testid={`button-drop-size-${ml}`}>{ml} ml drop</button>)}</div>
          <button className="sl-btn sl-btn-ghost sl-btn-sm" style={{ marginTop: 6 }} onClick={() => log(selected.id, amount)} data-testid="button-drop-tap"><Droplets size={14} />Tap: drop {amount} ml into {selected.name}'s bottle</button>
        </div>
      </div>
      <Feedback msg={fb.msg} id="water" />
      <div><b style={{ fontSize: 12 }}>Why this range</b><ul className="eat-list">{range.reasons.map((r) => <li key={r} style={{ fontSize: 12 }}>{r}</li>)}</ul></div>
    </div>

    <div>
      <h2 className="eat-h2"><TreePalm size={17} />Today's family oasis</h2>
      <div className="eat-oasis" aria-label={`${grown} of ${data.members.length} members reached their lower water estimate today`} data-testid="oasis-hydration">
        <div className="pool" style={{ width: `${30 + (grown / Math.max(1, data.members.length)) * 55}%` }} />
        {Array.from({ length: grown }, (_, i) => <TreePalm key={i} className="palm" size={34 + (i % 2) * 8} style={{ left: `${10 + i * (78 / Math.max(1, data.members.length))}%`, animationDelay: `${i * 90}ms` }} />)}
      </div>
      <p className="eat-sub" style={{ marginTop: 6 }}>{grown === 0 ? 'Each member who reaches their lower estimate plants a palm here.' : `${grown} of ${data.members.length} reached their estimate today.`}</p>
    </div>
    <p className="eat-note" data-testid="text-water-note">{WATER_NOTE}</p>
  </div>;
}
