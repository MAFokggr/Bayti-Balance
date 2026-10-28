import { useMemo, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { ArrowLeft, Baby, Check, ChefHat, Clock, Coins, Heart, Leaf, Plus, ShoppingCart, Sparkles, Star, Trash2, Wallet } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Demo } from '@/components/shared/kit';
import {
  ADJUSTMENTS, applyMealAdjustments, COOKING_IDEAS, CUISINES, familyMealWarnings, favoriteKey, grocerySummary, MEALS, mealScore, preferenceNotes,
} from '@/lib/eat-data';
import type { Meal, MealAdjustment } from '@/lib/eat-types';
import { ConfirmDialog, Empty, Feedback, MealArt, money, useFeedback, Warnings, type EatCtx } from '@/components/eat/kit';

const match = (meal: Meal, c: string) => [meal.cuisine, ...meal.tags].some((t) => t.toLowerCase() === c.toLowerCase());

function IdeaIcon({ name }: { name: string }) {
  const I = (Icons as unknown as Record<string, typeof Leaf>)[name] ?? Leaf;
  return <I size={18} />;
}

export function MealsPage({ ctx }: { ctx: EatCtx }) {
  const [cuisine, setCuisine] = useState('All');
  const [, go] = useLocation();
  const members = ctx.store.data.members;
  const fb = useFeedback();
  const list = useMemo(() => MEALS.filter((m) => cuisine === 'All' || match(m, cuisine))
    .map((m) => ({ m, warn: familyMealWarnings(m, members), score: mealScore(m, members) }))
    .sort((a, b) => (a.warn.length - b.warn.length) || b.score - a.score), [cuisine, members]);
  const restrictions = members.flatMap((m) => [...m.allergies, ...m.restrictions].map((r) => `${m.name}: ${r}`));
  const open = (id: string) => { try { ctx.eat.setSelectedMeal(id); } catch { /* selection is also carried in the URL */ } go(`/eat/meal?id=${encodeURIComponent(id)}`); };

  return <div className="eat-body">
    {restrictions.length > 0 && <div className="eat-card" data-testid="text-family-restrictions"><b style={{ fontSize: 13 }}>Kept off the family table</b><div className="eat-wrap" style={{ marginTop: 6 }}>{restrictions.map((r) => <span key={r} className="eat-pill eat-pill-warn">{r}</span>)}</div></div>}
    <div className="eat-cuisines" role="group" aria-label="Cuisine">
      {['All', ...CUISINES].map((c) => <button key={c} className="eat-cuisine" aria-pressed={cuisine === c} onClick={() => setCuisine(c)} data-testid={`button-cuisine-${c.toLowerCase().replace(/\s+/g, '-')}`}><Sparkles />{c}</button>)}
    </div>
    <p className="eat-sub">Sorted by what suits {ctx.store.data.family || 'your family'} — preferences guide the order, every cuisine stays on the menu.</p>
    {list.length === 0 && <Empty icon={<ChefHat />} id="meals">No sample meals in {cuisine} yet. Try another category or All.</Empty>}
    {list.map(({ m, warn }, i) => <button key={m.id} className="eat-meal" style={{ animationDelay: `${i * 40}ms` }} onClick={() => open(m.id)} data-testid={`card-meal-${m.id}`}>
      <MealArt name={m.name} ingredients={m.ingredients.map((x) => x.name)} />
      <div style={{ minWidth: 0 }}>
        <h3>{m.name}</h3>
        <div className="eat-wrap"><span className="eat-pill">{m.cuisine}</span><span className="eat-pill"><Clock />{m.prepMinutes} min</span><span className="eat-pill"><Coins />{money(m.cost)}</span></div>
        <p className="eat-sub" style={{ fontSize: 12, marginTop: 5 }}>{m.familySuitability}</p>
        {warn.length > 0 && <span className="eat-pill eat-pill-warn" style={{ marginTop: 4 }}>Allergy conflict — not recommended</span>}
      </div>
    </button>)}

    <div className="eat-grid2">
      <Link href="/eat/lunchbox" className="eat-action" data-testid="link-lunchbox"><span className="eat-icon"><Baby /></span>Lunchbox builder<small>Shapes, characters, layouts</small></Link>
      <Link href="/eat/grocery" className="eat-action" data-testid="link-grocery"><span className="eat-icon"><ShoppingCart /></span>Grocery & budget<small>For the selected meal</small></Link>
    </div>

    <h2 className="eat-h2"><Heart size={17} />Family favourites</h2>
    {ctx.eat.data.favorites.length === 0 ? <Empty icon={<Heart />} id="favorites">Save a meal with your adjustments and it lands here, exactly as you tuned it.</Empty>
      : ctx.eat.data.favorites.map((f) => <div key={favoriteKey(f)} className="eat-card eat-between" data-testid={`card-favorite-${f.id}`}>
        <button className="eat-fav-open" onClick={() => { if (fb.run(() => ctx.eat.openFavorite(favoriteKey(f)), `Reopened ${f.name} with its saved adjustments.`)) go(`/eat/meal?id=${encodeURIComponent(f.id)}`); }} aria-label={`Open ${f.name} with saved adjustments`} data-testid={`button-open-favorite-${f.id}`}><b>{f.name}</b><div className="eat-sub" style={{ fontSize: 12 }}>{f.changes.length ? f.changes.join(', ') : 'Original recipe'} · {f.prepMinutes} min · {money(f.cost)}</div></button>
        <button className="sl-icon-btn" onClick={() => fb.run(() => ctx.eat.removeFavorite(favoriteKey(f)), `${f.name} removed from favourites.`)} aria-label={`Remove ${f.name} from favourites`} data-testid={`button-remove-favorite-${f.id}`}><Trash2 size={15} /></button>
      </div>)}
    <Feedback msg={fb.msg} id="favorites" />

    <h2 className="eat-h2"><Leaf size={17} />Healthier cooking ideas</h2>
    <div className="eat-grid2">{COOKING_IDEAS.map((idea) => <div key={idea.title} className="eat-card" data-testid={`card-idea-${idea.title}`}><span className="eat-icon"><IdeaIcon name={idea.icon} /></span><b style={{ display: 'block', margin: '8px 0 3px', fontSize: 13 }}>{idea.title}</b><span className="eat-sub" style={{ fontSize: 12 }}>{idea.description}</span></div>)}</div>
  </div>;
}

