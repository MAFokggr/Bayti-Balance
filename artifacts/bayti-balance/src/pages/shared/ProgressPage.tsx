import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Activity, ArrowRight, ChefHat, MoonStar, Award, CalendarDays, Droplets, Flag, Footprints, HandHeart, Lightbulb, Medal, Sparkles, Star, TrendingUp, Trophy, Users } from 'lucide-react';
import type { FamilyStore } from '@/hooks/use-family-store';
import { familyLeaderboard } from '@/lib/family-points';
import { dateOffset, dayKey, getComparisons, memberProgress, recognitionFor, streakFor, sumReps, waterFor, weeklyProgress } from '@/lib/family-data';
import { Demo, MemberAvatar, Ring, SafetyNote } from '@/components/shared/kit';

export default function ProgressPage({ store }: { store: FamilyStore }) {
  const { data, current } = store;
  const today = dayKey();
  const [day, setDay] = useState(today);
  const week = weeklyProgress(data);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => dateOffset(i - 13)), []);
  const memberIds = new Set(data.members.map((member) => member.id));
  const log = data.activityLog.filter((record) => memberIds.has(record.memberId));
  const dayRecords = log.filter((r) => r.day === day);
  const dayReps = Object.entries(data.reps).filter(([k, v]) => memberIds.has(k.split(':')[0]) && k.split(':')[1] === day && v > 0);
  const comps = getComparisons(data, current.id);
  const family = data.members.map((m) => ({ m, p: memberProgress(data, m.id, today) }));
  const familyPct = family.length ? family.reduce((s, x) => s + x.p.percent, 0) / family.length : 0;
  const stars = log.filter((r) => r.day === today).slice(0, 40);
  const contributed = family.filter((x) => x.p.actions > 0 || sumReps(data, x.m.id, today) > 0 || waterFor(data, x.m.id, today) > 0);
  const improved = comps.filter((c) => c.hasHistory && c.after > c.before);
  const lowWater = family.find((x) => waterFor(data, x.m.id, today) < (x.m.waterTarget || 1500) / 2);
  const nextTry = week.done < week.target ? `One more shared activity moves the weekly goal to ${week.done + 1} of ${week.target}.`
    : lowWater ? `A family water break could help ${lowWater.m.name} reach their water goal.` : 'Try a sunset walk together this evening.';
  const myReps = sumReps(data, current.id);
  const myWater = waterFor(data, current.id, today);
  const badges = [
    { label: 'First rep', on: myReps > 0, Icon: Activity, bg: '#F59B7A' },
    { label: '50 reps', on: myReps >= 50, Icon: Medal, bg: '#F6D477' },
    { label: 'Hydrated', on: myWater >= (current.waterTarget || 1500), Icon: Droplets, bg: '#78D5C5' },
    { label: 'Team player', on: log.some((r) => r.memberId === current.id && r.sharedId && !r.demo), Icon: HandHeart, bg: '#A9D9B8' },
    { label: 'Streak', on: streakFor(data, current.id) >= 3, Icon: Flag, bg: '#CDBBEA' },
    { label: 'Goal met', on: week.done >= week.target && week.target > 0, Icon: Trophy, bg: '#E9C98B' },
  ];
  const fmt = (n: number) => n.toLocaleString('en-US');
  const board = familyLeaderboard(data);
  const familyTotal = board.reduce((t, r) => t + r.points, 0);
  const leaders = board.filter((r) => r.rank === 1 && r.points > 0);

  return <main className="sl-page motion-in">
    <div className="eyebrow">{data.family} · friendly competition</div>
    <h1 className="title">Family<br />points.</h1>
    <section className="sl-card sl-card-navy" data-testid="card-leaderboard" aria-labelledby="board-title">
      <div className="sl-between"><h2 id="board-title" className="sl-row" style={{ gap: 8, margin: 0, fontSize: 18, fontWeight: 900 }}><Trophy size={19} color="#F6D477" />Family points board</h2><span className="eyebrow" data-testid="text-family-total">Family total {fmt(familyTotal)}</span></div>
      <p className="sl-sub" style={{ marginTop: 4 }}>{familyTotal === 0 ? 'Everyone starts at zero. Finish a Move session, a full recipe or a wind-down to score first.' : leaders.length > 1 ? `Tied at the top: ${leaders.map((r) => r.member.name).join(' and ')}.` : `${leaders[0]?.member.name} leads for now. Friendly competition only.`}</p>
      <ol style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 7 }}>{board.map((r) => { const me = r.member.id === current.id; return <li key={r.member.id} className="sl-row" aria-current={me ? 'true' : undefined} data-testid={`row-leader-${r.member.id}`} style={{ gap: 10, padding: '9px 11px', borderRadius: 16, background: me ? '#FBF8F1' : '#ffffff14', color: me ? '#17264D' : '#FBF8F1', border: `1.5px solid ${me ? '#F6D477' : 'transparent'}` }}>
        <strong style={{ width: 26, fontSize: 15 }} aria-label={`Rank ${r.rank}`}>{`#${r.rank}`}</strong><MemberAvatar member={r.member} size={32} /><span style={{ flex: 1, fontWeight: 800 }}>{r.member.name}{me && <small style={{ marginLeft: 6, fontSize: 11 }}>you</small>}</span><strong data-testid={`text-points-${r.member.id}`}>{fmt(r.points)} <small style={{ fontSize: 11 }}>pts</small></strong></li>; })}</ol>
      <div style={{ display: 'grid', gap: 6, marginTop: 14, fontSize: 12.5, fontWeight: 700 }} data-testid="text-earn-rules">
        <span className="sl-row" style={{ gap: 6 }}><Activity size={14} />Move: 5 per finished session</span>
        <span className="sl-row" style={{ gap: 6 }}><ChefHat size={14} />Eat: 5 for a fully completed recipe, once a day</span>
        <span className="sl-row" style={{ gap: 6 }}><MoonStar size={14} />Recover: 5 for a finished wind-down, once a day</span>
        <span className="sl-sub" style={{ marginTop: 2 }}>Water, photos and favourites never earn points. Points are for fun, not a health or fitness score.</span>
      </div>
      <div className="sl-row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}><Link href="/move" className="sl-btn sl-btn-soft sl-btn-sm">Move <ArrowRight size={14} /></Link><Link href="/eat/cooking" className="sl-btn sl-btn-soft sl-btn-sm">Cook <ArrowRight size={14} /></Link><Link href="/recover" className="sl-btn sl-btn-soft sl-btn-sm">Wind down <ArrowRight size={14} /></Link></div>
    </section>

    <section className="sl-card" data-testid="card-family-ring"><div className="sl-row" style={{ gap: 16 }}>
      <Ring percent={familyPct} size={104} stroke={11} color="#4877E8" label="Family progress today"><span style={{ fontSize: 20 }}>{Math.round(familyPct)}%</span></Ring>
      <div><strong style={{ fontSize: 17 }}>Shared family ring</strong><p className="sl-sub">Every action fills the same shared ring, alongside the points board.</p></div>
    </div></section>

    <h2 className="sl-h2"><Flag size={18} />Weekly goal path</h2>
    <section className="sl-card" data-testid="card-goal-path">
      <div className="sl-path">{Array.from({ length: Math.max(1, week.target) }, (_, i) => <span key={i} style={{ display: 'contents' }}>{i > 0 && <span className={i < week.done + 1 ? 'on' : ''} />}<i className={i < week.done ? 'on' : ''}>{i < week.done ? <Star size={12} /> : i + 1}</i></span>)}</div>
      <p className="sl-sub">{week.label}: {week.done} of {week.target}</p>
    </section>

    <h2 className="sl-h2"><CalendarDays size={18} />Calendar</h2>
    <div className="sl-cal" role="group" aria-label="Pick a day">{days.map((d) => { const has = log.some((r) => r.day === d) || Object.keys(data.reps).some((k) => k.split(':')[1] === d); const dt = new Date(`${d}T12:00:00Z`); return <button key={d} aria-pressed={day === d} onClick={() => setDay(d)} data-testid={`button-day-${d}`}><small>{dt.toLocaleDateString(undefined, { weekday: 'narrow' })}</small>{dt.getUTCDate()}{has ? <span className="sl-cal-dot" aria-label="has activity" /> : <span style={{ height: 5 }} />}</button>; })}</div>
    <section className="sl-card" style={{ marginTop: 10 }} data-testid="card-day-detail">
      <div className="eyebrow">{day === today ? 'Today' : new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
      {dayRecords.length || dayReps.length ? <div className="sl-stack" style={{ marginTop: 8 }}>
        {dayReps.map(([k, v]) => { const m = data.members.find((x) => x.id === k.split(':')[0]); return <div key={k} className="sl-between" style={{ fontSize: 13 }}><span className="sl-row" style={{ gap: 6 }}><Activity size={14} />{m?.name ?? 'Member'} · {k.split(':')[2]}</span><strong>{v} reps</strong></div>; })}
        {dayRecords.map((r) => { const m = data.members.find((x) => x.id === r.memberId); return <div key={r.id} className="sl-between" style={{ fontSize: 13 }}><span className="sl-row" style={{ gap: 6 }}><Star size={14} />{m?.name ?? 'Member'} · {r.label}</span><span className="sl-row" style={{ gap: 5 }}>{r.amount > 0 && <strong>{fmt(r.amount)}</strong>}{r.demo && <Demo />}</span></div>; })}
      </div> : <div className="sl-empty" style={{ marginTop: 8 }}><CalendarDays size={20} /><br />Nothing recorded on this day.</div>}
    </section>

    <h2 className="sl-h2"><TrendingUp size={18} />Before and after · {current.name}</h2>
    {comps.length ? <div className="sl-stack">{comps.map((c) => <div key={c.label} className="sl-card" data-testid={`card-compare-${c.label}`}>
      <div className="sl-between"><span className="eyebrow">{c.label}</span>{c.hasHistory && data.isSample && <Demo text="Sample history" />}</div>
      {c.hasHistory ? <div className="sl-ba" style={{ marginTop: 6 }}><span className="sl-ba-num">{fmt(c.before)} <small style={{ fontSize: 12 }}>{c.unit}</small></span><ArrowRight className="sl-arrow" size={26} /><span className="sl-ba-num" style={{ color: '#2c5bc9' }}>{fmt(c.after)} <small style={{ fontSize: 12 }}>{c.unit}</small></span></div>
        : <p className="sl-sub">Log on two different days to compare. Latest: {fmt(c.after)} {c.unit}.</p>}
    </div>)}</div> : <div className="sl-empty"><TrendingUp size={20} /><br />Log reps or water to see a before and after.</div>}

    <h2 className="sl-h2"><Award size={18} />{current.name}'s badges</h2>
    <div className="sl-grid3">{badges.map(({ label, on, Icon, bg }) => <div key={label} className={`sl-badge ${on ? '' : 'locked'}`} data-testid={`badge-${label}`}><span className="sl-badge-icon" style={{ background: on ? bg : 'transparent' }}><Icon size={24} /></span>{label}<span style={{ fontSize: 9, fontWeight: 700 }}>{on ? 'Earned' : 'Not yet'}</span></div>)}</div>

    <h2 className="sl-h2"><HandHeart size={18} />Recognition</h2>
    <div className="sl-stack">{data.members.map((m, i) => <div key={m.id} className="sl-card sl-row" style={{ gap: 12, borderLeft: `6px solid ${m.color}` }} data-testid={`card-recognition-${m.id}`}><MemberAvatar member={m} size={40} /><div><strong>{m.name}</strong><p className="sl-sub" style={{ margin: 0 }}>{recognitionFor(m, i)}</p></div></div>)}</div>

    <h2 className="sl-h2"><Sparkles size={18} />Family constellation</h2>
    <div className="sl-sky" data-testid="card-constellation" aria-label={`${stars.length} stars from today's actions`}>
      {stars.map((r, i) => { const x = (i * 37 + 11) % 88 + 4; const y = (i * 53 + 17) % 78 + 6; const m = data.members.find((mm) => mm.id === r.memberId); return <Star key={r.id} className="sl-star" size={10 + (i % 3) * 5} fill={m?.color ?? '#F6D477'} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i % 5) * 0.4}s, ${i * 0.05}s` }} />; })}
      {!stars.length && <div style={{ color: '#c9d4ea', display: 'grid', placeItems: 'center', height: '100%', fontSize: 13, fontWeight: 800, textAlign: 'center', padding: 20 }}>Complete an action and the first star appears.</div>}
    </div>
    <p className="sl-sub">{stars.length} {stars.length === 1 ? 'star' : 'stars'} today, one for each completed action.</p>

    <h2 className="sl-h2"><Lightbulb size={18} />Today's answers</h2>
    <div className="sl-stack">
      <div className="sl-card" data-testid="answer-who"><div className="eyebrow sl-row" style={{ gap: 5 }}><Users size={13} />Who contributed today?</div><p style={{ fontWeight: 800, margin: '6px 0 0' }}>{contributed.length ? contributed.map((x) => x.m.name).join(', ') : 'No one yet. The day is still open.'}</p></div>
      <div className="sl-card" data-testid="answer-improved"><div className="eyebrow sl-row" style={{ gap: 5 }}><TrendingUp size={13} />What improved?</div><p style={{ fontWeight: 800, margin: '6px 0 0' }}>{improved.length ? improved.map((c) => `${c.label}: ${fmt(c.before)} to ${fmt(c.after)} ${c.unit}`).join('. ') : 'Not enough history yet to compare.'}</p></div>
      <div className="sl-card" data-testid="answer-next"><div className="eyebrow sl-row" style={{ gap: 5 }}><Footprints size={13} />What should we try next?</div><p style={{ fontWeight: 800, margin: '6px 0 0' }}>{nextTry}</p></div>
    </div>
    <Link href="/home" className="sl-btn sl-btn-soft sl-full" style={{ marginTop: 16 }}>Back to today <ArrowRight size={15} /></Link>
    <SafetyNote />
  </main>;
}
