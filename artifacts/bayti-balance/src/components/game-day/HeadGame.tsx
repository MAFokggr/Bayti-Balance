import { useEffect, useState } from 'react';
import { ArrowRight, Check, Droplets, Pause, Play, RotateCcw, Square, X } from 'lucide-react';
import { GAME_CONFIGS, type GameDayState, type Player } from '@/lib/game-day';
import { dispatchGameDay, getGameDayState } from '@/lib/game-day-store';
import {
  CARDS_PER_TURN, HEAD_CATEGORIES, HEAD_SECONDS, advanceHead, beginHeadPlay, cardsInCategory, endHeadTurn, headCardById,
  headTotals, participantLabel, participants, startHead, toggleHeadPause, validateHeadSetup, type HeadCategory, type HeadState,
} from '@/lib/head';
import { AiBadge, NeedBox, Timer } from './GameBits';

const headConfig = GAME_CONFIGS.find(g => g.id === 'head')!;
const setHead = (head: HeadState) => dispatchGameDay({ type: 'head', head });
const RULE = 'Clue-givers can describe, act, and give hints. Do NOT say the name, spell it, or translate it.';

export function HeadSetup({ s }: { s: GameDayState }) {
  const [category, setCategory] = useState<HeadCategory>('landmarks');
  const error = validateHeadSetup(s.players, s.individualMode);
  const start = () => {
    if (error) return;
    dispatchGameDay({ type: 'head', head: startHead(s.players, s.individualMode, category, s.rounds) });
    dispatchGameDay({ type: 'stage', stage: 'content' });
  };
  return <>
    <div className="eyebrow">3 · Rules and ready</div>
    <h1 className="title gd-title">Khamen on Head <span lang="ar" dir="rtl" className="gd-ar">خمّن</span></h1>
    <NeedBox text={headConfig.need} />
    <p className="gd-label" style={{ marginTop: 12 }}>Choose a category card</p>
    <div className="gd-cats" role="radiogroup" aria-label="Category">{HEAD_CATEGORIES.map(c => <button key={c.id} role="radio" aria-checked={category === c.id} className={`gd-cat ${category === c.id ? 'on' : ''}`} onClick={() => setCategory(c.id)} data-testid={`button-head-category-${c.id}`}>
      <span aria-hidden="true">{c.emoji}</span><b>{c.name}</b><small>{cardsInCategory(c.id).length} cards</small></button>)}</div>
    <section className="gd-card" style={{ borderTop: `6px solid ${headConfig.color}`, marginTop: 10 }}>
      <div className="sl-row" style={{ gap: 6, marginBottom: 8 }}>
        <button className={`gd-choice ${!s.individualMode ? 'active' : ''}`} onClick={() => dispatchGameDay({ type: 'config', key: 'individualMode', value: false })} data-testid="button-head-team-mode">Team mode</button>
        <button className={`gd-choice ${s.individualMode ? 'active' : ''}`} onClick={() => dispatchGameDay({ type: 'config', key: 'individualMode', value: true })} data-testid="button-head-individual-mode">Individual mode</button>
      </div>
      <p className="sl-sub">{s.individualMode ? 'Players take turns guessing while everyone else gives clues.' : 'Teams alternate. One guesser per turn, teammates give clues.'}</p>
      <p className="gd-rule">{RULE}</p>
      <ul className="gd-rules"><li>5 cards and 60 seconds a turn. Got it = 1 point, scored out of 5.</li><li>Keyboard: Right arrow or Space = Got it. Left or Down arrow = Didn’t get it.</li><li>Tie? One extra 5-card turn each.</li></ul>
      <label className="gd-muted" htmlFor="head-turns">Turns per {s.individualMode ? 'player' : 'team'}: {s.rounds} (out of {s.rounds * CARDS_PER_TURN})</label>
      <input id="head-turns" type="range" className="sl-range" min={1} max={4} value={s.rounds} onChange={e => dispatchGameDay({ type: 'config', key: 'rounds', value: Number(e.target.value) })} data-testid="slider-head-turns" />
      {error && <p className="gd-error" role="alert" data-testid="text-head-setup-error">{error}</p>}
    </section>
    <button className="sl-btn sl-full" style={{ marginTop: 12 }} disabled={Boolean(error)} onClick={start} data-testid="button-start-head">Yalla, start <ArrowRight size={16} /></button>
  </>;
}

