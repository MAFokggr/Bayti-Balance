import { Baby, Bookmark, Check, Clock, Leaf, Recycle, ShoppingCart } from 'lucide-react';
import PhotoDetect from '@/components/eat/PhotoDetect';
import { Empty, Feedback, MealArt, useFeedback, type EatCtx } from '@/components/eat/kit';
import { favoriteKey, leftoverSuggestions } from '@/lib/eat-data';

export function LeftoversPage({ ctx }: { ctx: EatCtx }) {
  const fb = useFeedback();
  const confirmed = ctx.eat.data.pantry.filter((p) => p.leftover && p.confirmed);
  const recipes = confirmed.length ? leftoverSuggestions(ctx.eat.data.pantry, ctx.store.data.members) : [];
  const savedKeys = new Set(ctx.eat.data.savedLeftovers.map(favoriteKey));

  return <div className="eat-body">
    <p className="eat-sub">Snap the containers in your fridge, mark what is leftover, and we suggest three ways to finish them.</p>
    <PhotoDetect ctx={ctx} types={['leftovers']} leftoverMode />
    <h2 className="eat-h2"><Recycle size={17} />Ideas for your leftovers</h2>
    {confirmed.length === 0 ? <Empty icon={<Recycle />} id="leftovers">No confirmed leftovers yet. Confirm a photo above or mark pantry items as leftover — recipes never use leftovers you have not confirmed.</Empty> : <>
      <div className="eat-wrap">{confirmed.map((p) => <span key={p.id} className="eat-pill eat-pill-tq">{p.name}</span>)}</div>
      {recipes.length < 3 && <p className="eat-note" data-testid="text-few-recipes">Only {recipes.length} recipe{recipes.length === 1 ? '' : 's'} {recipes.length === 1 ? 'is' : 'are'} safe for every family allergy with these leftovers, so we are not padding the list.</p>}
      {recipes.length === 0 ? <Empty icon={<Leaf />} id="recipes">No allergy-safe recipe fits these leftovers. Add a few more confirmed items and try again.</Empty>
        : <div className="eat-swipe" aria-label="Leftover recipes, swipe sideways" data-testid="list-leftover-recipes">{recipes.map((r) => {
          const saved = savedKeys.has(favoriteKey(r.meal));
          return <article key={r.id} className="eat-card" style={{ display: 'grid', gap: 9 }} data-testid={`card-leftover-${r.id}`}>
            <MealArt name={r.meal.name} ingredients={r.used} className="eat-hero-art" />
            <div className="eat-between"><b style={{ fontSize: 16 }}>{r.meal.name}</b><span className="eat-pill"><Clock />{r.meal.prepMinutes} min</span></div>
            <div><small className="eat-sub"><Check size={12} /> Uses</small><div className="eat-wrap">{r.used.map((u) => <span key={u} className="eat-pill eat-pill-tq">{u}</span>)}</div></div>
            <div><small className="eat-sub"><ShoppingCart size={12} /> Still needed</small><div className="eat-wrap">{r.needed.length ? r.needed.map((u) => <span key={u} className="eat-pill">{u}</span>) : <span className="eat-pill">Nothing extra</span>}</div></div>
            <div className="eat-stat changed"><Leaf size={13} /> Potential food waste avoided<strong>~{r.wasteAvoided} portion{r.wasteAvoided === 1 ? '' : 's'}</strong>estimate</div>
            <p className="eat-sub" style={{ fontSize: 12 }}><Baby size={13} /> {r.childOption}</p>
            <button className="sl-btn sl-btn-sm" disabled={saved} onClick={() => fb.run(() => ctx.eat.saveLeftover(r.meal), `${r.meal.name} saved to your leftover recipes.`)} data-testid={`button-save-leftover-${r.id}`}><Bookmark size={14} />{saved ? 'Saved' : 'Save this one'}</button>
          </article>;
        })}</div>}
    </>}
    <Feedback msg={fb.msg} id="leftovers" />
    <h2 className="eat-h2"><Bookmark size={17} />Saved leftover recipes</h2>
    {ctx.eat.data.savedLeftovers.length === 0 ? <Empty icon={<Bookmark />} id="saved-leftovers">Saved recipes stay here after you reload.</Empty>
      : ctx.eat.data.savedLeftovers.map((m) => <div key={favoriteKey(m)} className="eat-card eat-between" data-testid={`card-saved-leftover-${m.id}`}><b>{m.name}</b><span className="eat-pill"><Clock />{m.prepMinutes} min</span></div>)}
  </div>;
}