function useAdjustedMeal(ctx: EatCtx) {
  const search = useSearch();
  const id = new URLSearchParams(search).get('id') ?? ctx.eat.selectedMeal?.id;
  const base = MEALS.find((m) => m.id === id) ?? ctx.eat.selectedMeal;
  const choices = (base && ctx.eat.data.adjustments[base.id]) ?? [];
  const meal = base ? applyMealAdjustments(base, choices, ctx.eat.data.pantry, ctx.store.data.members) : undefined;
  return { base, meal, choices };
}

function Stat({ label, now, was, testid }: { label: string; now: string; was: string; testid: string }) {
  const changed = now !== was;
  return <div className={`eat-stat ${changed ? 'changed' : ''}`} data-testid={testid}>{label}<strong key={now}>{now}</strong>{changed && <s>{was}</s>}</div>;
}

export function MealDetailPage({ ctx }: { ctx: EatCtx }) {
  const { base, meal, choices } = useAdjustedMeal(ctx);
  const [, go] = useLocation();
  const fb = useFeedback();
  const [ask, setAsk] = useState(false);
  if (!base || !meal) return <div className="eat-body"><Empty icon={<ChefHat />} id="meal">That meal could not be found. <Link href="/eat" className="sl-btn sl-btn-sm">Back to meals</Link></Empty></div>;
  const members = ctx.store.data.members;
  const warn = familyMealWarnings(meal, members);
  const notes = preferenceNotes(meal, members);
  const hasLeftovers = ctx.eat.data.pantry.some((p) => p.leftover && p.confirmed && p.quantity > 0);
  const isFav = ctx.eat.data.favorites.some((f) => favoriteKey(f) === favoriteKey(meal));
  const baseNames = new Set(base.ingredients.map((i) => i.name));
  const toggle = (a: MealAdjustment) => {
    const next = choices.includes(a) ? choices.filter((c) => c !== a) : [...choices, a];
    fb.run(() => ctx.eat.setAdjustments(base.id, next), choices.includes(a) ? `Removed "${a}".` : `Applied "${a}" — see what changed below.`);
  };
  const existing = ctx.eat.data.cooking[ctx.member.id];
  const startCook = (replace: boolean) => {
    if (fb.run(() => ctx.eat.startCooking(meal, replace), 'Cooking session ready.')) go('/eat/cooking');
  };
  const cook = () => {
    if (existing && !existing.completed && favoriteKey(existing.meal) !== favoriteKey(meal)) setAsk(true);
    else startCook(false);
  };

  return <div className="eat-body">
    <Link href="/eat" className="eat-row" style={{ fontSize: 13, fontWeight: 900 }} data-testid="link-back-meals"><ArrowLeft size={15} />All meals</Link>
    <MealArt name={meal.name} ingredients={meal.ingredients.map((i) => i.name)} className="eat-hero-art" />
    <div><span className="eat-pill">{meal.cuisine}</span><h2 className="eat-title" style={{ fontSize: 26 }} data-testid="text-meal-name">{meal.name}</h2><p className="eat-sub">{meal.familySuitability}</p></div>
    <div className="eat-stats">
      <Stat label="Time" now={`${meal.prepMinutes} min`} was={`${base.prepMinutes} min`} testid="stat-time" />
      <Stat label="Cost" now={money(meal.cost)} was={money(base.cost)} testid="stat-cost" />
      <Stat label="Spice" now={meal.spice} was={base.spice} testid="stat-spice" />
      <Stat label="Salt" now={meal.salt} was={base.salt} testid="stat-salt" />
      <Stat label="Method" now={meal.method} was={base.method} testid="stat-method" />
      <Stat label="Protein" now={meal.proteinNote} was={base.proteinNote} testid="stat-protein" />
    </div>
    <Warnings list={warn} id="meal" />
    {notes.length > 0 && <div className="eat-card eat-card-tq" data-testid="text-preference-notes"><b style={{ fontSize: 13 }}>Family preferences</b>{notes.map((n) => <p key={n} className="eat-sub" style={{ marginTop: 3 }}>{n}</p>)}</div>}

    <h3 className="eat-h2"><Sparkles size={17} />Adjust it</h3>
    <div className="eat-grid2" role="group" aria-label="Meal adjustments">
      {ADJUSTMENTS.map((a) => {
        const blocked = a === 'use leftovers' && !hasLeftovers && !choices.includes(a);
        return <button key={a} className="eat-adj" aria-pressed={choices.includes(a)} disabled={blocked} title={blocked ? 'Confirm leftovers in Pantry or Leftovers first' : undefined} onClick={() => toggle(a)} data-testid={`button-adjust-${a.replace(/\s+/g, '-')}`}>{choices.includes(a) ? <Check /> : <Plus />}{a}</button>;
      })}
    </div>
    {!hasLeftovers && <p className="eat-note">"Use leftovers" unlocks once you confirm leftovers — we never invent them.</p>}
    {meal.explanations.length > 0 && <div className="eat-card" data-testid="text-adjust-explanations"><b style={{ fontSize: 13 }}>What changed</b>{meal.explanations.map((e) => <p key={e} className="eat-sub" style={{ marginTop: 4 }}>{e}</p>)}</div>}
    <Feedback msg={fb.msg} id="meal" />

    <div className="eat-card"><b style={{ fontSize: 13 }}>Ingredients</b>
      <ul className="eat-list" style={{ marginTop: 6 }}>{meal.ingredients.map((i) => <li key={i.name} data-testid={`row-ingredient-${i.name}`}><span>{i.name}{!baseNames.has(i.name) && <span className="eat-pill eat-pill-changed" style={{ marginLeft: 6 }}>new</span>}{i.leftover && <span className="eat-pill eat-pill-tq" style={{ marginLeft: 6 }}>leftover</span>}</span><span>{i.quantity} {i.unit}</span></li>)}</ul>
    </div>
    <div className="eat-grid2">
      <div className="eat-card"><Baby size={16} /><b style={{ display: 'block', fontSize: 12, margin: '4px 0' }}>Child-friendly option</b><span className="eat-sub" style={{ fontSize: 12 }}>{meal.childOption}</span></div>
      <div className="eat-card"><Leaf size={16} /><b style={{ display: 'block', fontSize: 12, margin: '4px 0' }}>Dietary</b><span className="eat-sub" style={{ fontSize: 12 }}>{meal.dietaryInfo.join(' · ')}</span><b style={{ display: 'block', fontSize: 12, margin: '6px 0 2px' }}>Leftover potential</b><span className="eat-sub" style={{ fontSize: 12 }}>{meal.leftoverPotential}</span></div>
    </div>
    <div className="eat-grid2">
      <button className="sl-btn" disabled={warn.length > 0} onClick={() => fb.run(() => ctx.eat.saveFavorite(meal), isFav ? 'Already a favourite — kept up to date.' : `${meal.name} saved to family favourites, with your adjustments.`)} data-testid="button-save-favorite"><Heart size={16} fill={isFav ? 'currentColor' : 'none'} />{isFav ? 'Favourite' : 'Save favourite'}</button>
      <button className="sl-btn sl-btn-soft" disabled={warn.length > 0} onClick={cook} data-testid="button-start-cooking"><ChefHat size={16} />Cook this</button>
    </div>
    {warn.length > 0 && <p className="eat-note">Saving and cooking are paused while this meal conflicts with a family allergy. Try another meal.</p>}
    <Link href={`/eat/grocery?id=${encodeURIComponent(base.id)}`} className="sl-btn sl-btn-ghost" data-testid="link-meal-grocery"><ShoppingCart size={16} />Grocery list & budget</Link>
    {ask && <ConfirmDialog title="Replace the meal in progress?" body={`${ctx.member.name} is partway through ${existing?.meal.name}. Starting ${meal.name} will replace that session.`} confirm="Replace it" cancel="Keep cooking" onCancel={() => setAsk(false)} onConfirm={() => { setAsk(false); startCook(true); }} />}
  </div>;
}

