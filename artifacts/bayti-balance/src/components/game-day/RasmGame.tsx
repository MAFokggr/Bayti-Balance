import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Droplets, Eraser, ExternalLink, Eye, EyeOff, MonitorSmartphone, Smartphone, Undo2, Wifi, WifiOff } from 'lucide-react';
import type { GameDayState, Player } from '@/lib/game-day';
import { dispatchGameDay, getGameDayState } from '@/lib/game-day-store';
import {
  DRAW_SECONDS, GUESS_SECONDS, RASM_COLORS, RASM_SIZES, REVEAL_SECONDS, activeTeams, advanceRasm, applyGuess,
  overrideRasmScore, rasmTotals, startRasm, teamRoster, validateRasmTeams, wordById, type RasmState, type Stroke,
} from '@/lib/rasm';
import { canLinkWindows, openRasmChannel, type RasmLink } from '@/lib/sketch-channel';
import { SketchCanvas } from './SketchCanvas';
import { AiBadge, NeedBox, Timer } from './GameBits';
import { GAME_CONFIGS } from '@/lib/game-day';

const rasmConfig = GAME_CONFIGS.find(g => g.id === 'rasm')!;
const nameOf = (players: Player[], id: string) => players.find(p => p.id === id)?.name ?? 'Player';
export const guesserUrl = () => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/sketch/guesser`;

export function RasmSetup({ s }: { s: GameDayState }) {
  const [, go] = useLocation();
  const [mode, setMode] = useState<'pass' | 'windows'>('pass');
  const error = validateRasmTeams(s.players);
  const roster = teamRoster(s.players);
  const twoTeams = activeTeams(s.players).length === 2;
  const start = () => {
    if (error) return;
    dispatchGameDay({ type: 'rasm', rasm: startRasm(s.players, s.rounds, mode) });
    dispatchGameDay({ type: 'stage', stage: 'content' });
    if (mode === 'windows') go('/sketch/drawer');
  };
  return <>
    <div className="eyebrow">3 · Rules and ready</div>
    <h1 className="title gd-title">Rasm Yalla <span lang="ar" dir="rtl" className="gd-ar">رسم يلا</span></h1>
    <NeedBox text={rasmConfig.need} />
    <section className="gd-card" style={{ borderTop: `6px solid ${rasmConfig.color}`, marginTop: 10 }}>
      <ol className="gd-rules">
        <li>One player draws a secret Emirati word. A teammate guesses fast.</li>
        <li>Draw only. No letters or numbers. No talking.</li>
        <li>Correct = <b>2 points</b>, +1 bonus with 10 or more seconds left.</li>
        <li>Tie? One bonus word each until one team leads.</li>
      </ol>
      <div className="gd-teams">{(['A', 'B'] as const).map(t => <div key={t} className="gd-team-col" data-testid={`rasm-roster-${t}`}><b>Team {t}</b>{roster[t].length ? roster[t].map(p => <span key={p.id}>{p.name}</span>) : <small>No players</small>}</div>)}</div>
      {error && <p className="gd-error" role="alert" data-testid="text-rasm-team-error">{error}</p>}
      <label className="gd-muted" htmlFor="rasm-turns">Turns: {s.rounds}{twoTeams ? ` (${s.rounds / 2} per team)` : ''}</label>
      <input id="rasm-turns" type="range" className="sl-range" min={2} max={12} step={2} value={s.rounds} onChange={e => dispatchGameDay({ type: 'config', key: 'rounds', value: Number(e.target.value) })} data-testid="slider-rasm-turns" />
      <p className="gd-label">How will you use the screens?</p>
      <div className="gd-mode-pick">
        <button className={`gd-choice ${mode === 'pass' ? 'active' : ''}`} aria-pressed={mode === 'pass'} onClick={() => setMode('pass')} data-testid="button-rasm-pass"><Smartphone size={18} /><span><b>Pass the screen</b><small>One device. Replay for the guesser.</small></span></button>
        <button className={`gd-choice ${mode === 'windows' ? 'active' : ''}`} aria-pressed={mode === 'windows'} disabled={!canLinkWindows()} onClick={() => setMode('windows')} data-testid="button-rasm-windows"><MonitorSmartphone size={18} /><span><b>Two windows</b><small>{canLinkWindows() ? 'Live drawing to a guesser window.' : 'Not supported in this browser.'}</small></span></button>
      </div>
    </section>
    <button className="sl-btn sl-full" style={{ marginTop: 12 }} disabled={Boolean(error)} onClick={start} data-testid="button-start-rasm">Yalla, start drawing <ArrowRight size={16} /></button>
  </>;
}

export function ChoiceCards({ choices, answer, picked, disabled, onPick, testPrefix }: { choices: string[]; answer: string | null; picked: string | null; disabled: boolean; onPick: (id: string) => void; testPrefix: string }) {
  return <div className="gd-choices">{choices.map(id => {
    const w = wordById(id); if (!w) return null;
    const state = answer ? (id === answer ? 'right' : id === picked ? 'wrong' : '') : id === picked ? 'picked' : '';
    return <button key={id} className={`gd-wordcard ${state}`} disabled={disabled} onClick={() => onPick(id)} data-testid={`${testPrefix}-${id}`}>
      <span className="gd-word-emoji" aria-hidden="true">{w.emoji}</span><b>{w.english}</b><small lang="ar" dir="rtl">{w.arabic}</small>
    </button>;
  })}</div>;
}

export function RasmPlay({ s }: { s: GameDayState }) {
  const [location, go] = useLocation();
  const r = s.rasm!;
  const players = s.players;
  const turn = r.current;
  const word = wordById(turn.wordId);
  const windows = r.screenMode === 'windows';
  const [seconds, setSeconds] = useState(0);
  const [color, setColor] = useState<string>(RASM_COLORS[3].hex);
  const [size, setSize] = useState<number>(RASM_SIZES[1].width);
  const [live, setLive] = useState<Stroke[]>(turn.strokes);
  const [replayDone, setReplayDone] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [popupNote, setPopupNote] = useState('');
  const link = useRef<RasmLink | null>(null);
  const secondsRef = useRef(0); secondsRef.current = seconds;
  const liveRef = useRef(live); liveRef.current = live;
  const update = (next: RasmState) => dispatchGameDay({ type: 'rasm', rasm: next });
  const cur = () => getGameDayState().rasm!;

  const sendSync = useCallback(() => {
    const st = getGameDayState().rasm; const ch = link.current; if (!st || !ch) return;
    const ps = getGameDayState().players; const t = st.current;
    ch.post({ type: 'sync', phase: st.phase, seconds: secondsRef.current, strokes: st.phase === 'draw' ? liveRef.current : t.strokes,
      turn: { index: t.index, tieRound: t.tieRound, team: t.team, drawer: nameOf(ps, t.drawer), guesser: nameOf(ps, t.guesser), choices: t.choices, picked: t.picked, answer: st.phase === 'result' ? t.wordId : null, points: t.points } });
  }, []);

  const submitGuess = useCallback((id: string | null, secs: number) => {
    const st = getGameDayState().rasm; if (!st || st.phase !== 'guess') return;
    dispatchGameDay({ type: 'rasm', rasm: applyGuess(st, id, secs) });
  }, []);
  const finishDraw = useCallback(() => {
    const st = getGameDayState().rasm; if (!st || st.phase !== 'draw') return;
    dispatchGameDay({ type: 'rasm', rasm: { ...st, phase: st.screenMode === 'windows' ? 'guess' : 'pass', current: { ...st.current, strokes: liveRef.current } } });
  }, []);
  const onExpire = useRef((_: string) => {});
  onExpire.current = (phase: string) => {
    if (phase === 'reveal') update({ ...cur(), phase: 'draw' });
    else if (phase === 'draw') finishDraw();
    else if (phase === 'guess') submitGuess(null, 0);
  };

  // Fresh canvas each turn.
  useEffect(() => { setLive(getGameDayState().rasm?.current.strokes ?? []); setReplayDone(false); }, [turn.index]);

  // Phase timers (reveal 3s, draw 30s, guess 20s after replay).
  useEffect(() => {
    const ph = r.phase;
    const start = ph === 'reveal' ? REVEAL_SECONDS : ph === 'draw' ? DRAW_SECONDS : ph === 'guess' && (windows || replayDone) ? GUESS_SECONDS : 0;
    setSeconds(start); secondsRef.current = start;
    if (!start) return;
    let left = start;
    const id = window.setInterval(() => { left -= 1; secondsRef.current = left; setSeconds(left); if (left <= 0) { window.clearInterval(id); onExpire.current(ph); } }, 1000);
    return () => window.clearInterval(id);
  }, [r.phase, turn.index, replayDone, windows]);

  // Two-window link.
  useEffect(() => {
    if (!windows) return;
    const ch = openRasmChannel(m => {
      if (m.type === 'hello' || m.type === 'ping') { setLastSeen(Date.now()); if (m.type === 'hello') sendSync(); else link.current?.post({ type: 'pong' }); }
      if (m.type === 'guess') { setLastSeen(Date.now()); submitGuess(m.wordId, secondsRef.current); }
    });
    link.current = ch;
    const beat = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearInterval(beat); ch?.close(); link.current = null; };
  }, [windows, sendSync, submitGuess]);
  useEffect(() => { sendSync(); }, [r.phase, turn.index, turn.points, turn.picked, sendSync]);
  useEffect(() => { link.current?.post({ type: 'tick', phase: r.phase, seconds }); }, [seconds, r.phase]);
  useEffect(() => { if (r.phase === 'draw') link.current?.post({ type: 'strokes', strokes: live }); }, [live, r.phase]);

  const connected = now - lastSeen < 5000;
  const openGuesser = () => {
    const w = window.open(guesserUrl(), 'rasm-yalla-guesser', 'popup,width=460,height=820');
    setPopupNote(w ? 'Guesser window opened. Move it to the guesser.' : `Pop-up blocked. Open ${window.location.origin}${guesserUrl()} in a new window.`);
  };

  const history = r.history;
  const totals = rasmTotals(r.phase === 'result' ? [...history, turn] : history);
  const teams = activeTeams(players);
  const drawer = nameOf(players, turn.drawer), guesser = nameOf(players, turn.guesser);
  const turnLabel = turn.tieRound ? `Tie-break bonus word · round ${turn.tieRound}` : `Turn ${turn.index + 1} of ${r.totalTurns}`;

  const next = () => {
    const { state, done } = advanceRasm(cur(), getGameDayState().players);
    if (!done) { update(state); return; }
    update(state);
    const t = rasmTotals(state.history);
    const notice = teams.length < 2 ? `Team ${teams[0]} scored ${t[teams[0]]} points together` : `Team ${t.A > t.B ? 'A' : 'B'} wins Rasm Yalla`;
    link.current?.post({ type: 'done', summary: `${notice}. Team A ${t.A} · Team B ${t.B}` });
    dispatchGameDay({ type: 'custom-results', scores: teams.length < 2 ? { [teams[0]]: t[teams[0]] } : { A: t.A, B: t.B }, notice });
    if (location.startsWith('/sketch')) go('/game-day');
  };

  if (!word) return <div className="gd-card gd-error" role="alert">This word card is missing. <button className="sl-btn sl-btn-sm" onClick={() => dispatchGameDay({ type: 'stage', stage: 'ready' })}>Set up again</button></div>;

  return <section className="gd-rasm" data-testid="rasm-play">
    <div className="gd-scorebar" data-testid="rasm-scoreboard">
      {teams.map(t => <span key={t} className={turn.team === t ? 'on' : ''}>Team {t}<b data-testid={`text-rasm-score-${t}`}>{totals[t]}</b></span>)}
    </div>
    <div className="sl-between" style={{ margin: '10px 0' }}>
      <span className="gd-badge">{turnLabel}</span>
      {windows && <span className={`gd-chip ${connected ? 'ok' : ''}`} data-testid="status-guesser-link">{connected ? <Wifi size={12} /> : <WifiOff size={12} />}{connected ? 'Connected' : 'Waiting'}</span>}
    </div>
    {windows && <div className="gd-card gd-tight">
      <button className="sl-btn sl-btn-sm sl-btn-soft" onClick={openGuesser} data-testid="button-open-guesser"><ExternalLink size={14} /> Open guesser screen</button>
      <p className="gd-muted" style={{ margin: '6px 0 0' }}>{popupNote || 'Opens a second window on this browser. Scores stay on this host window.'}</p>
    </div>}

    {r.phase === 'handoff' && <div className="gd-handoff" data-testid="rasm-handoff">
      <EyeOff size={26} />
      <h2>Team {turn.team}: {drawer} draws, {guesser} guesses.</h2>
      <p><b>Drawer only, look now!</b> {guesser}, please look away.</p>
      <button className="sl-btn sl-full" onClick={() => update({ ...cur(), phase: 'reveal' })} data-testid="button-rasm-show-word">I’m {drawer}, show my word <Eye size={16} /></button>
    </div>}

    {r.phase === 'reveal' && <div className="gd-secret" data-testid="rasm-secret-word">
      <AiBadge />
      <span className="gd-secret-emoji" aria-hidden="true">{word.emoji}</span>
      <h2>{word.english}</h2><p lang="ar" dir="rtl" className="gd-secret-ar">{word.arabic}</p>
      <p className="gd-muted">Drawing starts in <b data-testid="text-rasm-reveal">{seconds}</b></p>
    </div>}

    {r.phase === 'draw' && <>
      <div className="gd-rule" role="note">Draw only. No letters or numbers. No talking.</div>
      <div className="sl-between" style={{ margin: '8px 0' }}><span className="gd-muted">{drawer} draws: <b>{word.emoji} {word.english}</b></span><Timer seconds={seconds} total={DRAW_SECONDS} label="Drawing time" testId="text-rasm-draw-timer" /></div>
      <SketchCanvas strokes={live} onChange={setLive} color={color} size={size} editable label={`Drawing canvas for ${word.english}`} testId="canvas-rasm-draw" />
      <div className="gd-tools">
        <div className="gd-swatches" role="radiogroup" aria-label="Brush colour">{RASM_COLORS.map(c => <button key={c.id} role="radio" aria-checked={color === c.hex} aria-label={c.label} className={color === c.hex ? 'on' : ''} style={{ background: c.hex }} onClick={() => setColor(c.hex)} data-testid={`button-color-${c.id}`} />)}</div>
        <div className="gd-sizes" role="radiogroup" aria-label="Brush size">{RASM_SIZES.map(z => <button key={z.id} role="radio" aria-checked={size === z.width} aria-label={z.label} className={size === z.width ? 'on' : ''} onClick={() => setSize(z.width)} data-testid={`button-size-${z.id}`}><i style={{ width: 4 + z.width * 300, height: 4 + z.width * 300 }} /></button>)}</div>
        <button className="sl-btn sl-btn-sm sl-btn-ghost" disabled={!live.length} onClick={() => setLive(l => l.slice(0, -1))} data-testid="button-undo"><Undo2 size={14} /> Undo</button>
        <button className="sl-btn sl-btn-sm sl-btn-ghost" disabled={!live.length} onClick={() => setLive([])} data-testid="button-clear"><Eraser size={14} /> Clear</button>
      </div>
      <button className="sl-btn sl-full" style={{ marginTop: 10 }} onClick={finishDraw} data-testid="button-done-drawing">Done drawing <ArrowRight size={16} /></button>
    </>}

    {r.phase === 'pass' && <div className="gd-handoff" data-testid="rasm-pass">
      <Smartphone size={26} />
      <h2>Pass the screen to {guesser}.</h2>
      <p>{drawer}, no hints now. {guesser}: watch the replay, then choose fast. 20 seconds.</p>
      <button className="sl-btn sl-full" onClick={() => update({ ...cur(), phase: 'guess' })} data-testid="button-rasm-show-drawing">I’m {guesser}, show the drawing <ArrowRight size={16} /></button>
    </div>}

    {r.phase === 'guess' && <>
      <div className="sl-between" style={{ margin: '4px 0 8px' }}><span className="gd-muted">{guesser} guesses for Team {turn.team}</span>{(windows || replayDone) ? <Timer seconds={seconds} total={GUESS_SECONDS} label="Guessing time" testId="text-rasm-guess-timer" /> : <span className="gd-badge">Replaying…</span>}</div>
      <SketchCanvas key={`replay-${turn.index}`} strokes={turn.strokes} replayMs={windows ? 0 : 2400} onReplayDone={() => setReplayDone(true)} label="The drawing to guess" testId="canvas-rasm-guess" />
      {windows ? <>
        <div className="gd-water" style={{ marginTop: 10 }}>{guesser} is choosing on the guesser screen.</div>
        {!connected && <><p className="gd-label">Guesser screen not connected? {guesser} can tap here:</p><ChoiceCards choices={turn.choices} answer={null} picked={null} disabled={false} onPick={id => submitGuess(id, secondsRef.current)} testPrefix="rasm-host-choice" /></>}
      </> : replayDone && <ChoiceCards choices={turn.choices} answer={null} picked={null} disabled={false} onPick={id => submitGuess(id, secondsRef.current)} testPrefix="rasm-choice" />}
    </>}

    {r.phase === 'result' && <div className="gd-result" data-testid="rasm-result">
      <h2>{turn.picked === turn.wordId ? 'Shatir! (great job)' : 'Yalla, next time'}</h2>
      <p className="gd-muted">{turn.picked ? `${guesser} chose ${wordById(turn.picked)?.english}.` : 'Time ran out.'} The word was:</p>
      <div className="gd-answer"><span aria-hidden="true">{word.emoji}</span><b>{word.english}</b><small lang="ar" dir="rtl">{word.arabic}</small></div>
      <p className="gd-points" data-testid="text-rasm-turn-points">Team {turn.team} +{turn.points} {turn.overridden && <small>(host fixed)</small>}</p>
      <p className="gd-label">Fix score (host)</p>
      <div className="gd-fix">{[0, 1, 2, 3].map(n => <button key={n} className={`gd-choice ${turn.points === n ? 'active' : ''}`} aria-pressed={turn.points === n} onClick={() => update(overrideRasmScore(cur(), n))} data-testid={`button-fix-score-${n}`}>{n}</button>)}</div>
      <button className="sl-btn sl-full" style={{ marginTop: 12 }} onClick={next} data-testid="button-rasm-next-turn">Next turn <ArrowRight size={16} /></button>
    </div>}

    {turn.index >= 3 && <div className="gd-water" role="status" style={{ marginTop: 12 }}><Droplets size={15} /> Water break after round 3. Sip, then Yalla!</div>}
  </section>;
}
