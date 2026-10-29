import { useState } from 'react';
import { Bookmark, BookmarkCheck, Building2, Sun, Clock, Volleyball, Waves, Bike, CircleDot, ShieldCheck, ChevronDown } from 'lucide-react';
import { SPORTS } from '@/lib/move-data';
import { MoveHeader, isHot, type MoveCtx } from '@/components/move/kit';

const ICON: Record<string, typeof Bike> = { paddle: CircleDot, basketball: Volleyball, swimming: Waves, cycling: Bike };
const COLORS = ['#78D5C5', '#F6D477', '#CDBBEA', '#F59B7A'];

export default function SportsPage({ ctx }: { ctx: MoveCtx }) {
  const [open, setOpen] = useState<string | null>('swimming');
  const hot = isHot(ctx.weather);
  return <main className="mv-page mv-sky motion-in">
    <MoveHeader back="/move" kicker="Sports" title={<>Play<br />something.</>} weather={ctx.weather} lead={hot ? 'Hot or dusty now: indoor options are marked suitable. Outdoor ones are better after sunset.' : 'Four family-friendly sports. Save the ones you want to try.'} />
    <div className="mv-stack">{SPORTS.map((s, i) => {
      const saved = ctx.move.data.savedSports.includes(s.id);
      const ok = s.indoor || !hot;
      const I = ICON[s.id] ?? Volleyball;
      return <section key={s.id} className="mv-card" data-testid={`card-sport-${s.id}`}>
        <div className="mv-row">
          <div className="mv-ico" style={{ background: COLORS[i % 4] }}><I size={22} /></div>
          <div className="mv-grow"><strong style={{ fontSize: 17 }}>{s.name}</strong><div className="mv-row" style={{ gap: 5, marginTop: 4 }}>
            <span className="mv-tag">{s.indoor ? <><Building2 size={11} /> indoor</> : <><Sun size={11} /> outdoor</>}</span>
            <span className="mv-tag"><Clock size={11} /> {s.minutes} min</span>
            <span className={`mv-tag ${ok ? 'ok' : 'warn'}`} data-testid={`status-sport-weather-${s.id}`}>{ok ? 'suits now' : 'after sunset'}</span>
          </div></div>
        </div>
        <p className="mv-fine" style={{ margin: '10px 0 4px' }}><strong>Level:</strong> {s.difficulty}</p>
        <p className="mv-fine" style={{ margin: '0 0 4px' }}><strong>Equipment:</strong> {s.equipment.join(', ')}</p>
        <p className="mv-fine" style={{ margin: 0 }}><strong>Weather:</strong> {s.weather}</p>
        <button className="mv-chip" style={{ marginTop: 10 }} aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)} data-testid={`button-checklist-${s.id}`}>
          <ShieldCheck size={14} /> {s.id === 'swimming' ? 'Swimming safety checklist' : 'Checklist'} <ChevronDown size={14} />
        </button>
        {open === s.id && <ul className="mv-list" style={{ marginTop: 10 }}>{s.checklist.map((c) => <li key={c}><ShieldCheck size={15} style={{ flex: '0 0 auto', color: 'var(--oasis)' }} />{c}</li>)}</ul>}
        <button className={`mv-btn full ${saved ? 'oasis' : 'ghost'}`} style={{ marginTop: 12 }} aria-pressed={saved} onClick={() => ctx.move.toggleSport(s.id)} data-testid={`button-save-sport-${s.id}`}>
          {saved ? <><BookmarkCheck size={16} /> Saved</> : <><Bookmark size={16} /> Save</>}
        </button>
      </section>;
    })}</div>
  </main>;
}
