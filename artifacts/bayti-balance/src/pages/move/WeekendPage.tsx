import { Link } from 'wouter';
import { Moon, Sunset, Utensils, Droplets, Volleyball, Salad, Footprints, Wand2 } from 'lucide-react';
import { weekendPlan } from '@/lib/move-data';
import { MoveHeader, type MoveCtx } from '@/components/move/kit';

const pick = (t: string) => /sunset|walk/i.test(t) ? Sunset : /dinner/i.test(t) ? Utensils : /water/i.test(t) ? Droplets : /sport/i.test(t) ? Volleyball : /restaurant|healthy/i.test(t) ? Salad : /recover|evening/i.test(t) ? Moon : Footprints;

export default function WeekendPage({ ctx }: { ctx: MoveCtx }) {
  const plan = ctx.move.data.trip;
  const items = plan ? weekendPlan(plan) : [];
  return <main className="mv-page mv-sky motion-in">
    <MoveHeader back="/move/trip" kicker="Weekend plan" title={<>Friday to<br />Saturday.</>} weather={ctx.weather} demo="Demo estimates" lead="A gentle weekend built from your route. Check times and venues before you go." />
    {!plan ? <div className="mv-card soft" style={{ textAlign: 'center' }}><p className="mv-lead">Build a route first and your weekend appears here.</p><Link href="/move/trip" className="mv-btn sun" data-testid="link-build-trip"><Wand2 size={16} /> Build a route</Link></div> :
      <div className="mv-week">{items.map((it, i) => { const I = pick(it.title); return <div key={`${it.day}-${i}`} className="mv-week-item" data-testid={`row-weekend-${i}`}>
        <div className="mv-week-day">{it.day}</div>
        <div className="mv-card soft" style={{ margin: 0 }}><div className="mv-row"><I size={17} /><strong>{it.title}</strong></div><p className="mv-fine" style={{ margin: '5px 0 0' }}>{it.description}</p></div>
      </div>; })}</div>}
  </main>;
}
