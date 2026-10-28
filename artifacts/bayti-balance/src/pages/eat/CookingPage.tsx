import { useState } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, Award, Bot, Check, ChefHat, Pause, Play, RotateCcw, SkipForward, Users } from 'lucide-react';
import { Demo } from '@/components/shared/kit';
import { cookingTip } from '@/lib/eat-data';
import type { CookingStep } from '@/lib/eat-types';
import type { AgeGroup } from '@/lib/family-types';
import { useMoveTimer } from '@/hooks/use-move-timer';
import { Empty, Feedback, MealArt, useFeedback, type EatCtx } from '@/components/eat/kit';

const ROLE_LABEL: Record<CookingStep['role'], string> = { parent: 'Parent: heat & knife', child: 'Child-safe task', teenager: 'Teen: measure & mix', shared: 'Shared task' };
const MY_ROLE: Record<AgeGroup, CookingStep['role']> = { child: 'child', teen: 'teenager', adult: 'parent', senior: 'parent' };
const HEAT = /(cook|bake|fry|heat|boil|simmer|roast|grill|oven|pan)/i;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function StepTimer({ seconds }: { seconds: number }) {
  const t = useMoveTimer(seconds);
  if (!seconds) return <span className="eat-sub">No timer needed</span>;
  return <div className="eat-between">
    <span className="eat-timer" data-testid="text-step-timer">{fmt(t.remaining ?? 0)}</span>
    <div className="eat-row">
      <button className="sl-icon-btn" onClick={t.running ? t.pause : t.start} aria-label={t.running ? 'Pause timer' : 'Start timer'} data-testid="button-timer-toggle">{t.running ? <Pause size={16} /> : <Play size={16} />}</button>
      <button className="sl-icon-btn" onClick={t.reset} aria-label="Reset timer" data-testid="button-timer-reset"><RotateCcw size={15} /></button>
    </div>
  </div>;
}