export function GroceryPage({ ctx }: { ctx: EatCtx }) {
  const { meal } = useAdjustedMeal(ctx);
  if (!meal) return <div className="eat-body"><Empty icon={<ShoppingCart />} id="grocery">Pick a meal first and its shopping list appears here.</Empty></div>;
  const s = grocerySummary(meal, ctx.eat.data.pantry);
  const budget = ctx.store.data.familySettings.budget;
  const pct = budget > 0 ? Math.min(100, (s.total / budget) * 100) : 0;
  return <div className="eat-body">
    <Link href={`/eat/meal?id=${encodeURIComponent(meal.id)}`} className="eat-row" style={{ fontSize: 13, fontWeight: 900 }} data-testid="link-back-meal"><ArrowLeft size={15} />{meal.name}</Link>
    <div className="eat-between"><h2 className="eat-title" style={{ fontSize: 26 }}>Grocery & budget</h2><Demo text="Sample prices" /></div>
    <div className="eat-card eat-card-navy">
      <div className="eat-between"><span>Estimated total</span><b style={{ fontSize: 24 }} data-testid="text-grocery-total">{money(s.total)}</b></div>
      <div className={`eat-bar ${s.total > budget ? 'over' : ''}`} style={{ marginTop: 10, background: '#ffffff22' }}><span style={{ width: `${pct}%` }} /></div>
      <p className="eat-sub" style={{ marginTop: 6 }}>{budget > 0 ? `${Math.round((s.total / budget) * 100)}% of your ${money(budget)} weekly food budget` : 'Set a weekly budget in your family profile to compare.'}</p>
    </div>
    <div className="eat-stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="eat-stat changed" data-testid="text-grocery-savings"><Wallet size={14} />Saved by using what you have<strong>{money(s.savings)}</strong></div>
      <div className="eat-stat" data-testid="text-waste-avoided"><Leaf size={14} />Leftover portions reused<strong>{s.potentialWasteAvoided}</strong>potential, not measured waste</div>
    </div>
    <div className="eat-card"><b style={{ fontSize: 13 }}>Shopping list</b>
      {s.items.length === 0 ? <p className="eat-sub">Nothing to buy for this meal.</p> : <ul className="eat-list" style={{ marginTop: 6 }}>{s.items.map((i) => <li key={i.name} data-testid={`row-grocery-${i.name}`}><span>{i.name}<br /><small className="eat-sub">need {i.quantity} {i.unit} · have {i.onHand} · buy {i.needed}</small></span><b>{money(i.cost)}</b></li>)}</ul>}
    </div>
    <div className="eat-card"><b style={{ fontSize: 13 }}>Already on hand</b>
      {s.onHand.length === 0 ? <p className="eat-sub">Nothing from your pantry matches yet. <Link href="/eat/pantry" style={{ textDecoration: 'underline' }}>Add pantry items</Link>.</p> : <div className="eat-wrap" style={{ marginTop: 6 }}>{s.onHand.map((p) => <span key={p.id} className="eat-pill eat-pill-tq">{p.name} · {p.quantity} {p.unit}</span>)}</div>}
    </div>
    <div className="eat-card"><b style={{ fontSize: 13 }}>Close to expiry</b>
      {s.closeToExpiry.length === 0 ? <p className="eat-sub">Nothing marked as expiring soon.</p> : <div className="eat-wrap" style={{ marginTop: 6 }}>{s.closeToExpiry.map((p) => <span key={p.id} className="eat-pill eat-pill-warn"><Star />{p.name}</span>)}</div>}
    </div>
  </div>;
}
