import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Backpack, Baby, Bed, Check, Clock, Droplets, Feather, Footprints, Heart, Home, ImageUp,
  Languages, Leaf, MonitorSmartphone, Moon, ScanLine, Sparkles, Sun, Trees, User, Users, Wallet, Zap, Salad, Sunset, Dumbbell, Utensils, X,
} from 'lucide-react';
import type { FamilyStore } from '@/hooks/use-family-store';
import { createMember, DRAFT_STORAGE_KEY as DRAFT_KEY, getFamilyNeeds } from '@/lib/family-data';
import { readPantryPhoto } from '@/lib/family-photo';
import type { AgeGroup, FamilyDraft, Member } from '@/lib/family-types';
import { AVATARS, Demo, MEMBER_COLORS, MemberAvatar, type AvatarKey } from '@/components/shared/kit';

type Saved = { step: number; draft: FamilyDraft; error?: string };

const BLANK: FamilyDraft = {
  family: '', members: [],
  familySettings: { weeklyGoal: 3, weeklyGoalType: 'activities', cuisine: 'Emirati', budget: 250, language: 'English', indoorPref: false, minutes: 30, sleepTarget: 9, screenTimeGoal: 2, pantryItems: [] },
};
const AGES: { id: AgeGroup; label: string; note: string; Icon: typeof User }[] = [
  { id: 'child', label: 'Child', note: 'Under 13', Icon: Baby }, { id: 'teen', label: 'Teen', note: '13 to 17', Icon: Backpack },
  { id: 'adult', label: 'Adult', note: 'Parent or carer', Icon: User }, { id: 'senior', label: 'Senior', note: 'Grandparent', Icon: Heart },
];
const FITNESS = [
  { id: 'gentle', label: 'Gentle', note: 'Slow and steady', Icon: Feather }, { id: 'moderate', label: 'Moderate', note: 'Some activity', Icon: Footprints },
  { id: 'active', label: 'Active', note: 'Loves to move', Icon: Zap },
] as const;
const FOODS = ['Rice', 'Fish', 'Chicken', 'Vegetables', 'Fruit', 'Lentils', 'Dates', 'Bread', 'Yoghurt', 'Eggs'];
const ALLERGIES = ['None', 'Nuts', 'Dairy', 'Eggs', 'Gluten', 'Seafood', 'Sesame'];
const RESTRICTIONS = ['None', 'Vegetarian', 'Low sugar', 'Low salt', 'Soft foods', 'No spicy food'];
const GOALS = [
  { label: 'Move more', Icon: Footprints }, { label: 'More energy', Icon: Zap }, { label: 'Drink more water', Icon: Droplets },
  { label: 'Sleep better', Icon: Moon }, { label: 'Eat more vegetables', Icon: Salad }, { label: 'Less screen time', Icon: MonitorSmartphone },
];
const CUISINES = ['Emirati', 'Levantine', 'Indian', 'Mediterranean', 'Mixed'];
const DEMO_PANTRY = ['Rice', 'Lentils', 'Tomatoes', 'Yoghurt', 'Cucumber', 'Dates', 'Eggs', 'Chickpeas', 'Spinach'];
const NEED_ICONS: Record<string, typeof Sun> = { movement: Footprints, bedtime: Bed, water: Droplets, budget: Wallet, children: Baby, gentle: Feather, sunset: Sunset, together: Users };
const NEED_COLORS = ['#F59B7A', '#CDBBEA', '#78D5C5', '#F6D477', '#A9D9B8', '#E9C98B'];

type Step = { key: string; member?: number };

