import { Link } from 'wouter';
import { Users, Dumbbell, Rabbit, MapPinned, ArrowRight, Camera } from 'lucide-react';
import { MoveHeader, OasisScene, isHot, type MoveCtx } from '@/components/move/kit';

const CARDS = [
  { href: '/move/oasis', title: 'Parent and child', sub: 'Build the Oasis together, one turn each.', Icon: Users, bg: '#78D5C5', id: 'oasis' },
  { href: '/move/gym', title: 'Gym and walking', sub: 'A gentle weekly plan, walks and sports.', Icon: Dumbbell, bg: '#F59B7A', id: 'gym' },
  { href: '/move/games', title: 'Kids games', sub: 'Rabbit Jump Quest and Star Rope.', Icon: Rabbit, bg: '#F6D477', id: 'games' },
  { href: '/move/trip', title: 'Plan an activity', sub: 'An Abu Dhabi family outing on a map.', Icon: MapPinned, bg: '#CDBBEA', id: 'trip' },
];

export default function MoveLanding({ ctx }: { ctx: MoveCtx }) {
  const { member, move, weather } = ctx;
  const mine = move.data.sessions.filter((s) => s.memberId === member.id);
  return <main className="mv-page mv-sky motion-in">
    <MoveHeader back="/home" kicker={`Move · ${member.name}`} title={<>Move at<br />your own pace.</>} weather={weather}
      lead={isHot(weather) ? 'It is hot or dusty outside, so Move will suggest indoor-safe options today.' : 'Pick a corner of the oasis. Small moves count.'} />
    <OasisScene pieces={move.data.oasis.pieces} />
    <div className="mv-stack">
      {CARDS.map((c, i) => <Link key={c.href} href={c.href} className="mv-big" style={{ background: c.bg, animationDelay: `${i * 70}ms` }} data-testid={`card-move-${c.id}`}>
        <div className="mv-ico"><c.Icon size={22} /></div>
        <div><h2>{c.title}</h2><p>{c.sub}</p></div>
        <ArrowRight size={22} style={{ position: 'absolute', right: 18, top: 18 }} />
      </Link>)}
    </div>
    <div className="mv-card soft" style={{ marginTop: 16 }}>
      <div className="mv-row"><Camera size={18} /><strong>Your sessions</strong><span className="mv-grow" /><span className="mv-tag" data-testid="text-session-count">{mine.length}</span></div>
      {mine.length === 0 ? <p className="mv-fine" style={{ margin: '8px 0 0' }}>Nothing yet. Your first finished move will appear here with its +5 points.</p>
        : <ul className="mv-list" style={{ marginTop: 10 }}>{mine.slice(-3).reverse().map((s) => <li key={s.id} data-testid={`row-session-${s.id}`}><strong>{s.label}</strong><span className="mv-grow" /><span>{s.reps} reps · {s.mode}</span></li>)}</ul>}
      <Link href="/camera-test" className="mv-fine" style={{ display: 'inline-block', marginTop: 10, textDecoration: 'underline' }} data-testid="link-free-practice">Free camera practice</Link>
    </div>
  </main>;
}
