import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertTriangle, CheckCircle2, ChefHat, Droplets, Recycle, ShoppingBasket, UtensilsCrossed } from 'lucide-react';
import type { FamilyStore } from '@/hooks/use-family-store';
import type { EatStore } from '@/hooks/use-eat-store';
import type { Member, WeatherMode } from '@/lib/family-types';
import type { PhotoType } from '@/lib/eat-types';

export interface EatCtx { store: FamilyStore; eat: EatStore; weather: WeatherMode; weatherDemo: boolean; member: Member }

const TABS = [
  ['/eat', 'Meals', UtensilsCrossed], ['/eat/pantry', 'Pantry', ShoppingBasket], ['/eat/leftovers', 'Leftovers', Recycle],
  ['/eat/cooking', 'Cooking', ChefHat], ['/eat/water', 'Water Journey', Droplets],
] as const;

export function EatTabs() {
  const [location] = useLocation();
  const activeFor = (href: string) => href === '/eat'
    ? ['/eat', '/eat/meal', '/eat/lunchbox', '/eat/grocery'].includes(location) : location === href;
  return <nav className="eat-tabs" aria-label="Eat sections">
    {TABS.map(([href, label, I]) => <Link key={href} href={href} className={`eat-tab ${activeFor(href) ? 'on' : ''}`} aria-current={activeFor(href) ? 'page' : undefined} data-testid={`tab-eat-${label.toLowerCase().replaceAll(' ', '-')}`}><I />{label}</Link>)}
  </nav>;
}

export function errorText(cause: unknown) { return cause instanceof Error ? cause.message : 'Something went wrong. Please retry.'; }

/** Runs a store mutation and reports honest success/failure — never says saved if it threw. */
export function useFeedback() {
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = useCallback((fn: () => void, ok: string) => {
    window.clearTimeout(timer.current);
    try { fn(); setMsg({ kind: 'ok', text: ok }); timer.current = window.setTimeout(() => setMsg(null), 4200); return true; }
    catch (cause) { setMsg({ kind: 'err', text: errorText(cause) }); return false; }
  }, []);
  return { msg, run, clear: () => setMsg(null) };
}

export function Feedback({ msg, id }: { msg: { kind: 'ok' | 'err'; text: string } | null; id: string }) {
  return <div aria-live="polite" role="status">{msg && <div className={`eat-feedback ${msg.kind}`} data-testid={`feedback-${id}`}>
    {msg.kind === 'ok' ? <CheckCircle2 /> : <AlertTriangle />}<span>{msg.text}</span></div>}</div>;
}

export function Warnings({ list, id }: { list: string[]; id: string }) {
  if (!list.length) return null;
  return <div className="eat-warn" role="alert" data-testid={`warnings-${id}`}><AlertTriangle /><div>{list.map((w) => <div key={w}>{w}</div>)}</div></div>;
}

export function Empty({ icon, children, id }: { icon: ReactNode; children: ReactNode; id: string }) {
  return <div className="eat-empty" data-testid={`empty-${id}`}>{icon}{children}</div>;
}

function hash(s: string) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
const FOOD_COLORS = ['#F59B7A', '#A9D9B8', '#F6D477', '#78D5C5', '#E9C98B', '#CDBBEA', '#f2b8a2', '#9fc6e8'];