export function CookingPage({ ctx }: { ctx: EatCtx }) {
  const s = ctx.eat.cookingSession;
  const fb = useFeedback();
  const [tip, setTip] = useState<{ id: string; text: string } | null>(null);
  const [repeatKey, setRepeatKey] = useState(0);
  if (!s) return <div className="eat-body"><Empty icon={<ChefHat />} id="cooking">No meal on the stove for {ctx.member.name} yet. Pick a meal, adjust it, then press Cook this.<Link href="/eat" className="sl-btn sl-btn-sm" data-testid="link-choose-meal">Choose a meal</Link></Empty></div>;
  const steps = s.meal.steps;
  const step = steps[Math.min(s.stepIndex, steps.length - 1)];
  const mine = MY_ROLE[ctx.member.ageGroup];
  const skipped = steps.filter((x) => s.statuses[x.id] === 'skipped');
  const doneCount = steps.filter((x) => s.statuses[x.id] === 'done').length;
  const skippedHeat = steps.filter((x) => s.statuses[x.id] === 'skipped' && HEAT.test(`${x.title} ${x.instruction}`));
  const act = (a: 'done' | 'skip' | 'repeat') => { setTip(null); if (fb.run(() => ctx.eat.advanceCooking(a), a === 'done' ? 'Step done.' : a === 'skip' ? 'Step skipped.' : 'Step reset — take it again.') && a === 'repeat') setRepeatKey((key) => key + 1); };

  return <div className="eat-body">
    <div className="eat-row"><MealArt name={s.meal.name} ingredients={s.meal.ingredients.map((i) => i.name)} className="" /><div><b data-testid="text-cooking-meal">{s.meal.name}</b><p className="eat-sub">Cooking with {ctx.member.name}{s.meal.changes.length ? ` · ${s.meal.changes.join(', ')}` : ''}</p></div></div>
    <div className="eat-progress-dots" aria-label={`Step ${s.stepIndex + 1} of ${steps.length}`}>{steps.map((x, i) => <i key={x.id} className={s.statuses[x.id] === 'done' ? 'done' : s.statuses[x.id] === 'skipped' ? 'skipped' : i === s.stepIndex ? 'now' : ''} />)}</div>
    {s.completed && <div className="eat-card eat-card-tq" data-testid="status-cooking-complete"><b>{skipped.length ? 'Reached the end, with skipped steps.' : 'Every step marked done.'}</b><p className="eat-sub">{skipped.length ? 'Revisit the skipped steps below to complete the recipe.' : 'Nicely done, family kitchen. Check food is cooked through before serving.'}</p></div>}
    <div className={`eat-pts ${ctx.eat.cookingPointsEarned ? 'won' : ''}`} role="status" data-testid="status-cooking-points"><Award />{ctx.eat.cookingPointsEarned ? <span>+5 family points earned today for {ctx.member.name}. More recipes today will not add extra points.</span>
      : s.completed && skipped.length ? <span>No points yet: {skipped.length} skipped {skipped.length === 1 ? 'step' : 'steps'}. Skips do not count as completion.</span>
      : <span>Mark all {steps.length} steps Done to earn 5 family points (once per day). {doneCount} of {steps.length} done.</span>}</div>
    {skipped.length > 0 && <div className="eat-card" data-testid="card-revisit"><b style={{ fontSize: 13 }}>Revisit a skipped step</b><p className="eat-sub" style={{ marginBottom: 8 }}>Your recipe and adjustments stay as they are.</p><div className="eat-revisit">{skipped.map((x) => { const i = steps.indexOf(x); return <button key={x.id} aria-current={i === s.stepIndex ? 'step' : undefined} onClick={() => { setTip(null); fb.run(() => ctx.eat.revisitCookingStep(i), `Back to step ${i + 1}: ${x.title}.`); }} data-testid={`button-revisit-step-${x.id}`}>Step {i + 1} · {x.title}</button>; })}</div></div>}
    {skippedHeat.length > 0 && <div className="eat-warn" role="alert" data-testid="warning-skipped-heat"><AlertTriangle /><span>A heating step was skipped ({skippedHeat.map((x) => x.title).join(', ')}). We cannot say this food is cooked safely — please repeat it or check it is thoroughly cooked.</span></div>}
    {step && <article className="eat-step" key={step.id} data-testid={`card-step-${step.id}`}>
      <div className="eat-between"><span className="eat-step-num">{s.stepIndex + 1}<small style={{ fontSize: 15, color: '#657789' }}>/{steps.length}</small></span><span className={`eat-role eat-role-${step.role}`}><Users size={12} />{ROLE_LABEL[step.role]}</span></div>
      {step.role === mine && <span className="eat-pill eat-pill-tq">This one is for {ctx.member.name}</span>}
      <MealArt name={step.illustration || step.title} ingredients={step.ingredients} className="eat-hero-art" />
      <h3 style={{ margin: 0, fontSize: 19, fontWeight: 900 }}>{step.title}</h3>
      {step.ingredients.length > 0 && <div className="eat-wrap">{step.ingredients.map((i) => <span key={i} className="eat-pill">{i}</span>)}</div>}
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, fontWeight: 700 }}>{step.instruction}</p>
      {s.statuses[step.id] && <span className="eat-pill">Marked {s.statuses[step.id]}</span>}
      <StepTimer key={`${s.id}:${step.id}:${repeatKey}`} seconds={step.timerSeconds} />
      <div className="eat-grid3">
        <button className="sl-btn sl-btn-sm" onClick={() => act('done')} data-testid="button-step-done"><Check size={14} />Done</button>
        <button className="sl-btn sl-btn-soft sl-btn-sm" onClick={() => act('repeat')} data-testid="button-step-repeat"><RotateCcw size={14} />Repeat</button>
        <button className="sl-btn sl-btn-ghost sl-btn-sm" onClick={() => act('skip')} data-testid="button-step-skip"><SkipForward size={14} />Skip</button>
      </div>
      <button className="sl-btn sl-btn-ghost sl-btn-sm" onClick={() => setTip({ id: step.id, text: cookingTip(step) })} data-testid="button-ask-ai"><Bot size={14} />Ask AI <Demo /></button>
      {tip?.id === step.id && <div className="eat-tip" data-testid="text-ai-tip"><Demo /> {tip.text}<br /><small className="eat-sub">Canned Demo tip — no AI service is contacted.</small></div>}
    </article>}
    <Feedback msg={fb.msg} id="cooking" />
    <h3 className="eat-h2"><Users size={17} />Who does what</h3>
    <div className="eat-grid2">{(['parent', 'child', 'teenager', 'shared'] as const).map((r) => <div key={r} className="eat-card" data-testid={`card-role-${r}`}><span className={`eat-role eat-role-${r}`}>{ROLE_LABEL[r]}</span>
      <ul className="eat-list" style={{ marginTop: 6 }}>{steps.filter((x) => x.role === r).map((x) => <li key={x.id} style={{ fontSize: 12 }}>{x.title}</li>)}{!steps.some((x) => x.role === r) && <li style={{ fontSize: 12 }}>No task this time</li>}</ul></div>)}</div>
  </div>;
}
