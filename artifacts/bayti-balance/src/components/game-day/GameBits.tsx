import { Clock3, PackageOpen, Sparkles, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { GAME_CONFIGS } from '@/lib/game-day';

type Game = (typeof GAME_CONFIGS)[number];
export function AiBadge() { return <span className="gd-badge gd-ai"><Sparkles size={12} /> AI-made card</span>; }
export function NeedBox({ text }: { text: string }) {
  return <div className="gd-need" data-testid="box-what-you-need"><PackageOpen size={16} /><span><b>What you need:</b> {text}</span></div>;
}
export function Timer({ seconds, total, label, testId }: { seconds: number; total: number; label: string; testId: string }) {
  const pct = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  return <div className={`gd-timer ${seconds <= 5 ? 'low' : ''}`} role="timer" aria-label={`${label}: ${seconds} seconds`}>
    <strong data-testid={testId}>{seconds}s</strong><span className="gd-timer-bar"><i style={{ transform: `scaleX(${pct})` }} /></span>
  </div>;
}
/** One game card used on Play and on the engine Choose screen. */
export function GameCard({ game, onPick, testId, delay = 0, children }: { game: Game; onPick: () => void; testId: string; delay?: number; children?: ReactNode }) {
  return <button className="gd-game" onClick={onPick} data-testid={testId} data-game={game.id} style={{ animationDelay: `${delay}s` }}>
    <span className="gd-game-icon" style={{ background: game.color }} aria-hidden="true">{game.icon}</span>
    <span className="gd-game-body">
      <strong>{game.name}</strong>{game.arabic && <span className="gd-ar" lang="ar" dir="rtl"> {game.arabic}</span>}
      <span className="gd-meta">
        <span className="gd-badge gd-mode"><Users size={11} /> {game.mode}</span>
        <span className="gd-badge">{game.players}</span>
        <span className="gd-badge"><Clock3 size={11} /> {game.time}</span>
      </span>
      {children}
    </span>
  </button>;
}