/** Illustrated plate: deterministic shapes from the meal name & ingredients. */
export function MealArt({ name, ingredients = [], className = '' }: { name: string; ingredients?: string[]; className?: string }) {
  const h = hash(name);
  const items = (ingredients.length ? ingredients : [name]).slice(0, 5);
  return <svg className={`eat-art ${className}`} viewBox="0 0 120 100" role="img" aria-label={`Illustration of ${name}`} preserveAspectRatio="xMidYMid slice">
    <rect width="120" height="100" fill={['#fdf2dc', '#e3f5f1', '#f6ece6', '#eef1f8'][h % 4]} />
    <circle cx="60" cy="52" r="38" fill="#fffdf7" stroke="#17264D" strokeWidth="2" />
    <circle cx="60" cy="52" r="29" fill="none" stroke="#e6dfd2" strokeWidth="1.5" />
    {items.map((it, i) => {
      const a = (i / items.length) * Math.PI * 2 + (h % 10) / 3;
      const x = 60 + Math.cos(a) * 15, y = 52 + Math.sin(a) * 13, c = FOOD_COLORS[hash(it) % FOOD_COLORS.length];
      return i % 2 ? <ellipse key={it + i} cx={x} cy={y} rx="11" ry="8" fill={c} stroke="#17264D" strokeWidth="1.5" transform={`rotate(${hash(it) % 60} ${x} ${y})`} />
        : <circle key={it + i} cx={x} cy={y} r="9" fill={c} stroke="#17264D" strokeWidth="1.5" />;
    })}
    <path d="M100 18 v30 M96 18 v10 M104 18 v10" stroke="#17264D" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

/** Illustrated fallback for each sample photo type. */
export function SampleArt({ type }: { type: PhotoType }) {
  return <svg className="eat-art" viewBox="0 0 160 120" role="img" aria-label={`Illustrated ${type} sample`}>
    <rect width="160" height="120" fill={type === 'receipt' ? '#eef1f8' : type === 'leftovers' ? '#e3f5f1' : '#fdf2dc'} />
    {type === 'pantry' && <g stroke="#17264D" strokeWidth="2">
      <rect x="18" y="18" width="124" height="88" rx="6" fill="#fffdf7" /><path d="M18 62 h124" />
      <rect x="28" y="34" width="18" height="26" rx="3" fill="#F6D477" /><rect x="52" y="28" width="16" height="32" rx="3" fill="#fffdf7" />
      <circle cx="86" cy="50" r="10" fill="#F59B7A" /><path d="M104 60 l10 -24 l6 24 z" fill="#A9D9B8" />
      <ellipse cx="40" cy="92" rx="14" ry="9" fill="#A9D9B8" /><path d="M66 98 l18 -20" stroke="#F59B7A" strokeWidth="6" strokeLinecap="round" />
      <circle cx="112" cy="88" r="11" fill="#E9C98B" /></g>}
    {type === 'receipt' && <g stroke="#17264D" strokeWidth="2">
      <path d="M48 10 h64 v100 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 l-8 6 z" fill="#fffdf7" />
      {[26, 38, 50, 62, 74].map((y) => <g key={y}><path d={`M56 ${y} h30`} strokeWidth="3" stroke="#c9d4ea" /><path d={`M94 ${y} h10`} strokeWidth="3" stroke="#78D5C5" /></g>)}
      <path d="M56 90 h48" strokeWidth="3" /></g>}
    {type === 'leftovers' && <g stroke="#17264D" strokeWidth="2">
      <rect x="20" y="36" width="56" height="44" rx="8" fill="#fffdf7" /><rect x="24" y="44" width="48" height="30" rx="5" fill="#F6D477" />
      <rect x="86" y="30" width="54" height="50" rx="8" fill="#fffdf7" /><circle cx="104" cy="54" r="9" fill="#A9D9B8" /><circle cx="122" cy="58" r="8" fill="#F59B7A" />
      <path d="M14 92 h132" /></g>}
  </svg>;
}

export function SamplePhoto({ type }: { type: PhotoType }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <SampleArt type={type} />;
  return <img src={`${import.meta.env.BASE_URL}samples/${type}.jpg`} alt={`Sample ${type} photo`} onError={() => setFailed(true)} data-testid={`img-sample-${type}`} />;
}

export function money(n: number) { return `AED ${n.toFixed(2)}`; }

export function ConfirmDialog({ title, body, confirm, cancel, onConfirm, onCancel }: { title: string; body: string; confirm: string; cancel: string; onConfirm(): void; onCancel(): void }) {
  return <div className="sl-modal-back" role="dialog" aria-modal="true" aria-labelledby="eat-confirm-title">
    <div className="sl-modal">
      <h2 id="eat-confirm-title" className="eat-h2">{title}</h2>
      <p className="eat-sub">{body}</p>
      <div className="eat-row" style={{ marginTop: 16 }}>
        <button className="sl-btn sl-btn-ghost" onClick={onCancel} data-testid="button-confirm-cancel">{cancel}</button>
        <button className="sl-btn" onClick={onConfirm} data-testid="button-confirm-ok">{confirm}</button>
      </div>
    </div>
  </div>;
}
