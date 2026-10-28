import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Bird, Cat, Fish, Flower2, PawPrint, Rabbit, Rainbow, Save, Squirrel, Star, Turtle, X } from 'lucide-react';
import { ingredientWarnings } from '@/lib/eat-data';
import type { Lunchbox } from '@/lib/eat-types';
import { Empty, Feedback, useFeedback, Warnings, type EatCtx } from '@/components/eat/kit';

const SHAPES = [['star', Star], ['flower', Flower2], ['animal', PawPrint], ['rainbow', Rainbow]] as const;
const CHARACTERS = [['Camel Cam', PawPrint], ['Falcon Fay', Bird], ['Turtle Tia', Turtle], ['Bunny Bo', Rabbit], ['Fish Faris', Fish], ['Cat Coco', Cat], ['Squirrel Sami', Squirrel]] as const;
const LAYOUTS: Record<Lunchbox['layout'], string[]> = { bento: ['main', 'fruit', 'veg', 'snack'], 'three-part': ['main', 'side', 'treat'], picnic: ['wrap', 'dip', 'fruit', 'crunch'] };
const BASE_FOODS = ['flatbread', 'rice balls', 'chicken strips', 'cheese cubes', 'hummus', 'cucumber', 'carrot sticks', 'grapes', 'apple slices', 'dates', 'yogurt', 'boiled egg'];

const blank = (memberId: string, layout: Lunchbox['layout'] = 'bento'): Lunchbox => ({
  id: crypto.randomUUID(), memberId, name: '', shape: 'star', character: CHARACTERS[0][0], layout,
  sections: Object.fromEntries(LAYOUTS[layout].map((s) => [s, []])), rating: 0, createdAt: new Date().toISOString(),
});

