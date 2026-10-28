import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Droplets, Footprints, Droplet, Waves, TreePalm, Spline, AlertTriangle, RotateCcw } from 'lucide-react';
import type { FamilyStore } from '@/hooks/use-family-store';
import type { useMoveStore } from '@/hooks/use-move-store';
import type { Member, WeatherMode } from '@/lib/family-types';
import { WEATHER_META, Demo } from '@/components/shared/kit';

export type MoveApi = ReturnType<typeof useMoveStore>;
export interface MoveCtx { store: FamilyStore; move: MoveApi; weather: WeatherMode; member: Member; weatherDemo: boolean }

export const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
export const isHot = (w: WeatherMode) => w === 'highHeat' || w === 'dusty';
export const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export function MoveHeader({ back = '/move', kicker, title, lead, demo, weather, right }: { back?: string; kicker?: string; title: ReactNode; lead?: ReactNode; demo?: boolean | string; weather?: WeatherMode; right?: ReactNode }) {
  const W = weather ? WEATHER_META[weather] : null;
  return <header style={{ marginBottom: 14 }}>
    <div className="mv-head">
      <Link href={back} className="mv-back" data-testid="button-back" aria-label="Back"><ArrowLeft size={18} /> Back</Link>
      <span className="mv-grow" />
      {W && <span className="mv-weather" data-testid="status-weather"><W.Icon size={13} /> {W.label}</span>}
      {demo && <Demo text={typeof demo === 'string' ? demo : 'Demo'} />}
      {right}
    </div>
    {kicker && <div className="mv-kicker">{kicker}</div>}
    <h1 className="mv-h1">{title}</h1>
    {lead && <p className="mv-lead">{lead}</p>}
  </header>;
}

export const OASIS_PIECES = [
  { id: 'palm', label: 'Palm', Icon: TreePalm }, { id: 'path', label: 'Path', Icon: Footprints },
  { id: 'bridge', label: 'Bridge', Icon: Spline }, { id: 'fountain', label: 'Fountain', Icon: Droplet },
  { id: 'pond', label: 'Pond', Icon: Waves },
] as const;

export function GoalBar({ pieces }: { pieces: number }) {
  return <section className="mv-goal" aria-label={`Shared family goal: ${pieces} of 5 oasis pieces`} data-testid="status-oasis-goal">
    <div className="mv-row"><strong style={{ fontSize: 14 }}>Our shared oasis</strong><span className="mv-grow" /><span className="mv-tag sun">{pieces} / 5</span></div>
    <div className="mv-goal-track">
      {OASIS_PIECES.map((p, i) => <div key={p.id} className={`mv-goal-piece ${i < pieces ? 'on' : i === pieces ? 'next' : ''}`}><div style={{ display: 'grid', placeItems: 'center' }}><p.Icon size={20} /><small>{p.label}</small></div></div>)}
    </div>
  </section>;
}

export function OasisScene({ pieces }: { pieces: number }) {
  return <div className="mv-scene" role="img" aria-label={`Oasis scene with ${pieces} of 5 pieces built`}>
    <svg viewBox="0 0 340 190" preserveAspectRatio="xMidYMid slice">
      <circle cx="290" cy="40" r="20" fill="#F6D477" stroke="#17264D" strokeWidth="2" />
      <path d="M0 125 Q80 105 170 122 T340 118 V190 H0Z" fill="#E9C98B" stroke="#17264D" strokeWidth="2" />
      {pieces >= 2 && <path className="mv-piece-in" d="M20 180 Q90 150 150 160 T300 150" fill="none" stroke="#F59B7A" strokeWidth="9" strokeDasharray="2 12" strokeLinecap="round" />}
      {pieces >= 5 && <ellipse className="mv-piece-in" cx="230" cy="160" rx="62" ry="16" fill="#78D5C5" stroke="#17264D" strokeWidth="2" />}
      {pieces >= 3 && <path className="mv-piece-in" d="M150 150 Q180 128 210 150" fill="none" stroke="#17264D" strokeWidth="5" />}
      {pieces >= 4 && <g className="mv-piece-in"><rect x="252" y="118" width="26" height="18" rx="4" fill="#CDBBEA" stroke="#17264D" strokeWidth="2" /><path d="M265 118 Q258 96 250 108 M265 118 Q272 96 280 108" stroke="#4877E8" strokeWidth="3" fill="none" /></g>}
      {pieces >= 1 && <g className="mv-piece-in"><path d="M70 135 Q74 95 66 70" stroke="#17264D" strokeWidth="6" fill="none" strokeLinecap="round" /><path d="M66 70 Q40 58 26 76 M66 70 Q92 54 106 72 M66 70 Q54 44 40 46 M66 70 Q80 44 96 48" stroke="#317b71" strokeWidth="8" fill="none" strokeLinecap="round" /></g>}
      {pieces === 0 && <text x="170" y="80" textAnchor="middle" fontSize="13" fontWeight="900" fill="#17264D">An empty dune, waiting for you</text>}
    </svg>
  </div>;
}

export type FigureKind = 'squat' | 'arms' | 'step' | 'jump' | 'still';
export function Figure({ kind, color = '#F59B7A', label }: { kind: FigureKind; color?: string; label: string }) {
  return <svg className={`mv-figure ${kind}`} viewBox="0 0 100 130" role="img" aria-label={label}>
    <ellipse cx="50" cy="124" rx="30" ry="4" fill="#17264d22" />
    <g className="body">
      <circle cx="50" cy="26" r="11" fill={color} stroke="#17264D" strokeWidth="2.5" />
      <path d="M50 38 V78 M50 78 L38 118 M50 78 L62 118" stroke="#17264D" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path className="arm" d="M50 46 L30 66" stroke="#17264D" strokeWidth="5" strokeLinecap="round" />
      <path className="arm r" d="M50 46 L70 66" stroke="#17264D" strokeWidth="5" strokeLinecap="round" />
    </g>
  </svg>;
}
export const figureFor = (ex?: string): FigureKind => ex === 'squat' ? 'squat' : ex === 'arm raise' ? 'arms' : ex === 'side step' ? 'step' : ex === 'jump' || ex === 'high knees' ? 'jump' : 'still';

export function ErrorNote({ text, onRetry, onClose }: { text: string; onRetry?: () => void; onClose?: () => void }) {
  return <div className="mv-alert" role="alert" data-testid="status-move-error"><AlertTriangle size={18} /><span>{text}</span>
    {onRetry && <button className="mv-chip" onClick={onRetry} data-testid="button-retry"><RotateCcw size={14} /> Retry</button>}
    {onClose && !onRetry && <button className="mv-chip" onClick={onClose} data-testid="button-dismiss-error">OK</button>}
  </div>;
}

export function WaterNote({ text = 'Movement complete. Time for a water break.' }: { text?: string }) {
  return <div className="mv-note"><Droplets size={18} /><span>{text}</span></div>;
}

