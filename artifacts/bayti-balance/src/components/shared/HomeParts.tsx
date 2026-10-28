import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle, Bot, Check, CheckCheck, Clock, Droplets, Footprints, Gamepad2, Home, Loader2, MessageCircle, RefreshCw,
  Send, Sparkles, Timer, Users, Utensils, Wand2, Feather, BatteryLow, Carrot, Star, Heart, MoonStar, Brush, X,
} from 'lucide-react';
import type { FamilyStore } from '@/hooks/use-family-store';
import type { AdaptationId, FamilyMessage, PlanItem, PlanKind, WeatherMode, WeatherReading } from '@/lib/family-types';
import { Demo, MemberAvatar, STICKERS, WEATHER_META } from './kit';

export const KIND_ICON: Record<PlanKind, typeof Home> = { movement: Footprints, walk: Footprints, water: Droplets, meal: Utensils, chore: Brush, recover: MoonStar };

export function WeatherCard({ weather, override, onOverride, now }: { weather: WeatherReading & { retry: () => void }; override: WeatherMode | 'live'; onOverride: (m: WeatherMode | 'live') => void; now: Date }) {
  const meta = WEATHER_META[weather.mode];
  return <section className={`sl-weather mode-${weather.mode}`} data-testid="card-weather">
    <div className="sl-between" style={{ position: 'relative' }}>
      <div>
        <div className="eyebrow" style={{ color: '#c9d4ea' }}>Abu Dhabi {weather.isDemo ? <Demo /> : <span className="sl-demo sl-live">Live</span>}</div>
        {weather.loading ? <div className="sl-weather-temp" aria-busy="true"><Loader2 className="animate-spin" size={30} /></div>
          : <div className="sl-weather-temp" data-testid="text-temperature">{Math.round(weather.temperature)}°C</div>}
        <div style={{ fontWeight: 800, fontSize: 13 }}>{meta.label}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <meta.Icon size={38} strokeWidth={2} color="#F6D477" />
        <div className="sl-row" style={{ gap: 4, fontWeight: 900, fontSize: 18, marginTop: 6, justifyContent: 'flex-end' }} data-testid="text-clock" aria-label="Current Abu Dhabi time"><Clock size={15} />{now.toLocaleTimeString([], { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
    {weather.error && <div className="sl-row" style={{ fontSize: 11, marginTop: 8, position: 'relative', gap: 6 }}><AlertTriangle size={13} />Live weather unavailable, showing Demo values.<button className="sl-chip" style={{ minHeight: 28, padding: '3px 9px' }} onClick={weather.retry} data-testid="button-weather-retry"><RefreshCw size={12} />Retry</button></div>}
    <div className="sl-seg" role="group" aria-label="Weather demo control">
      <button aria-pressed={override === 'live'} onClick={() => onOverride('live')} data-testid="button-weather-live">Live</button>
      {(Object.keys(WEATHER_META) as WeatherMode[]).map((k) => { const W = WEATHER_META[k]; return <button key={k} aria-pressed={override === k} onClick={() => onOverride(k)} data-testid={`button-weather-${k}`}><W.Icon size={12} />{W.label}</button>; })}
    </div>
  </section>;
}

export function GuideCard({ text, minutes, onMinutes }: { text: string; minutes: number; onMinutes: (v: number) => void }) {
  return <section className="sl-guide" data-testid="card-guide" aria-live="polite">
    <div className="sl-between"><span className="eyebrow sl-row" style={{ gap: 5 }}><Bot size={14} /> Family guide</span><Demo text="Demo · rule-based" /></div>
    <p data-testid="text-guide">{text}</p>
    <div className="sl-row" style={{ marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
      <span className="sl-row" style={{ gap: 4, fontSize: 12, fontWeight: 800 }}><Timer size={14} />Time free now</span>
      {[10, 20, 30, 45, 60].map((v) => <button key={v} className="sl-chip" aria-pressed={minutes === v} onClick={() => onMinutes(v)} data-testid={`button-minutes-${v}`}>{v} min</button>)}
    </div>
    <p className="sl-sub" style={{ fontSize: 11, fontWeight: 600 }}>Written by simple if-then rules from weather, time and minutes. Not a language model.</p>
  </section>;
}

export function TimelineItem({ item, store, compact }: { item: PlanItem; store: FamilyStore; compact?: boolean }) {
  const { current, data } = store;
  const mine = item.completedBy.includes(current.id);
  const all = data.members.length > 0 && data.members.every((m) => item.completedBy.includes(m.id));
  const parent = current.ageGroup === 'adult';
  const Icon = KIND_ICON[item.kind] ?? Sparkles;
  const variant = item.variants[current.id] ?? item.variants[current.ageGroup];
  return <div className="sl-tl-item" data-testid={`timeline-${item.id}`}>
    <div className="sl-tl-dot">{item.time}</div>
    <div className={`sl-tl-body ${mine ? 'done' : ''}`}>
      <div className="sl-between" style={{ alignItems: 'flex-start' }}>
        <div className="sl-row" style={{ gap: 8, alignItems: 'flex-start' }}><Icon size={17} style={{ marginTop: 2, flex: '0 0 auto' }} /><div><h4>{item.title}</h4>
          {!compact && <p className="sl-sub" style={{ fontSize: 12, marginTop: 2 }}>{item.description}</p>}
          <div className="sl-row" style={{ gap: 8, fontSize: 11, fontWeight: 800, marginTop: 4, color: '#41566a', flexWrap: 'wrap' }}>
            {item.minutes > 0 && <span>{item.minutes} min</span>}{item.reps > 0 && <span>{item.reps} reps</span>}<span>{item.indoor ? 'Indoors' : 'Outdoors'}</span><span>{item.completedBy.length}/{data.members.length} done</span>
          </div></div></div>
      </div>
      {variant && !compact && <div className="sl-tl-variant"><strong>For {current.name}:</strong> {variant}</div>}
      <div className="sl-row" style={{ gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
        <button className={`sl-btn sl-btn-sm ${mine ? 'sl-btn-soft' : ''}`} disabled={mine} onClick={() => store.completeActivity(item.id)} data-testid={`button-complete-${item.id}`}>{mine ? <><Check size={14} /> Done</> : <><Check size={14} /> I did it</>}</button>
        {parent && !all && <button className="sl-btn sl-btn-sm sl-btn-ghost" onClick={() => store.completeActivity(item.id, data.members.map((m) => m.id))} data-testid={`button-complete-all-${item.id}`}><CheckCheck size={14} /> Done together</button>}
      </div>
    </div>
  </div>;
}

const ADAPT: { id: AdaptationId; label: string; note: string; Icon: typeof Home; bg: string }[] = [
  { id: 'less-time', label: 'We have less time', note: '10 to 15 min each', Icon: Timer, bg: '#F6D477' },
  { id: 'tired', label: 'Someone is tired', note: 'Swap to stretching', Icon: BatteryLow, bg: '#CDBBEA' },
  { id: 'indoors', label: 'Make it indoors', note: 'Move outdoor items in', Icon: Home, bg: '#78D5C5' },
  { id: 'everyone', label: 'Include everyone', note: 'Senior and child versions', Icon: Users, bg: '#A9D9B8' },
  { id: 'water', label: 'Add a water break', note: 'Insert water breaks', Icon: Droplets, bg: '#78D5C5' },
  { id: 'pantry', label: 'Use ingredients at home', note: 'Dinner from pantry', Icon: Carrot, bg: '#F59B7A' },
  { id: 'fun', label: 'Make it more fun', note: 'Add a game round', Icon: Gamepad2, bg: '#F6D477' },
  { id: 'easier', label: 'Make it easier', note: 'Fewer reps, shorter', Icon: Feather, bg: '#E9C98B' },
];
const PANTRY_CHOICES = ['Rice', 'Lentils', 'Eggs', 'Tomatoes', 'Yoghurt', 'Chickpeas', 'Cucumber', 'Dates', 'Bread', 'Chicken'];

export function AdaptPanel({ store, onClose }: { store: FamilyStore; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pantryPick, setPantryPick] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);
  const pantry = store.data.familySettings.pantryItems;
  const apply = (id: AdaptationId) => {
    setError(null);
    if (id === 'pantry' && !pantry.length) { setPantryPick([]); return; }
    try { store.adaptPlan(id); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'The plan could not change.'); }
  };
  useEffect(() => {
    if (!pending || !pantry.length) return;
    setPending(false);
    try { store.adaptPlan('pantry'); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'The plan could not change.'); }
  }, [pending, pantry.length, store, onClose]);
  const savePantry = () => {
    if (!pantryPick?.length) return;
    const items = pantryPick;
    store.setData((d) => ({ ...d, familySettings: { ...d.familySettings, pantryItems: items } }));
    setPending(true);
  };
  return <div className="sl-modal-back" onClick={onClose}>
    <div className="sl-modal" role="dialog" aria-modal="true" aria-label="Adapt today's plan" onClick={(e) => e.stopPropagation()}>
      <div className="sl-between"><h2 style={{ margin: 0, fontWeight: 900, fontSize: 22 }}>Adapt today's plan</h2><button className="sl-icon-btn" onClick={onClose} aria-label="Close" data-testid="button-close-adapt"><X size={18} /></button></div>
      {pantryPick ? <>
        <p className="sl-sub" style={{ fontSize: 14 }}>No pantry items saved yet. What do you have at home?</p>
        <div className="sl-chips" style={{ marginTop: 12 }}>{PANTRY_CHOICES.map((f) => { const on = pantryPick.includes(f); return <button key={f} className="sl-chip" aria-pressed={on} onClick={() => setPantryPick(on ? pantryPick.filter((x) => x !== f) : [...pantryPick, f])} data-testid={`chip-pantry-${f}`}>{on && <Check size={13} />}{f}</button>; })}</div>
        <div className="sl-row" style={{ marginTop: 16 }}>
          <button className="sl-btn" disabled={!pantryPick.length || pending} onClick={savePantry} data-testid="button-apply-pantry">{pending ? <Loader2 className="animate-spin" size={16} /> : <Utensils size={16} />} Plan dinner</button>
          <button className="sl-btn sl-btn-ghost" onClick={() => setPantryPick(null)}>Back</button>
        </div>
      </> : <div className="sl-adapt-grid" style={{ marginTop: 14 }}>
        {ADAPT.map(({ id, label, note, Icon, bg }) => <button key={id} className="sl-option sl-option-tile" style={{ alignItems: 'flex-start', textAlign: 'left' }} onClick={() => apply(id)} data-testid={`button-adapt-${id}`}>
          <span className="sl-option-icon" style={{ background: bg }}><Icon size={19} /></span><span style={{ fontSize: 13 }}>{label}<small>{note}</small></span>
        </button>)}
      </div>}
      {error && <div className="sl-why" role="alert" style={{ fontSize: 13 }}><AlertTriangle size={14} /> {error}</div>}
    </div>
  </div>;
}

const QUICK = ['Join me for a walk', 'Water break', 'Dinner is ready', 'You can do it', 'I completed my workout'];
export function MessageBoard({ store }: { store: FamilyStore }) {
  const { data, current } = store;
  const [sticker, setSticker] = useState<FamilyMessage['sticker']>('star');
  const msgs = [...data.messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const others = data.members.filter((m) => m.id !== current.id);
  const simulate = () => {
    if (!others.length) return;
    const who = others[Math.floor(Math.random() * others.length)];
    const keys = Object.keys(STICKERS) as FamilyMessage['sticker'][];
    store.sendMessage(QUICK[Math.floor(Math.random() * QUICK.length)], keys[Math.floor(Math.random() * keys.length)], who.id);
  };
  return <section className="sl-card" data-testid="card-messages">
    <div className="sl-between"><span className="eyebrow sl-row" style={{ gap: 5 }}><MessageCircle size={14} /> Family board</span><Demo text="Demo · simulated" /></div>
    <div className="sl-row" style={{ gap: 6, marginTop: 10 }}>{(Object.keys(STICKERS) as FamilyMessage['sticker'][]).map((k) => { const S = STICKERS[k]; return <button key={k} className="sl-chip" aria-pressed={sticker === k} aria-label={`${k} sticker`} onClick={() => setSticker(k)} data-testid={`button-sticker-${k}`}><S size={15} /></button>; })}</div>
    <div className="sl-chips" style={{ marginTop: 8 }}>{QUICK.map((t) => <button key={t} className="sl-chip" onClick={() => store.sendMessage(t, sticker)} data-testid={`button-message-${t}`}><Send size={12} />{t}</button>)}</div>
    <div className="sl-stack" style={{ marginTop: 12 }}>
      {msgs.length ? msgs.map((msg) => { const who = data.members.find((m) => m.id === msg.memberId); const S = STICKERS[msg.sticker] ?? Star; return <div key={msg.id} className="sl-msg" data-testid={`message-${msg.id}`}>
        {who ? <MemberAvatar member={who} size={32} /> : <Heart size={22} />}
        <div className="sl-msg-bubble"><div className="sl-between"><span style={{ fontSize: 11, color: '#5b6f80' }}>{who?.name ?? 'Family'}{msg.demo && <> · <Demo /></>}</span><S size={15} color="#c08a1e" /></div>{msg.text}</div>
      </div>; }) : <div className="sl-empty"><MessageCircle size={20} /><br />No messages yet. Send a sticker to start.</div>}
    </div>
    <button className="sl-btn sl-btn-soft sl-btn-sm" style={{ marginTop: 10 }} onClick={simulate} disabled={!others.length} data-testid="button-simulate-message"><Wand2 size={14} /> Simulate a reply</button>
  </section>;
}

export function Tile({ label, Icon, children, testid }: { label: string; Icon: typeof Home; children: ReactNode; testid: string }) {
  return <div className="sl-tile" data-testid={testid}><span className="eyebrow"><Icon size={12} />{label}</span>{children}</div>;
}
