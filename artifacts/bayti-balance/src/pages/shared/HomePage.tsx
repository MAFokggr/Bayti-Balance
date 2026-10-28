import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight, Activity, Bed, Brush, CalendarCheck, Droplets, Footprints, GlassWater, HelpCircle, MonitorSmartphone, Plus, Sparkles,
  Star, Users, Utensils, Wand2, Zap, Armchair, Wind, Heart,
} from 'lucide-react';
import type { FamilyStore } from '@/hooks/use-family-store';
import { useFamilyWeather } from '@/hooks/use-family-weather';
import { dayKey, familyGuide, memberProgress, sumReps, waterFor, weeklyProgress } from '@/lib/family-data';
import type { Member } from '@/lib/family-types';
import { Demo, MemberAvatar, Ring, SafetyNote } from '@/components/shared/kit';
import { AdaptPanel, GuideCard, MessageBoard, Tile, TimelineItem, WeatherCard } from '@/components/shared/HomeParts';
import { EnergyBars } from './WhoPage';

const ENERGY: Member['energy'][] = ['low', 'balanced', 'bright'];

export default function HomePage({ store }: { store: FamilyStore }) {
  const { data, current } = store;
  const weather = useFamilyWeather(data.weatherOverride);
  const [now, setNow] = useState(() => new Date());
  const [adaptOpen, setAdaptOpen] = useState(false);
  useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(t); }, []);

  const s = data.familySettings;
  const today = dayKey();
  const water = waterFor(data, current.id, today);
  const waterTarget = current.waterTarget || 1500;
  const reps = sumReps(data, current.id, today);
  const timeline = data.timeline;
  const meal = timeline.find((i) => i.kind === 'meal');
  const movement = timeline.find((i) => i.kind === 'movement' || i.kind === 'walk');
  const chores = timeline.filter((i) => i.kind === 'chore');
  const choreDone = chores.reduce((n, c) => n + c.completedBy.length, 0);
  const choreTotal = chores.length * Math.max(1, data.members.length);
  const next = timeline.find((i) => !i.completedBy.includes(current.id));
  const week = weeklyProgress(data);
  const guide = familyGuide(data, weather, now);
  const isChild = current.ageGroup === 'child';
  const isSenior = current.ageGroup === 'senior';
  const isParent = current.ageGroup === 'adult';
  const energyCounts = ENERGY.map((e) => data.members.filter((m) => m.energy === e).length);
  const familyEnergy = energyCounts[2] >= energyCounts[0] && energyCounts[2] >= energyCounts[1] ? 'bright' : energyCounts[0] > energyCounts[1] ? 'low' : 'balanced';
  const me = memberProgress(data, current.id, today);

  return <main className={`sl-page motion-in ${isSenior ? 'sl-senior' : ''}`}>
    <div className="sl-between">
      <div><div className="eyebrow">{data.family} · {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
        <h1 className="title" style={{ fontSize: isChild ? 40 : 34, margin: '6px 0 4px' }} data-testid="text-greeting">{isChild ? `Hi ${current.name}!` : `Good day, ${current.name}.`}</h1></div>
      <Link href="/who" aria-label="Change member" data-testid="link-who"><Ring percent={me.percent} size={60} color={current.color} label="Your progress"><MemberAvatar member={current} size={42} /></Ring></Link>
    </div>
    {data.isSample && <p className="sl-sub" style={{ marginBottom: 8 }}>Sample family <Demo /></p>}

    <WeatherCard weather={weather} override={data.weatherOverride} onOverride={store.setWeatherOverride} now={now} />
    {!isChild && <GuideCard text={guide} minutes={s.minutes} onMinutes={store.setAvailableMinutes} />}

    {isChild && <section style={{ marginTop: 14 }}>
      <div className="sl-guide" style={{ marginTop: 0 }}><div className="sl-between"><Sparkles size={18} /><Demo text="Demo · rule-based" /></div><p data-testid="text-guide">{guide}</p></div>
      <div className="sl-kid-grid" style={{ marginTop: 12 }}>
        <Link href="/camera-test" className="sl-kid-tile" style={{ background: '#F59B7A' }} data-testid="kid-move"><Activity size={40} />Move<span style={{ fontSize: 13 }}>{reps} reps</span></Link>
        <button className="sl-kid-tile" style={{ background: '#78D5C5' }} onClick={() => store.addWater(200)} data-testid="kid-water"><GlassWater size={40} />+1 cup<span style={{ fontSize: 13 }}>{water} / {waterTarget} ml</span></button>
        <button className="sl-kid-tile" style={{ background: '#F6D477' }} disabled={!next} onClick={() => next && store.completeActivity(next.id)} data-testid="kid-next"><Star size={40} />{next ? 'Done!' : 'All done'}<span style={{ fontSize: 12 }}>{next?.title ?? 'Great day'}</span></button>
        <div className="sl-kid-tile" style={{ background: '#CDBBEA' }}><Bed size={40} />{current.sleepTarget || s.sleepTarget} h<span style={{ fontSize: 12 }}>sleep</span></div>
        <div className="sl-kid-tile" style={{ background: '#A9D9B8' }}><Utensils size={36} />Meal<span style={{ fontSize: 12 }}>{meal?.title ?? 'Choose together'}</span></div>
        <div className="sl-kid-tile" style={{ background: '#E9C98B' }}><MonitorSmartphone size={36} />{s.screenTimeGoal} h<span style={{ fontSize: 12 }}>screen goal</span></div>
        <div className="sl-kid-tile" style={{ background: '#F6D477' }}><Brush size={36} />{choreDone}/{choreTotal}<span style={{ fontSize: 12 }}>family chores</span></div>
        <div className="sl-kid-tile" style={{ background: '#78D5C5' }}><Zap size={30} /><span style={{ fontSize: 14 }}>Family energy</span><EnergyBars energy={familyEnergy} /><div className="sl-row" role="group" aria-label="My energy">{ENERGY.map((energy) => <button key={energy} className="sl-chip" aria-pressed={current.energy === energy} onClick={() => store.setEnergy(current.id, energy)}>{energy === 'low' ? 'Low' : energy === 'balanced' ? 'OK' : 'Bright'}</button>)}</div></div>
      </div>
    </section>}

    {isSenior && <section className="sl-card" style={{ marginTop: 14 }} data-testid="card-gentle">
      <div className="eyebrow sl-row" style={{ gap: 5 }}><Heart size={14} /> Gentle options for you</div>
      <div className="sl-stack" style={{ marginTop: 10 }}>
        {[{ t: 'Chair stretches', d: '8 minutes, seated', I: Armchair }, { t: 'Slow walk indoors', d: '10 minutes, at your pace', I: Footprints }, { t: 'Deep breathing', d: '5 slow breaths', I: Wind }].map(({ t, d, I }) =>
          <div key={t} className="sl-row" style={{ gap: 12 }}><span className="sl-option-icon" style={{ background: '#CDBBEA' }}><I size={20} /></span><div><strong>{t}</strong><div className="sl-sub" style={{ margin: 0 }}>{d}</div></div></div>)}
      </div>
      <p className="sl-sub">Stop if anything hurts. Sit down to rest whenever you like.</p>
    </section>}

    {isParent && <section className="sl-card" style={{ marginTop: 14 }} data-testid="card-whole-family">
      <div className="eyebrow sl-row" style={{ gap: 5 }}><Users size={14} /> Whole family today</div>
      <div className="sl-family-strip" style={{ marginTop: 10 }}>
        {data.members.map((m) => { const p = memberProgress(data, m.id, today); return <div key={m.id} data-testid={`family-${m.id}`}>
          <Ring percent={p.percent} size={54} stroke={5} color="#4877E8" label={`${m.name} progress`}><MemberAvatar member={m} size={38} /></Ring>
          <span>{m.name.split(' ').slice(-1)[0]}</span><span style={{ fontSize: 10, color: '#5b6f80' }}>{p.actions}/{p.goal} · {waterFor(data, m.id, today)} ml</span>
        </div>; })}
      </div>
    </section>}

    {!isChild && <><div className="sl-grid2" style={{ marginTop: 14 }}>
      <Tile label="Family energy" Icon={Zap} testid="tile-energy">
        <EnergyBars energy={familyEnergy} />
        <div className="sl-row" style={{ gap: 4 }} role="group" aria-label="My energy">{ENERGY.map((e) => <button key={e} className="sl-chip" style={{ padding: '4px 8px', minHeight: 28, fontSize: 10 }} aria-pressed={current.energy === e} onClick={() => store.setEnergy(current.id, e)} data-testid={`button-energy-${e}`}>{e === 'low' ? 'Low' : e === 'balanced' ? 'OK' : 'Bright'}</button>)}</div>
      </Tile>
      <Tile label="Water" Icon={Droplets} testid="tile-water">
        <div className="sl-stat" data-testid="text-water">{water}<span style={{ fontSize: 12 }}> / {waterTarget} ml</span></div>
        <div className="sl-bar"><span style={{ width: `${Math.min(100, (water / waterTarget) * 100)}%` }} /></div>
        <button className="sl-btn sl-btn-sm sl-btn-soft" onClick={() => store.addWater(250)} data-testid="button-add-water"><Plus size={13} /> 250 ml</button>
      </Tile>
      <Tile label="Movement" Icon={Footprints} testid="tile-movement">
        <div className="sl-stat" data-testid="text-reps">{reps}<span style={{ fontSize: 12 }}> reps saved</span></div>
        <div style={{ fontSize: 11, fontWeight: 700 }}>{movement ? `${movement.title}, ${movement.minutes} min` : 'No movement planned'}</div>
        <Link href="/camera-test" className="sl-btn sl-btn-sm" data-testid="link-camera">Camera coach <ArrowRight size={13} /></Link>
      </Tile>
      <Tile label="Today's meal" Icon={Utensils} testid="tile-meal">
        <strong style={{ fontSize: 14 }}>{meal?.title ?? 'No meal planned yet'}</strong>
        <span style={{ fontSize: 11, color: '#5b6f80' }}>{meal?.description ?? `${s.cuisine} ideas`}</span>
      </Tile>
      <Tile label="Sleep target" Icon={Bed} testid="tile-sleep"><div className="sl-stat">{current.sleepTarget || s.sleepTarget} h</div><span style={{ fontSize: 11 }}>Lights down 30 min before</span></Tile>
      <Tile label="Screen time" Icon={MonitorSmartphone} testid="tile-screen"><div className="sl-stat">{s.screenTimeGoal} h</div><span style={{ fontSize: 11 }}>Daily goal, outside school</span></Tile>
    </div>
    <div className="sl-tile" style={{ marginTop: 10 }} data-testid="tile-chores">
      <div className="sl-between"><span className="eyebrow"><Brush size={12} />Chore progress</span><strong>{choreDone}/{choreTotal || 0}</strong></div>
      <div className="sl-bar"><span style={{ width: `${choreTotal ? (choreDone / choreTotal) * 100 : 0}%`, background: '#F6D477' }} /></div>
      <span style={{ fontSize: 11 }}>{chores.length ? chores.map((c) => c.title).join(', ') : 'No chores in today\'s plan'}</span>
    </div></>}

    <section className="sl-card sl-card-navy" style={{ marginTop: 14 }} data-testid="card-next">
      <div className="eyebrow">Suggested next action</div>
      <h3 style={{ margin: '6px 0 2px', fontSize: 19, fontWeight: 900 }}>{next ? next.title : 'Everything is done for you today'}</h3>
      <p className="sl-sub">{next ? `${next.time} · ${next.minutes} min · ${next.indoor ? 'indoors' : 'outdoors'}` : 'Rest well. Tomorrow brings a fresh plan.'}</p>
      {next && <button className="sl-btn sl-btn-blue sl-btn-sm" style={{ marginTop: 10 }} onClick={() => store.completeActivity(next.id)} data-testid="button-complete-next">Mark it done</button>}
    </section>

    <button className="sl-btn sl-full" style={{ marginTop: 14, minHeight: 58, fontSize: 16, background: '#4877E8' }} onClick={() => setAdaptOpen(true)} data-testid="button-adapt"><Wand2 size={19} /> Adapt today's plan</button>
    <div className="sl-why" data-testid="card-why"><div className="eyebrow sl-row" style={{ gap: 5 }}><HelpCircle size={13} />Why did the plan change?</div>
      <p style={{ margin: '6px 0 0', fontWeight: 800, fontSize: 14 }} data-testid="text-why">{data.lastPlanReason || 'No changes yet. This is the original plan built from your family answers.'}</p></div>

    <h2 className="sl-h2"><CalendarCheck size={18} />Today's timeline</h2>
    {timeline.length ? <div className="sl-timeline">{timeline.map((item) => <TimelineItem key={item.id} item={item} store={store} compact={isChild} />)}</div>
      : <div className="sl-empty"><CalendarCheck size={22} /><br />No plan yet. Build your family plan to fill the day.<br /><Link href="/register" className="sl-btn sl-btn-sm" style={{ marginTop: 10 }}>Build plan</Link></div>}

    <h2 className="sl-h2"><Star size={18} />Shared weekly goal</h2>
    <section className="sl-card" data-testid="card-weekly">
      <div className="sl-row" style={{ gap: 14 }}>
        <Ring percent={week.percent} size={86} stroke={9} color="#4877E8" label="Weekly goal">{week.done}/{week.target}</Ring>
        <div><strong>{week.label}</strong><p className="sl-sub">Everyone counts together. No rankings.</p></div>
      </div>
      <div className="sl-grid2" style={{ marginTop: 12 }}>
        <button className="sl-option" aria-pressed={s.weeklyGoalType === 'activities'} onClick={() => store.setWeeklyGoal('activities')} data-testid="button-goal-activities"><span className="sl-option-icon"><Users size={18} /></span><span style={{ fontSize: 12 }}>Three shared activities</span></button>
        <button className="sl-option" aria-pressed={s.weeklyGoalType === 'walks'} onClick={() => store.setWeeklyGoal('walks')} data-testid="button-goal-walks"><span className="sl-option-icon"><Footprints size={18} /></span><span style={{ fontSize: 12 }}>Walk together twice</span></button>
      </div>
    </section>

    <h2 className="sl-h2">Messages</h2>
    <MessageBoard store={store} />
    <SafetyNote />
    {adaptOpen && <AdaptPanel store={store} onClose={() => setAdaptOpen(false)} />}
  </main>;
}
