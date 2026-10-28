import { Link } from 'wouter';
import { Rabbit, Star, Trophy } from 'lucide-react';
import { MoveHeader, type MoveCtx } from '@/components/move/kit';

export function GamesPage({ ctx }: { ctx: MoveCtx }) {
  const rb = ctx.move.data.rabbitBest[ctx.member.id];
  const ropeBest = Math.max(0, ...Object.entries(ctx.move.data.ropeBest).filter(([k]) => k.startsWith(ctx.member.id)).map(([, v]) => v));
  return <main className="mv-page mv-kids motion-in">
    <MoveHeader kicker={`Kids games · ${ctx.member.name}`} title={<>Let's<br />play!</>} weather={ctx.weather} />
    <div className="mv-stack">
      <Link href="/move/rabbit" className="mv-big" style={{ background: '#F6D477', minHeight: 190 }} data-testid="card-game-rabbit">
        <div className="mv-ico"><Rabbit size={26} /></div>
        <div><h2 style={{ fontSize: 30 }}>Rabbit Jump Quest</h2><p>Jump to hop across the garden.</p></div>
        {rb && <span className="mv-tag" style={{ position: 'absolute', right: 16, top: 18 }}><Trophy size={11} /> {rb.stars} stars</span>}
      </Link>
      <Link href="/move/rope" className="mv-big" style={{ background: '#17183F', color: '#FBF8F1', minHeight: 190 }} data-testid="card-game-rope">
        <div className="mv-ico" style={{ color: 'var(--navy)', background: '#F6D477' }}><Star size={26} /></div>
        <div><h2 style={{ fontSize: 30 }}>Star Rope</h2><p>Jump when the glow hits the ground.</p></div>
        {ropeBest > 0 && <span className="mv-tag sun" style={{ position: 'absolute', right: 16, top: 18 }}><Trophy size={11} /> best {ropeBest}</span>}
      </Link>
    </div>
  </main>;
}
