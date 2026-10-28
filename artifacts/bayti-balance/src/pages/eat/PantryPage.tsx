import { useRef, useState } from 'react';
import { Clock, Minus, Plus, Recycle, ShoppingBasket, Trash2 } from 'lucide-react';
import PhotoDetect from '@/components/eat/PhotoDetect';
import { Empty, Feedback, money, useFeedback, Warnings, type EatCtx } from '@/components/eat/kit';
import { ingredientWarnings } from '@/lib/eat-data';

export function PantryPage({ ctx }: { ctx: EatCtx }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const fb = useFeedback();
  const pantry = ctx.eat.data.pantry;
  const value = pantry.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
  const budget = ctx.store.data.familySettings.budget;
  const add = () => {
    const n = name.trim(); const q = Number(qty);
    if (fb.run(() => {
      if (!n) throw new Error('Type an ingredient name first.');
      if (!Number.isFinite(q) || q <= 0) throw new Error('Quantity must be a number above zero.');
      ctx.eat.addIngredient({ name: n, quantity: q, unit: 'item', source: 'manual', confirmed: true, confidence: 1 });
    }, `${n} added to your pantry.`)) { setName(''); setQty('1'); }
  };
  const upd = (id: string, patch: Parameters<typeof ctx.eat.updateIngredient>[1], ok: string) => fb.run(() => ctx.eat.updateIngredient(id, patch), ok);

  return <div className="eat-body">
    <PhotoDetect ctx={ctx} types={['pantry', 'receipt', 'leftovers']} onOpenPantry={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
    <div ref={listRef} style={{ scrollMarginTop: 60 }}>
      <h2 className="eat-h2"><ShoppingBasket size={17} />Family pantry</h2>
      <div className="eat-card eat-card-tq eat-between" style={{ marginBottom: 9 }} data-testid="text-pantry-budget">
        <span className="eat-sub">Estimated value on hand<br /><b style={{ color: 'var(--navy)', fontSize: 18 }}>{money(value)}</b></span>
        <span className="eat-sub" style={{ textAlign: 'right' }}>Weekly budget<br /><b style={{ color: 'var(--navy)', fontSize: 18 }}>{money(budget)}</b></span>
      </div>
      <Warnings list={ingredientWarnings(pantry.map((p) => p.name), ctx.store.data.members)} id="pantry" />
      <div style={{ display: 'grid', gap: 8, marginTop: 9 }}>
        {pantry.length === 0 && <Empty icon={<ShoppingBasket />} id="pantry">Your pantry is empty. Try a sample photo above, or add an ingredient by hand.</Empty>}
        {pantry.map((p) => <div key={p.id} className="eat-item ok" data-testid={`row-pantry-${p.id}`}>
          <div className="eat-between"><b>{p.name}</b><span className="eat-conf">{p.source === 'manual' ? 'Added by you' : 'Demo, confirmed'}</span></div>
          <div className="eat-row" style={{ flexWrap: 'wrap' }}>
            <span className="eat-qty">
              <button onClick={() => upd(p.id, { quantity: Math.max(0.5, p.quantity - 1) }, `${p.name} updated.`)} aria-label={`Less ${p.name}`} data-testid={`button-pantry-minus-${p.id}`}><Minus size={13} /></button>
              <span>{p.quantity} {p.unit}</span>
              <button onClick={() => upd(p.id, { quantity: p.quantity + 1 }, `${p.name} updated.`)} aria-label={`More ${p.name}`} data-testid={`button-pantry-plus-${p.id}`}><Plus size={13} /></button>
            </span>
            <button className="eat-toggle" aria-pressed={p.leftover} onClick={() => upd(p.id, { leftover: !p.leftover }, p.leftover ? `${p.name} is no longer a leftover.` : `${p.name} marked as leftover.`)} data-testid={`button-pantry-leftover-${p.id}`}><Recycle />Leftover</button>
            <button className="eat-toggle" aria-pressed={p.expiringSoon} onClick={() => upd(p.id, { expiringSoon: !p.expiringSoon }, `${p.name} expiry updated.`)} data-testid={`button-pantry-expiring-${p.id}`}><Clock />Expiring</button>
            <button className="sl-icon-btn" style={{ width: 32, height: 32, marginLeft: 'auto' }} onClick={() => fb.run(() => ctx.eat.removeIngredient(p.id), `${p.name} removed.`)} aria-label={`Remove ${p.name}`} data-testid={`button-pantry-remove-${p.id}`}><Trash2 size={14} /></button>
          </div>
        </div>)}
      </div>
      <div className="eat-row" style={{ marginTop: 10 }}>
        <input className="eat-input" style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. dates" aria-label="Ingredient name" data-testid="input-pantry-name" />
        <input className="eat-input" style={{ width: 62 }} type="number" min="0.5" step="0.5" value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Quantity" data-testid="input-pantry-qty" />
        <button className="sl-btn sl-btn-sm" onClick={add} data-testid="button-pantry-add"><Plus size={14} />Add</button>
      </div>
      <div style={{ marginTop: 8 }}><Feedback msg={fb.msg} id="pantry" /></div>
    </div>
  </div>;
}