export function LunchboxPage({ ctx }: { ctx: EatCtx }) {
  const [box, setBox] = useState<Lunchbox>(() => blank(ctx.member.id));
  const [section, setSection] = useState(LAYOUTS.bento[0]);
  const [dropOver, setDropOver] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const fb = useFeedback();
  const pantryFoods = ctx.eat.data.pantry.filter((p) => p.confirmed).map((p) => p.name);
  const foods = Array.from(new Set([...pantryFoods, ...BASE_FOODS]));
  const all = Object.values(box.sections).flat();
  const warnings = ingredientWarnings(all, ctx.store.data.members);
  const saved = ctx.eat.data.lunchboxes.filter((l) => l.memberId === ctx.member.id);

  const setLayout = (layout: Lunchbox['layout']) => {
    const names = LAYOUTS[layout]; const old = Object.values(box.sections);
    // Carry foods across in order; any surplus folds into the last section so nothing silently disappears.
    const sections = Object.fromEntries(names.map((n, i) => [n, i === names.length - 1 ? old.slice(i).flat() : old[i] ?? []]));
    setBox({ ...box, layout, sections }); setSection(names[0]);
    setNote(`Switched to ${layout} — ${names.length} sections.`);
  };
  const addFood = (food: string, to = section) => {
    if (!box.sections[to] || box.sections[to].includes(food)) return;
    setBox({ ...box, sections: { ...box.sections, [to]: [...box.sections[to], food] } });
    setNote(`${food} added to ${to}.`);
  };
  const removeFood = (s: string, food: string) => setBox({ ...box, sections: { ...box.sections, [s]: box.sections[s].filter((f) => f !== food) } });
  const save = () => fb.run(() => {
    if (!box.name.trim()) throw new Error('Give the lunchbox a name first.');
    if (box.rating < 1) throw new Error('Tap the stars to rate it before saving.');
    if (!all.length) throw new Error('Add at least one food to a section.');
    if (warnings.length) throw new Error('This lunchbox includes a family allergy. Remove that food first.');
    ctx.eat.saveLunchbox({ ...box, name: box.name.trim(), memberId: ctx.member.id });
  }, `"${box.name.trim()}" saved for ${ctx.member.name}.`);

  return <div className="eat-body">
    <Link href="/eat" className="eat-row" style={{ fontSize: 13, fontWeight: 900 }} data-testid="link-back-meals"><ArrowLeft size={15} />Meals</Link>
    <h2 className="eat-title" style={{ fontSize: 26 }}>Build a lunchbox for <em>{ctx.member.name}</em></h2>
    <div><b style={{ fontSize: 13 }}>Shape</b><div className="eat-grid2" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: 6 }}>
      {SHAPES.map(([s, I]) => <button key={s} className="eat-action" style={{ minHeight: 70, alignItems: 'center' }} aria-pressed={box.shape === s} onClick={() => setBox({ ...box, shape: s })} data-testid={`button-shape-${s}`}><I size={22} />{s}</button>)}
    </div></div>
    <div><b style={{ fontSize: 13 }}>Character</b><div className="eat-wrap" style={{ marginTop: 6 }}>
      {CHARACTERS.map(([c, I]) => <button key={c} className="eat-toggle" aria-pressed={box.character === c} onClick={() => setBox({ ...box, character: c })} data-testid={`button-character-${c.split(' ')[0].toLowerCase()}`}><I />{c}</button>)}
    </div></div>
    <div><b style={{ fontSize: 13 }}>Layout</b><div className="eat-wrap" style={{ marginTop: 6 }}>
      {(Object.keys(LAYOUTS) as Lunchbox['layout'][]).map((l) => <button key={l} className="eat-toggle" aria-pressed={box.layout === l} onClick={() => setLayout(l)} data-testid={`button-layout-${l}`}>{l}</button>)}
    </div></div>

    <div className={`eat-lunch ${box.layout}`} data-testid="lunchbox-preview">
      {Object.keys(box.sections).map((s) => <div key={s} role="button" tabIndex={0} className={`eat-section ${section === s ? 'on' : ''} ${dropOver === s ? 'drop-over' : ''}`}
        onClick={() => setSection(s)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSection(s)} aria-pressed={section === s} aria-label={`${s} section, ${box.sections[s].length} foods`}
        onDragOver={(e) => { e.preventDefault(); setDropOver(s); }} onDragLeave={() => setDropOver(null)}
        onDrop={(e) => { e.preventDefault(); setDropOver(null); addFood(e.dataTransfer.getData('text/plain'), s); }} data-testid={`section-${s}`}>
        <b>{s}</b>
        <div className="eat-wrap">{box.sections[s].map((f) => <span key={f} className="eat-food">{f}<X size={11} role="button" aria-label={`Remove ${f}`} onClick={(e) => { e.stopPropagation(); removeFood(s, f); }} data-testid={`button-remove-food-${s}-${f}`} /></span>)}</div>
      </div>)}
    </div>
    <p className="eat-sub" aria-live="polite">{note || `Tap a food to add it to "${section}", or drag it into any section.`}</p>
    <div className="eat-wrap">{foods.map((f) => <button key={f} className="eat-food" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', f)} onClick={() => addFood(f)} data-testid={`button-food-${f.replace(/\s+/g, '-')}`}>{f}</button>)}</div>
    <Warnings list={warnings} id="lunchbox" />

    <input className="eat-input" value={box.name} onChange={(e) => setBox({ ...box, name: e.target.value })} placeholder="Name it, e.g. Star Picnic Friday" aria-label="Lunchbox name" data-testid="input-lunchbox-name" />
    <div className="eat-between"><b style={{ fontSize: 13 }}>Rating</b><div className="eat-stars" role="group" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} aria-pressed={box.rating >= n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setBox({ ...box, rating: n })} data-testid={`button-rate-${n}`}><Star size={22} /></button>)}</div></div>
    <button className="sl-btn sl-full" onClick={save} data-testid="button-save-lunchbox"><Save size={16} />Save lunchbox</button>
    <Feedback msg={fb.msg} id="lunchbox" />

    <h3 className="eat-h2">{ctx.member.name}'s saved lunchboxes</h3>
    {saved.length === 0 ? <Empty icon={<Star />} id="lunchboxes">Nothing saved yet — your first box will appear here.</Empty>
      : saved.map((l) => <div key={l.id} className="eat-card eat-between" data-testid={`card-lunchbox-${l.id}`}>
        <div><b>{l.name}</b><div className="eat-sub" style={{ fontSize: 12 }}>{l.shape} · {l.character} · {l.layout} · {l.rating}/5</div></div>
        <button className="sl-btn sl-btn-soft sl-btn-sm" onClick={() => { setBox(l); setSection(Object.keys(l.sections)[0]); setNote(`Editing "${l.name}".`); }} data-testid={`button-edit-lunchbox-${l.id}`}>Edit</button>
      </div>)}
    {saved.length > 0 && <button className="sl-btn sl-btn-ghost sl-btn-sm" onClick={() => { setBox(blank(ctx.member.id)); setSection(LAYOUTS.bento[0]); setNote('New lunchbox.'); }} data-testid="button-new-lunchbox">Start a new one</button>}
  </div>;
}