function readSaved(): Saved {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Saved;
      if (!Number.isInteger(p?.step) || p.step < 0 || typeof p?.draft?.family !== 'string' || !Array.isArray(p.draft.members) ||
        !p.draft.familySettings || p.draft.members.some((member) => !member || typeof member.id !== 'string' ||
          typeof member.name !== 'string' || !Array.isArray(member.foods) || !Array.isArray(member.allergies) || !Array.isArray(member.restrictions))) {
        throw new Error('Invalid setup draft');
      }
      return { step: p.step, draft: p.draft };
    }
  } catch {
    return { step: 0, draft: BLANK, error: 'Saved setup answers could not be read. They have not been overwritten. Retry or start a new setup.' };
  }
  return { step: 0, draft: BLANK };
}

export default function RegisterPage({ store }: { store: FamilyStore }) {
  const [, go] = useLocation();
  const [initial] = useState(readSaved);
  const [{ step, draft }, setSaved] = useState<Saved>(initial);
  const [draftWarn, setDraftWarn] = useState<string | null>(initial.error ?? null);
  const draftBlocked = useRef(Boolean(initial.error));
  const [photoState, setPhotoState] = useState<'idle' | 'loading' | 'scanning' | 'done' | 'error'>(draft.familySettings.pantryPhoto ? 'done' : 'idle');
  const [photoError, setPhotoError] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (draftBlocked.current) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, draft })); setDraftWarn(null); }
    catch { setDraftWarn('Your answers could not be saved on this device. They will be lost if you reload.'); }
  }, [step, draft]);

  useEffect(() => {
    if (photoState !== 'scanning') return;
    const t = window.setTimeout(() => {
      setPhotoState('done');
    }, 2600);
    return () => window.clearTimeout(t);
  }, [photoState]);

  const steps: Step[] = useMemo(() => {
    const s: Step[] = [{ key: 'family' }, { key: 'count' }];
    draft.members.forEach((_, i) => ['name', 'avatar', 'age', 'color', 'fitness', 'foods', 'allergies', 'restrictions', 'goal'].forEach((k) => s.push({ key: k, member: i })));
    ['cuisine', 'indoor', 'minutes', 'sleep', 'screen', 'budget', 'language', 'pantry', 'needs'].forEach((k) => s.push({ key: k }));
    return s;
  }, [draft.members]);
  const idx = Math.min(step, steps.length - 1);
  const cur = steps[idx];
  const m = cur.member !== undefined ? draft.members[cur.member] : undefined;
  const settings = draft.familySettings;

  const setStep = (n: number) => setSaved((s) => ({ ...s, step: n }));
  const setDraft = (fn: (d: FamilyDraft) => FamilyDraft) => setSaved((s) => ({ ...s, draft: fn(s.draft) }));
  const setSet = <K extends keyof FamilyDraft['familySettings']>(k: K, v: FamilyDraft['familySettings'][K]) => setDraft((d) => ({ ...d, familySettings: { ...d.familySettings, [k]: v } }));
  const setMem = (patch: Partial<Member>) => setDraft((d) => ({ ...d, members: d.members.map((x, i) => i === cur.member ? { ...x, ...patch } : x) }));
  const setCount = (n: number) => setDraft((d) => ({ ...d, members: Array.from({ length: n }, (_, i) => d.members[i] ?? createMember(i)) }));
  const toggleList = (field: 'foods' | 'allergies' | 'restrictions', v: string) => {
    if (!m) return;
    const list = m[field];
    if (v === 'None') return setMem({ [field]: [] } as Partial<Member>);
    setMem({ [field]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] } as Partial<Member>);
  };

  const canNext = (() => {
    if (cur.key === 'family') return draft.family.trim().length > 0;
    if (cur.key === 'count') return draft.members.length > 0;
    if (cur.key === 'name') return !!m?.name.trim();
    if (cur.key === 'pantry') return photoState !== 'scanning' && photoState !== 'loading';
    return true;
  })();
  const needs = cur.key === 'needs' ? getFamilyNeeds(draft.members, settings) : [];

  const back = () => idx === 0 ? go('/welcome') : setStep(idx - 1);
  const next = () => {
    if (!canNext) return;
    if (cur.key !== 'needs') return setStep(idx + 1);
    try {
      store.saveFamily({ ...draft, family: draft.family.trim(), members: draft.members.map((x) => ({ ...x, name: x.name.trim() })) });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* draft cleanup is best effort */ }
      go('/who');
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Saving failed. Please try again.'); }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setPhotoState('loading'); setPhotoError('');
    try { const url = await readPantryPhoto(file); setSet('pantryPhoto', url); setPhotoState('scanning'); }
    catch (e) { setPhotoState('error'); setPhotoError(e instanceof Error ? e.message : 'That photo could not be read.'); }
  };

  const who = m ? (m.name.trim() || `Member ${cur.member! + 1}`) : '';
  const Opt = ({ on, onClick, children, tile, id }: { on: boolean; onClick: () => void; children: ReactNode; tile?: boolean; id: string }) =>
    <button type="button" className={`sl-option ${tile ? 'sl-option-tile' : ''}`} aria-pressed={on} onClick={onClick} data-testid={`option-${id}`}>{children}{on && !tile && <Check className="sl-check" size={18} />}</button>;
  const slider = (label: string, value: number, unit: string, min: number, max: number, stp: number, onChange: (v: number) => void, hint: string) => <>
    <div className="sl-slider-val" data-testid="text-slider-value">{value}<span style={{ fontSize: 18, letterSpacing: 0 }}> {unit}</span></div>
    <input className="sl-range" type="range" min={min} max={max} step={stp} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} data-testid="input-slider" />
    <div className="sl-between sl-sub"><span>{min} {unit}</span><span>{max} {unit}</span></div>
    <p className="sl-sub" style={{ marginTop: 12 }}>{hint}</p>
  </>;

  let q = ''; let body: ReactNode = null;
  switch (cur.key) {
    case 'family': q = 'What is your family name?'; body = <input className="sl-input" autoFocus value={draft.family} onChange={(e) => setDraft((d) => ({ ...d, family: e.target.value }))} placeholder="For example, Al Hammadi" aria-label="Family name" data-testid="input-family-name" onKeyDown={(e) => e.key === 'Enter' && next()} />; break;
    case 'count': q = 'How many people are in your home plan?'; body = <div className="sl-grid3" style={{ marginTop: 18 }}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <Opt key={n} id={`count-${n}`} tile on={draft.members.length === n} onClick={() => setCount(n)}><Users size={20} /><span style={{ fontSize: 22 }}>{n}</span></Opt>)}</div>; break;
    case 'name': q = `Member ${cur.member! + 1}: what is their name?`; body = <input className="sl-input" autoFocus value={m!.name} onChange={(e) => setMem({ name: e.target.value })} placeholder="First name" aria-label="Member name" data-testid="input-member-name" onKeyDown={(e) => e.key === 'Enter' && next()} />; break;
    case 'avatar': q = `Pick an avatar for ${who}`; body = <div className="sl-grid3" style={{ marginTop: 18 }}>{(Object.keys(AVATARS) as AvatarKey[]).map((k) => { const I = AVATARS[k]; return <Opt key={k} id={`avatar-${k}`} tile on={m!.avatar === k} onClick={() => setMem({ avatar: k })}><I size={28} /><span style={{ fontSize: 11, textTransform: 'capitalize' }}>{k}</span></Opt>; })}</div>; break;
    case 'age': q = `Which age group is ${who}?`; body = <div className="sl-stack" style={{ marginTop: 18 }}>{AGES.map(({ id, label, note, Icon }) => <Opt key={id} id={`age-${id}`} on={m!.ageGroup === id} onClick={() => setMem({ ageGroup: id, role: label, fitness: id === 'senior' ? 'gentle' : m!.fitness })}><span className="sl-option-icon"><Icon size={20} /></span><span>{label}<small>{note}</small></span></Opt>)}</div>; break;
    case 'color': q = `Choose ${who}'s colour`; body = <div className="sl-grid3" style={{ marginTop: 18 }}>{MEMBER_COLORS.map((c) => <button key={c.hex} type="button" className="sl-swatch" style={{ background: c.hex }} aria-pressed={m!.color === c.hex} aria-label={c.name} onClick={() => setMem({ color: c.hex })} data-testid={`option-color-${c.name}`}>{m!.color === c.hex ? <Check size={24} /> : <span style={{ fontSize: 10, fontWeight: 900 }}>{c.name}</span>}</button>)}</div>; break;
    case 'fitness': q = `How active is ${who}?`; body = <div className="sl-stack" style={{ marginTop: 18 }}>{FITNESS.map(({ id, label, note, Icon }) => <Opt key={id} id={`fitness-${id}`} on={m!.fitness === id} onClick={() => setMem({ fitness: id })}><span className="sl-option-icon"><Icon size={20} /></span><span>{label}<small>{note}</small></span></Opt>)}</div>; break;
    case 'foods': q = `Foods ${who} enjoys`; body = <><p className="sl-sub">Choose any.</p><div className="sl-chips" style={{ marginTop: 14 }}>{FOODS.map((f) => <button key={f} type="button" className="sl-chip" aria-pressed={m!.foods.includes(f)} onClick={() => toggleList('foods', f)} data-testid={`chip-food-${f}`}>{m!.foods.includes(f) && <Check size={13} />}{f}</button>)}</div></>; break;
    case 'allergies': q = `Any allergies for ${who}?`; body = <div className="sl-chips" style={{ marginTop: 16 }}>{ALLERGIES.map((f) => { const on = f === 'None' ? m!.allergies.length === 0 : m!.allergies.includes(f); return <button key={f} type="button" className="sl-chip" aria-pressed={on} onClick={() => toggleList('allergies', f)} data-testid={`chip-allergy-${f}`}>{on && <Check size={13} />}{f}</button>; })}</div>; break;
    case 'restrictions': q = `Any food restrictions for ${who}?`; body = <><p className="sl-sub">Check ingredient labels and your family’s halal requirements.</p><div className="sl-chips" style={{ marginTop: 14 }}>{RESTRICTIONS.map((f) => { const on = f === 'None' ? m!.restrictions.length === 0 : m!.restrictions.includes(f); return <button key={f} type="button" className="sl-chip" aria-pressed={on} onClick={() => toggleList('restrictions', f)} data-testid={`chip-restriction-${f}`}>{on && <Check size={13} />}{f}</button>; })}</div></>; break;
    case 'goal': q = `${who}'s personal goal`; body = <><div className="sl-grid2" style={{ marginTop: 16 }}>{GOALS.map(({ label, Icon }) => <Opt key={label} id={`goal-${label}`} tile on={m!.goal === label} onClick={() => setMem({ goal: label })}><Icon size={22} /><span style={{ fontSize: 12 }}>{label}</span></Opt>)}</div>
      <label className="eyebrow" style={{ display: 'block', marginTop: 16 }}>Optional note<textarea className="sl-textarea" value={m!.notes ?? ''} onChange={(e) => setMem({ notes: e.target.value })} placeholder="Anything the plan should remember" data-testid="input-member-notes" /></label></>; break;
    case 'cuisine': q = 'Which cuisine does your family cook most?'; body = <div className="sl-stack" style={{ marginTop: 18 }}>{CUISINES.map((c) => <Opt key={c} id={`cuisine-${c}`} on={settings.cuisine === c} onClick={() => setSet('cuisine', c)}><span className="sl-option-icon"><Utensils size={19} /></span><span>{c}</span></Opt>)}</div>; break;
    case 'indoor': q = 'Do you prefer indoor or outdoor activities?'; body = <div className="sl-grid2" style={{ marginTop: 18 }}>
      <Opt id="indoor" tile on={settings.indoorPref} onClick={() => setSet('indoorPref', true)}><Home size={28} />Indoor</Opt>
      <Opt id="outdoor" tile on={!settings.indoorPref} onClick={() => setSet('indoorPref', false)}><Trees size={28} />Outdoor</Opt></div>; break;
    case 'minutes': q = 'How many minutes can the family share each day?'; body = slider('Daily minutes', settings.minutes, 'min', 10, 90, 5, (v) => setSet('minutes', v), 'Activities are planned to fit this time.'); break;
    case 'sleep': q = 'Your household sleep target'; body = slider('Sleep target', settings.sleepTarget, 'hours', 6, 12, 0.5, (v) => setSet('sleepTarget', v), 'Choose your own goal. Individual needs and professional advice may differ.'); break;
    case 'screen': q = 'Daily screen-time goal'; body = slider('Screen-time goal', settings.screenTimeGoal, 'hours', 0.5, 6, 0.5, (v) => setSet('screenTimeGoal', v), 'Outside school work.'); break;
    case 'budget': q = 'Weekly food budget'; body = slider('Weekly budget', settings.budget, 'AED', 100, 1200, 25, (v) => setSet('budget', v), 'Your budget helps shape the family needs map; meal prices are not verified.'); break;
    case 'language': q = 'Which language do you prefer?'; body = <div className="sl-stack" style={{ marginTop: 18 }}>{['English', 'Arabic', 'Both'].map((l) => <Opt key={l} id={`lang-${l}`} on={settings.language === l} onClick={() => setSet('language', l)}><span className="sl-option-icon"><Languages size={19} /></span><span>{l}{l !== 'English' && <small>Arabic text is a later step in this prototype</small>}</span></Opt>)}</div>; break;
    case 'pantry': q = 'Add a pantry or receipt photo'; body = <>
      <p className="sl-sub">Optional. The photo stays on this device. <Demo /> The reading below is simulated, not real image analysis.</p>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} data-testid="input-pantry-photo" />
      {!settings.pantryPhoto && photoState !== 'loading' && <button type="button" className="sl-upload sl-full" style={{ marginTop: 16 }} onClick={() => fileRef.current?.click()} data-testid="button-upload-photo"><ImageUp size={30} />Choose a photo<span className="sl-sub">Fridge, cupboard or a receipt</span></button>}
      {photoState === 'loading' && <div className="sl-empty" style={{ marginTop: 16 }}>Preparing photo...</div>}
      {photoState === 'error' && <div className="sl-why" style={{ marginTop: 12 }}><AlertTriangle size={16} /> {photoError} <button className="sl-btn sl-btn-sm" style={{ marginTop: 8 }} onClick={() => fileRef.current?.click()}>Try another photo</button></div>}
      {settings.pantryPhoto && <div style={{ marginTop: 16 }}>
        <div className={photoState === 'scanning' ? 'sl-scan' : ''}><img className="sl-photo" src={settings.pantryPhoto} alt="Your pantry or receipt" data-testid="img-pantry-preview" /></div>
        {photoState === 'scanning' ? <p className="sl-row" style={{ fontWeight: 900, marginTop: 12 }}><ScanLine size={18} /> AI is reading your photo <Demo /></p>
          : <>
            <p className="sl-row" style={{ fontWeight: 900, marginTop: 12 }}><Sparkles size={17} /> Demo suggestions <Demo /></p>
            <p className="sl-sub">These are sample items, not read from your photo. Tap only what you really have.</p>
            <div className="sl-chips" style={{ marginTop: 10 }}>{DEMO_PANTRY.map((f) => { const on = settings.pantryItems.includes(f); return <button key={f} type="button" className="sl-chip" aria-pressed={on} onClick={() => setSet('pantryItems', on ? settings.pantryItems.filter((x) => x !== f) : [...settings.pantryItems, f])} data-testid={`chip-pantry-${f}`}>{on && <Check size={13} />}{f}</button>; })}</div>
            <button type="button" className="sl-btn sl-btn-ghost sl-btn-sm" style={{ marginTop: 12 }} onClick={() => { setDraft((d) => ({ ...d, familySettings: { ...d.familySettings, pantryPhoto: undefined, pantryItems: [] } })); setPhotoState('idle'); }} data-testid="button-remove-photo"><X size={14} /> Remove photo</button>
          </>}
      </div>}
    </>; break;
    case 'needs': q = `The ${draft.family.trim() || 'family'} needs map`; body = <>
      <p className="sl-sub">Chosen by simple rules from your answers.</p>
      <div className="sl-stack" style={{ marginTop: 16 }}>
        {needs.length ? needs.map((n, i) => { const I = NEED_ICONS[n.id] ?? Leaf; return <div key={n.id} className="sl-card sl-need" style={{ animationDelay: `${i * 0.08}s` }} data-testid={`card-need-${n.id}`}><span className="sl-need-icon" style={{ background: NEED_COLORS[i % NEED_COLORS.length] }}><I size={20} /></span><div><strong>{n.title}</strong><p className="sl-sub">{n.reason}</p></div></div>; })
          : <div className="sl-empty"><Dumbbell size={22} /><br />Your family looks balanced. We will start with a gentle daily plan.</div>}
      </div>
      <div className="sl-family-strip" style={{ marginTop: 16 }}>{draft.members.map((x) => <div key={x.id}><MemberAvatar member={x} size={44} />{x.name}</div>)}</div>
      {saveError && <div className="sl-why" role="alert"><AlertTriangle size={16} /> Not saved: {saveError}</div>}
    </>; break;
  }

  return <main className="sl-wiz">
    <div className="sl-between">
      <button className="sl-icon-btn" onClick={back} aria-label="Back" data-testid="button-back"><ArrowLeft size={18} /></button>
      <span className="eyebrow">Step {idx + 1} of {steps.length}</span>
      <span className="sl-row" style={{ gap: 4, fontSize: 11, fontWeight: 800, color: '#52687b' }}><Clock size={13} />{m ? who : 'Family'}</span>
    </div>
    <div className="sl-progress" aria-hidden="true"><span style={{ width: `${((idx + 1) / steps.length) * 100}%` }} /></div>
    {draftWarn && <div className="sl-why" role="alert" style={{ fontSize: 12 }}><AlertTriangle size={14} /> {draftWarn}
      <div className="sl-row" style={{ marginTop: 8 }}>
        <button className="sl-chip" onClick={() => {
          if (!draftBlocked.current) {
            try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, draft })); setDraftWarn(null); }
            catch { setDraftWarn('Your latest answers still could not be saved. They remain available here until you leave or reload.'); }
            return;
          }
          const restored = readSaved();
          if (restored.error) return setDraftWarn(restored.error);
          draftBlocked.current = false; setSaved(restored); setDraftWarn(null);
        }}>Retry</button>
        {draftBlocked.current && <button className="sl-chip" onClick={() => {
          if (!window.confirm('Replace the unreadable setup draft with a new blank setup? Your saved family and progress will not be changed.')) return;
          draftBlocked.current = false; setSaved({ step: 0, draft: BLANK }); setDraftWarn(null);
        }}>Start new setup</button>}
      </div>
    </div>}
    <div className="sl-q-body" key={idx}>
      <h1 className="sl-q" data-testid="text-question">{q}</h1>
      {body}
    </div>
    <div className="sl-wiz-foot">
      <button className="sl-btn sl-btn-ghost" onClick={back} data-testid="button-back-foot"><ArrowLeft size={16} /> Back</button>
      <button className="sl-btn sl-btn-blue" style={{ flex: 1 }} disabled={!canNext} onClick={next} data-testid="button-next">
        {cur.key === 'needs' ? <>Save family plan <Check size={17} /></> : cur.key === 'pantry' && !settings.pantryPhoto ? <>Skip <ArrowRight size={17} /></> : <>Next <ArrowRight size={17} /></>}
      </button>
    </div>
  </main>;
}
