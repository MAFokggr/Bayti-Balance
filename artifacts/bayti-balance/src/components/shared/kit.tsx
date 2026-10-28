import type { ReactNode } from 'react';
import { AlertTriangle, Bird, Cat, Fish, Flower2, Home, Leaf, Moon, RotateCcw, Rocket, Star, Sun, Sunset, ThermometerSun, Wind, Heart, Sparkles } from 'lucide-react';
import type { Member, WeatherMode } from '@/lib/family-types';

export const AVATARS = { sun: Sun, star: Star, leaf: Leaf, moon: Moon, fish: Fish, bird: Bird, flower: Flower2, rocket: Rocket, cat: Cat, heart: Heart } as const;
export type AvatarKey = keyof typeof AVATARS;
export const MEMBER_COLORS = [
  { hex: '#78D5C5', name: 'Turquoise' }, { hex: '#F59B7A', name: 'Coral' }, { hex: '#F6D477', name: 'Yellow' },
  { hex: '#A9D9B8', name: 'Mint' }, { hex: '#CDBBEA', name: 'Lavender' }, { hex: '#E9C98B', name: 'Sand' }, { hex: '#4877E8', name: 'Royal blue' },
];
export const WEATHER_META: Record<WeatherMode, { label: string; Icon: typeof Sun }> = {
  comfortable: { label: 'Comfortable', Icon: Sun },
  highHeat: { label: 'High heat', Icon: ThermometerSun },
  dusty: { label: 'Dusty', Icon: Wind },
  evening: { label: 'Evening', Icon: Sunset },
};
export const STICKERS = { star: Star, heart: Heart, sparkles: Sparkles } as const;

export function initials(name: string) { return name.split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?'; }

export function Logo({ small }: { small?: boolean }) {
  return <div className="brand" data-testid="logo"><div className="brand-mark" aria-hidden="true"><Home strokeWidth={2.6} /></div>{!small && <span>bayti balance</span>}</div>;
}

export function MemberAvatar({ member, size = 44 }: { member: Pick<Member, 'avatar' | 'name' | 'color'>; size?: number }) {
  const Icon = AVATARS[member.avatar as AvatarKey];
  return <span className="sl-avatar" style={{ width: size, height: size, background: member.color, fontSize: size * 0.32 }} aria-label={member.name}>
    {Icon ? <Icon size={size * 0.48} strokeWidth={2.3} /> : initials(member.name)}
  </span>;
}

export function Ring({ percent, size = 64, stroke = 7, color = '#4877E8', children, label }: { percent: number; size?: number; stroke?: number; color?: string; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const p = Math.max(0, Math.min(100, percent || 0));
  return <div className="sl-ring" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(p)} percent`}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#17264D14" strokeWidth={stroke} />
      <circle className="sl-ring-arc" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
    <div className="sl-ring-inner">{children}</div>
  </div>;
}

export function Demo({ text = 'Demo' }: { text?: string }) { return <span className="sl-demo" data-testid="badge-demo">{text}</span>; }

export function StorageBanner({ error, retry }: { error: string | null; retry: () => void }) {
  if (!error) return null;
  return <div className="sl-storage" role="alert" data-testid="status-storage-error"><AlertTriangle size={17} /><span><strong>Not saved.</strong> {error}</span><button onClick={retry} data-testid="button-retry-storage"><RotateCcw size={14} /> Retry</button></div>;
}

export function SafetyNote() {
  return <p className="sl-safety">Bayti Balance is an educational prototype. It does not diagnose medical conditions or replace advice from a qualified professional.</p>;
}