function HeadPicture({ id, emoji }: { id: string; emoji: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [id]);
  return <div className="gd-head-pic">
    {!failed && <img src={`${import.meta.env.BASE_URL}images/head/${id}.jpg`} alt="" onError={() => setFailed(true)} />}
    {failed && <span aria-hidden="true">{emoji}</span>}
  </div>;
}

export function HeadPlay({ s }: { s: GameDayState }) {
  const h = s.head!;
  const players: Player[] = s.players;
  const [count, setCount] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const t = h.current;
  const who = participantLabel(t.who, players);
  const guesser = players.find(p => p.id === t.guesser)?.name ?? who;
  const parts = participants(players, h.individual);
  const totals = headTotals(h.phase === 'turn-end' ? [...h.history, t] : h.history, parts);
  const card = headCardById(t.cards[t.marks.length] ?? '');
  const category = HEAD_CATEGORIES.find(c => c.id === h.category);
  const turnsDone = (p: string) => (h.phase === 'turn-end' ? [...h.history, t] : h.history).filter(x => x.who === p).length;

  useEffect(() => {
    if (h.phase !== 'play' || h.paused) return;
    const id = window.setInterval(() => dispatchGameDay({ type: 'head-tick' }), 1000);
    return () => window.clearInterval(id);
  }, [h.phase, h.paused]);
  useEffect(() => {
    if (!count) return;
    const id = window.setTimeout(() => { if (count === 1) { setCount(0); setHead(beginHeadPlay(getGameDayState().head!)); } else setCount(count - 1); }, 1000);
    return () => window.clearTimeout(id);
  }, [count]);
  useEffect(() => {
    if (h.phase !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); dispatchGameDay({ type: 'head-mark', mark: 'got' }); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); dispatchGameDay({ type: 'head-mark', mark: 'miss' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [h.phase]);

  const next = () => {
    const { state, done } = advanceHead(getGameDayState().head!, getGameDayState().players);
    setHead(state);
    if (!done) return;
    const final = headTotals(state.history, parts);
    const leader = parts.reduce((a, b) => (final[b] > final[a] ? b : a), parts[0]);
    dispatchGameDay({ type: 'custom-results', scores: final, notice: `${participantLabel(leader, players)} wins Khamen on Head` });
  };
  const turnLabel = t.tieRound ? `Tie-break turn · round ${t.tieRound}` : `Turn ${t.index + 1} of ${parts.length * h.turnsEach}`;
  const reset = () => {
    dispatchGameDay({ type: 'game', game: 'head' });
    setConfirmReset(false);
  };

  return <section className="gd-head" data-testid="head-play">
    {confirmReset
      ? <div className="gd-card gd-reset-confirm" role="alertdialog" aria-label="Restart Khamen on Head">
        <p>This restarts the active game. Previously saved scores stay saved.</p>
        <button className="sl-btn sl-btn-sm" onClick={reset} data-testid="button-confirm-reset-head">Restart game</button>
        <button className="sl-btn sl-btn-sm sl-btn-ghost" onClick={() => setConfirmReset(false)} data-testid="button-cancel-reset-head">Keep playing</button>
      </div>
      : <button className="sl-btn sl-btn-sm sl-btn-ghost" onClick={() => setConfirmReset(true)} data-testid="button-reset-head"><RotateCcw size={14} /> Reset game</button>}
    <div className="gd-scorebar">{parts.map(p => <span key={p} className={t.who === p ? 'on' : ''}>{participantLabel(p, players)}<b data-testid={`text-head-total-${p}`}>{totals[p] ?? 0}/{Math.max(1, turnsDone(p)) * CARDS_PER_TURN}</b></span>)}</div>
    <div className="sl-between" style={{ margin: '10px 0' }}><span className="gd-badge">{category?.emoji} {category?.name}</span><span className="gd-badge">{turnLabel}</span></div>

    {h.phase === 'rules' && (count ? <div className="gd-countdown" data-testid="head-countdown" aria-live="assertive"><b>{count}</b><p>Put the phone on your head!</p></div>
      : <div className="gd-handoff" data-testid="head-rules">
        <h2>{h.individual ? `${who} guesses` : `${who}: ${guesser} guesses`}</h2>
        <p className="gd-rule">{RULE}</p>
        <p className="gd-muted">A clue-giver or the host taps the buttons. The guesser cannot see the card.</p>
        <button className="sl-btn sl-full" onClick={() => setCount(3)} data-testid="button-head-countdown">3-2-1, go! <ArrowRight size={16} /></button>
      </div>)}

    {h.phase === 'play' && card && <>
      <div className="sl-between"><span className="gd-points" data-testid="text-head-turn-score">{who}: {t.score}/{CARDS_PER_TURN}</span><Timer seconds={h.secondsLeft} total={HEAD_SECONDS} label="Turn time" testId="text-head-timer" /></div>
      <div className={`gd-headcard ${h.paused ? 'paused' : ''}`} key={card.id} data-testid="head-card"><AiBadge /><HeadPicture id={card.id} emoji={card.emoji} /><h2 data-testid="text-head-card-name">{card.name}</h2><small>Card {t.marks.length + 1} of {CARDS_PER_TURN}</small>{h.paused && <div className="gd-paused">Paused</div>}</div>
      <div className="gd-bigbtns">
        <button className="gd-big miss" disabled={h.paused} onClick={() => dispatchGameDay({ type: 'head-mark', mark: 'miss' })} data-testid="button-head-miss"><X size={26} /> Didn’t get it ✗</button>
        <button className="gd-big got" disabled={h.paused} onClick={() => dispatchGameDay({ type: 'head-mark', mark: 'got' })} data-testid="button-head-got"><Check size={26} /> Got it ✓ Next</button>
      </div>
      <div className="sl-row" style={{ gap: 8, marginTop: 10 }}>
        <button className="sl-btn sl-btn-sm sl-btn-soft" onClick={() => setHead(toggleHeadPause(getGameDayState().head!))} data-testid="button-head-pause">{h.paused ? <Play size={14} /> : <Pause size={14} />}{h.paused ? 'Resume' : 'Pause'}</button>
        <button className="sl-btn sl-btn-sm sl-btn-ghost" onClick={() => setHead(endHeadTurn(getGameDayState().head!, 'stopped'))} data-testid="button-head-stop"><Square size={14} /> Stop turn</button>
      </div>
    </>}

    {h.phase === 'turn-end' && <div className="gd-result" data-testid="head-turn-end">
      <h2>Mabrook!</h2>
      <p className="gd-points" data-testid="text-head-turn-result">{who}: {t.score}/{CARDS_PER_TURN}</p>
      {t.timedOut && <p className="gd-muted">Time ended. Unfinished cards score 0.</p>}{t.stopped && <p className="gd-muted">Turn stopped. Unfinished cards score 0.</p>}
      <ul className="gd-marks">{t.cards.map((id, i) => { const c = headCardById(id); return <li key={id} className={t.marks[i] === 'got' ? 'got' : ''}>{c?.emoji} {c?.name}<b>{t.marks[i] === 'got' ? '+1' : '0'}</b></li>; })}</ul>
      <button className="sl-btn sl-full" onClick={next} data-testid="button-head-next-turn">Next turn <ArrowRight size={16} /></button>
    </div>}

    {t.index >= Math.max(0, parts.length * 3 - 1) && <div className="gd-water" role="status" style={{ marginTop: 12 }}><Droplets size={15} /> Water break after round 3. Sip, then Yalla!</div>}
  </section>;
}
