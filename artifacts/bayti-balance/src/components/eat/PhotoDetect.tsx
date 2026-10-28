import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Clock, Minus, Plus, Receipt, Recycle, ShoppingBasket, Trash2, Upload, X } from 'lucide-react';
import { Demo } from '@/components/shared/kit';
import { ingredientWarnings, sampleDetection } from '@/lib/eat-data';
import type { PantryItem, PhotoType } from '@/lib/eat-types';
import { Feedback, money, SampleArt, SamplePhoto, useFeedback, Warnings, type EatCtx } from './kit';

type Phase = 'idle' | 'reading' | 'review';
const LABEL: Record<PhotoType, string> = { pantry: 'Pantry shelf', receipt: 'Shop receipt', leftovers: 'Leftovers' };

export default function PhotoDetect({ ctx, types, leftoverMode = false, onOpenPantry, onConfirmed }: {
  ctx: EatCtx; types: PhotoType[]; leftoverMode?: boolean; onOpenPantry?(): void; onConfirmed?(items: PantryItem[]): void;
}) {
  const [type, setType] = useState<PhotoType>(types[0]);
  const [upload, setUpload] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [staged, setStaged] = useState<PantryItem[]>([]);
  const [newName, setNewName] = useState('');
  const token = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const fb = useFeedback();

  useEffect(() => () => { window.clearTimeout(timer.current); }, []);
  useEffect(() => () => { if (upload) URL.revokeObjectURL(upload); }, [upload]);

  const begin = (next: PhotoType) => {
    window.clearTimeout(timer.current);
    const mine = ++token.current;
    setType(next); setPhase('reading'); setStaged([]); fb.clear();
    timer.current = window.setTimeout(() => {
      if (mine !== token.current) return; // late result from an older selection
      setStaged(sampleDetection(next).map((item) => ({ ...item, leftover: leftoverMode ? true : item.leftover })));
      setPhase('review');
    }, 1700);
  };
  const pickSample = (t: PhotoType) => { setUpload(null); begin(t); };
  const onFile = (file: File | undefined, t: PhotoType) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { fb.run(() => { throw new Error('Please choose an image file (JPG or PNG).'); }, ''); return; }
    setUpload(URL.createObjectURL(file)); begin(t);
  };
  const patch = (id: string, p: Partial<PantryItem>) => setStaged((old) => old.map((it) => it.id === id ? { ...it, ...p } : it));
  const add = () => {
    const name = newName.trim(); if (!name) return;
    setStaged((old) => [...old, { id: crypto.randomUUID(), name, quantity: 1, unit: 'item', unitPrice: 0, confidence: 1, confirmed: true, leftover: leftoverMode, expiringSoon: false, source: 'manual' }]);
    setNewName('');
  };
  const names = useMemo(() => staged.map((s) => s.name), [staged]);
  const warnings = ingredientWarnings(names, ctx.store.data.members);
  const total = staged.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const unsure = staged.filter((s) => s.confidence < 0.7 && !s.confirmed);
  const confirm = () => {
    const items = staged.map((s) => ({ ...s, confirmed: true }));
    if (fb.run(() => {
      if (!items.length) throw new Error('There is nothing to confirm yet. Add at least one ingredient.');
      if (unsure.length) throw new Error(`Please answer "Is this correct?" for ${unsure.map((u) => u.name).join(', ')} first.`);
      if (leftoverMode && !items.some((i) => i.leftover)) throw new Error('Mark at least one component as leftover before confirming.');
      ctx.eat.confirmDetection(items);
    }, `Saved ${items.length} ingredient${items.length === 1 ? '' : 's'} to your family pantry.`)) { setStaged(items); onConfirmed?.(items); }
  };

  return <div className="eat-body" style={{ padding: 0 }}>
    {!leftoverMode && <div className="eat-grid3">
      <button className="eat-action" onClick={() => { setType('pantry'); camRef.current?.click(); }} data-testid="button-photograph-ingredients"><span className="eat-icon"><Camera /></span>Photograph ingredients<small>Opens your camera</small></button>
      <button className="eat-action" onClick={() => { setType('receipt'); fileRef.current?.click(); }} data-testid="button-upload-receipt"><span className="eat-icon"><Receipt /></span>Upload a receipt<small>Prices + total</small></button>
      <button className="eat-action" onClick={onOpenPantry} data-testid="button-open-pantry"><span className="eat-icon"><ShoppingBasket /></span>Open pantry<small>{ctx.eat.data.pantry.length} saved</small></button>
    </div>}
    <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0], type); e.target.value = ''; }} data-testid="input-camera" />
    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0], type); e.target.value = ''; }} data-testid="input-upload" />

    <div>
      <div className="eat-between"><h3 className="eat-h2" style={{ margin: 0 }}>Try a sample photo</h3><Demo text="Demo detection" /></div>
      <div className={types.length > 1 ? 'eat-grid3' : 'eat-grid2'} style={{ marginTop: 8 }}>
        {types.map((t) => <button key={t} className="eat-sample" aria-pressed={!upload && type === t && phase !== 'idle'} onClick={() => pickSample(t)} data-testid={`button-sample-${t}`}><SamplePhoto type={t} />{LABEL[t]}</button>)}
        {types.length === 1 && <button className="eat-sample" aria-pressed={!!upload} onClick={() => fileRef.current?.click()} data-testid="button-upload-own"><SampleArt type={types[0]} />Upload your own</button>}
      </div>
      {types.length > 1 && <div className="eat-row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        <span className="eat-sub">Own photo is a</span>
        {types.map((t) => <button key={t} className="eat-toggle" aria-pressed={type === t} onClick={() => setType(t)} data-testid={`button-upload-type-${t}`}>{LABEL[t]}</button>)}
        <button className="sl-btn sl-btn-soft sl-btn-sm" onClick={() => fileRef.current?.click()} data-testid="button-upload-own"><Upload size={14} />Upload</button>
      </div>}
      <p className="eat-note" style={{ marginTop: 8 }}>Your photo is not analysed. It stays on this device as a preview only, and the Demo returns the sample results for the photo type you chose.</p>
    </div>

    {phase !== 'idle' && <div className="eat-preview" data-testid="preview-photo">
      {upload ? <img src={upload} alt="Your uploaded photo preview" /> : <SamplePhoto type={type} />}
      {phase === 'reading' && <><div className="eat-scanline" /><div className="eat-reading" data-testid="status-reading"><span className="eat-dots"><i /><i /><i /></span>AI is reading your photo<span style={{ marginLeft: 'auto' }}><Demo /></span></div></>}
    </div>}
    {phase === 'reading' && <div style={{ display: 'grid', gap: 8 }} aria-hidden><div className="eat-skel" /><div className="eat-skel" /></div>}

    {phase === 'review' && <div style={{ display: 'grid', gap: 9 }}>
      <div className="eat-between"><h3 className="eat-h2" style={{ margin: 0 }}>Review before saving</h3><Demo text="Demo detection" /></div>
      <p className="eat-sub">Nothing is stored until you confirm. Edit names, amounts and labels first.</p>
      {staged.map((it) => {
        const low = it.confidence < 0.7;
        return <div key={it.id} className={`eat-item ${low && !it.confirmed ? 'low' : it.confirmed ? 'ok' : ''}`} data-testid={`chip-detected-${it.id}`}>
          <div className="eat-row">
            <input className="eat-name" value={it.name} onChange={(e) => patch(it.id, { name: e.target.value })} aria-label="Ingredient name" data-testid={`input-detected-name-${it.id}`} />
            <span className={`eat-conf ${low ? 'low' : ''}`}>{it.source === 'manual' ? 'Added by you' : `${Math.round(it.confidence * 100)}% sure`}</span>
            <button className="sl-icon-btn" style={{ width: 32, height: 32 }} onClick={() => setStaged((o) => o.filter((x) => x.id !== it.id))} aria-label={`Remove ${it.name}`} data-testid={`button-remove-detected-${it.id}`}><Trash2 size={14} /></button>
          </div>
          {low && !it.confirmed && <div className="eat-ask" data-testid={`ask-correct-${it.id}`}>Is this correct?
            <button className="eat-toggle" onClick={() => patch(it.id, { confirmed: true })} data-testid={`button-yes-correct-${it.id}`}><Check />Yes, correct</button>
            <button className="eat-toggle" onClick={() => setStaged((o) => o.filter((x) => x.id !== it.id))} data-testid={`button-not-correct-${it.id}`}><X />Not this</button></div>}
          <div className="eat-row" style={{ flexWrap: 'wrap' }}>
            <span className="eat-qty"><button onClick={() => patch(it.id, { quantity: Math.max(0.5, +(it.quantity - (it.quantity > 1 ? 1 : 0.5)).toFixed(1)) })} aria-label={`Less ${it.name}`} data-testid={`button-qty-minus-${it.id}`}><Minus size={13} /></button>
              <span data-testid={`text-qty-${it.id}`}>{it.quantity} {it.unit}</span>
              <button onClick={() => patch(it.id, { quantity: +(it.quantity + 1).toFixed(1) })} aria-label={`More ${it.name}`} data-testid={`button-qty-plus-${it.id}`}><Plus size={13} /></button></span>
            <button className="eat-toggle" aria-pressed={it.leftover} onClick={() => patch(it.id, { leftover: !it.leftover })} data-testid={`button-leftover-${it.id}`}><Recycle />Leftover</button>
            <button className="eat-toggle" aria-pressed={it.expiringSoon} onClick={() => patch(it.id, { expiringSoon: !it.expiringSoon })} data-testid={`button-expiring-${it.id}`}><Clock />Expiring soon</button>
            {type === 'receipt' && it.unitPrice > 0 && <span className="eat-pill" data-testid={`text-line-price-${it.id}`}>{money(it.quantity * it.unitPrice)}</span>}
          </div>
        </div>;
      })}
      <div className="eat-row">
        <input className="eat-input" style={{ flex: 1 }} value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Add something we missed" aria-label="Add ingredient" data-testid="input-add-detected" />
        <button className="sl-btn sl-btn-soft sl-btn-sm" onClick={add} disabled={!newName.trim()} data-testid="button-add-detected"><Plus size={14} />Add</button>
      </div>
      {type === 'receipt' && <div className="eat-card eat-card-tq eat-between" data-testid="text-receipt-total"><b>Receipt total (sample prices)</b><b>{money(total)}</b></div>}
      <div className="eat-sub">Weekly family food budget: <b>{money(ctx.store.data.familySettings.budget)}</b>{total > 0 && <> — this shop is {Math.round((total / Math.max(1, ctx.store.data.familySettings.budget)) * 100)}% of it.</>}</div>
      <Warnings list={warnings} id="detected" />
      <button className="sl-btn sl-full" onClick={confirm} disabled={!staged.length} data-testid="button-confirm-detection"><Check size={16} />Confirm and add to pantry</button>
      <Feedback msg={fb.msg} id="detection" />
    </div>}
    {phase === 'idle' && <Feedback msg={fb.msg} id="detection-idle" />}
  </div>;
}
