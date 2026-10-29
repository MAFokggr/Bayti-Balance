import { useEffect, useRef, useState } from 'react';
import { EyeOff, Trophy, Wifi, WifiOff } from 'lucide-react';
import { GUESS_SECONDS, wordById, type RasmPhase, type Stroke } from '@/lib/rasm';
import { canLinkWindows, openRasmChannel, type RasmLink, type RasmTurnInfo } from '@/lib/sketch-channel';
import { SketchCanvas } from './SketchCanvas';
import { ChoiceCards } from './RasmGame';
import { Timer } from './GameBits';

/** Screen 2 for Rasm Yalla. Receives live strokes from /sketch/drawer over BroadcastChannel. */
export function RasmGuesserWindow() {
  const [phase, setPhase] = useState<RasmPhase | null>(null);
  const [turn, setTurn] = useState<RasmTurnInfo | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [lastHost, setLastHost] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState('');
  const link = useRef<RasmLink | null>(null);
  const turnIndex = useRef(-1);

  useEffect(() => {
    const ch = openRasmChannel(m => {
      setLastHost(Date.now());
      if (m.type === 'sync') {
        if (m.turn.index !== turnIndex.current) { turnIndex.current = m.turn.index; setPicked(null); }
        setDone(''); setPhase(m.phase); setTurn(m.turn); setStrokes(m.strokes); setSeconds(m.seconds);
        if (m.turn.picked) setPicked(m.turn.picked);
      }
      if (m.type === 'strokes') setStrokes(m.strokes);
      if (m.type === 'tick') { setPhase(m.phase); setSeconds(m.seconds); }
      if (m.type === 'done') setDone(m.summary);
    });
    link.current = ch;
    ch?.post({ type: 'hello' });
    const ping = window.setInterval(() => { ch?.post({ type: 'ping' }); setNow(Date.now()); }, 2000);
    return () => { window.clearInterval(ping); ch?.close(); link.current = null; };
  }, []);

  const connected = now - lastHost < 5000;
  const choose = (id: string) => { if (picked || phase !== 'guess') return; setPicked(id); link.current?.post({ type: 'guess', wordId: id }); };
  const answer = turn?.answer ? wordById(turn.answer) : null;

  return <main className="gd-page gd-guesser motion-in" data-testid="page-sketch-guesser">
    <div className="sl-between"><div><div className="eyebrow">Rasm Yalla · Screen 2</div><h1 className="title gd-title">Guesser screen</h1></div>
      <span className={`gd-chip ${connected ? 'ok' : ''}`} data-testid="status-drawer-link">{connected ? <Wifi size={12} /> : <WifiOff size={12} />}{connected ? 'Connected' : 'Waiting'}</span></div>
    {!canLinkWindows() ? <div className="gd-card gd-error" role="alert">This browser cannot link two windows. On the host screen, choose “Pass the screen”.</div>
    : done ? <div className="gd-result"><Trophy size={30} color="#b58012" /><h2>Mabrook!</h2><p>{done}</p><p className="gd-muted">Final results are on the host window.</p></div>
    : !turn || !phase ? <div className="gd-card" data-testid="guesser-waiting"><div className="gd-skel" /><div className="gd-skel short" /><p className="gd-muted">Waiting for the drawer screen… Keep this window open. On the host, open Rasm Yalla in Two windows mode.</p></div>
    : <>
      <p className="gd-muted">Team {turn.team}: <b>{turn.drawer}</b> draws, <b>{turn.guesser}</b> guesses.</p>
      {(phase === 'handoff' || phase === 'reveal') && <div className="gd-handoff"><EyeOff size={26} /><h2>{turn.guesser}, look away!</h2><p>{turn.drawer} is reading the secret word.</p></div>}
      {(phase === 'draw' || phase === 'guess' || phase === 'result') && <>
        <div className="sl-between" style={{ margin: '6px 0 8px' }}><span className="gd-badge">{phase === 'draw' ? 'Live drawing…' : phase === 'guess' ? 'Choose now!' : 'Answer'}</span>{phase === 'guess' && <Timer seconds={seconds} total={GUESS_SECONDS} label="Guessing time" testId="text-guesser-timer" />}{phase === 'draw' && <span className="gd-muted">{seconds}s drawing</span>}</div>
        <SketchCanvas strokes={strokes} label="Live drawing from the drawer" testId="canvas-rasm-guesser" />
        {phase === 'draw' && <p className="gd-muted">Watch closely. Choices appear when drawing ends.</p>}
        {(phase === 'guess' || phase === 'result') && <ChoiceCards choices={turn.choices} answer={turn.answer} picked={picked} disabled={phase !== 'guess' || Boolean(picked)} onPick={choose} testPrefix="guesser-choice" />}
        {phase === 'result' && answer && <div className="gd-result" style={{ marginTop: 10 }}><h2>{turn.picked === turn.answer ? 'Shatir! (great job)' : 'Yalla, next time'}</h2><p>{answer.emoji} {answer.english} · <span lang="ar" dir="rtl">{answer.arabic}</span></p><p className="gd-points">Team {turn.team} +{turn.points}</p></div>}
      </>}
      {phase === 'pass' && <div className="gd-handoff"><h2>Get ready…</h2></div>}
    </>}
  </main>;
}
