import wordsData from '../data/sketchWords.json';
import type { Player } from './game-day';

/** Rasm Yalla: pure rules, kept free of React so they can be unit tested. */
export type SketchWord = { id: string; emoji: string; english: string; arabic: string };
export const SKETCH_WORDS: SketchWord[] = wordsData as SketchWord[];
export const RASM_COLORS = [
  { id: 'turquoise', label: 'Turquoise', hex: '#22AFA0' },
  { id: 'yellow', label: 'Yellow', hex: '#F2BE22' },
  { id: 'coral', label: 'Coral', hex: '#EE7457' },
  { id: 'navy', label: 'Navy', hex: '#17264D' },
  { id: 'sand', label: 'Sand', hex: '#D4AE73' },
  { id: 'green', label: 'Green', hex: '#3C9A58' },
] as const;
/** Brush widths are a fraction of canvas width so they scale with the screen. */
export const RASM_SIZES = [
  { id: 'thin', label: 'Thin', width: 0.008 },
  { id: 'medium', label: 'Medium', width: 0.018 },
  { id: 'thick', label: 'Thick', width: 0.036 },
] as const;
export const REVEAL_SECONDS = 3;
export const DRAW_SECONDS = 30;
export const GUESS_SECONDS = 20;
export const BONUS_THRESHOLD = 10;
export const RASM_MIN_PLAYERS = 2;
export const RASM_MAX_PLAYERS = 6;

export type Point = [number, number];
export type Stroke = { color: string; size: number; points: Point[] };
export type Team = 'A' | 'B';
export type RasmPhase = 'handoff' | 'reveal' | 'draw' | 'pass' | 'guess' | 'result';
export type RasmTurn = {
  index: number; tieRound: number; team: Team; drawer: string; guesser: string;
  wordId: string; choices: string[]; strokes: Stroke[];
  picked: string | null; secondsLeft: number; points: number; autoPoints: number; overridden: boolean;
};
export type RasmState = {
  screenMode: 'pass' | 'windows'; phase: RasmPhase; totalTurns: number;
  current: RasmTurn; history: RasmTurn[]; usedWords: string[]; tieRound: number;
};
type Rand = () => number;

export const clamp01 = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
const round4 = (n: number) => Math.round(n * 10000) / 10000;
export function normalizePoint(x: number, y: number, width: number, height: number): Point {
  return [round4(clamp01(width > 0 ? x / width : 0)), round4(clamp01(height > 0 ? y / height : 0))];
}
export function denormalizePoint(p: Point, width: number, height: number): Point { return [p[0] * width, p[1] * height]; }

export function teamOf(p: Player, index: number): Team { return p.team ?? (index % 2 ? 'B' : 'A'); }
export function teamRoster(players: Player[]): Record<Team, Player[]> {
  const r: Record<Team, Player[]> = { A: [], B: [] };
  players.forEach((p, i) => r[teamOf(p, i)].push(p));
  return r;
}
export function activeTeams(players: Player[]): Team[] {
  const r = teamRoster(players);
  return (['A', 'B'] as Team[]).filter(t => r[t].length > 0);
}
/** Each playing team needs two different people: one draws, a teammate guesses. */
export function validateRasmTeams(players: Player[]): string | null {
  if (players.length < RASM_MIN_PLAYERS) return 'Add at least 2 players.';
  if (players.length > RASM_MAX_PLAYERS) return 'Rasm Yalla is for up to 6 players.';
  const r = teamRoster(players);
  for (const t of ['A', 'B'] as Team[]) {
    if (r[t].length === 1) return `Team ${t} has only ${r[t][0].name}. The drawer and guesser must be two people on the same team, so add a teammate or move ${r[t][0].name}.`;
  }
  return null;
}
export function rolesForTurn(players: Player[], index: number): { team: Team; drawer: string; guesser: string } {
  const teams = activeTeams(players);
  if (!teams.length) throw new Error('No players');
  const team = teams[index % teams.length];
  const members = teamRoster(players)[team];
  if (members.length < 2) throw new Error(`Team ${team} needs two players`);
  const k = Math.floor(index / teams.length);
  return { team, drawer: members[k % members.length].id, guesser: members[(k + 1) % members.length].id };
}
export function shuffle<T>(items: readonly T[], rand: Rand = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function pickWord(used: string[], rand: Rand = Math.random): string {
  const fresh = SKETCH_WORDS.filter(w => !used.includes(w.id));
  const pool = fresh.length ? fresh : SKETCH_WORDS;
  return pool[Math.floor(rand() * pool.length) % pool.length].id;
}
export function pickChoices(correctId: string, rand: Rand = Math.random): string[] {
  const distractors = shuffle(SKETCH_WORDS.filter(w => w.id !== correctId), rand).slice(0, 3).map(w => w.id);
  return shuffle([correctId, ...distractors], rand);
}
export function scoreGuess(correct: boolean, secondsLeft: number): number {
  return correct ? 2 + (secondsLeft >= BONUS_THRESHOLD ? 1 : 0) : 0;
}
export function createTurn(players: Player[], index: number, used: string[], tieRound: number, rand: Rand = Math.random): RasmTurn {
  const roles = rolesForTurn(players, index);
  const wordId = pickWord(used, rand);
  return { index, tieRound, ...roles, wordId, choices: pickChoices(wordId, rand), strokes: [], picked: null, secondsLeft: 0, points: 0, autoPoints: 0, overridden: false };
}
export function startRasm(players: Player[], totalTurns: number, screenMode: 'pass' | 'windows', rand: Rand = Math.random): RasmState {
  const error = validateRasmTeams(players);
  if (error) throw new Error(error);
  const current = createTurn(players, 0, [], 0, rand);
  return { screenMode, phase: 'handoff', totalTurns: Math.max(1, totalTurns), current, history: [], usedWords: [current.wordId], tieRound: 0 };
}
export function applyGuess(state: RasmState, wordId: string | null, secondsLeft: number): RasmState {
  if (state.phase === 'result') return state;
  const points = scoreGuess(wordId === state.current.wordId, secondsLeft);
  return { ...state, phase: 'result', current: { ...state.current, picked: wordId, secondsLeft: Math.max(0, secondsLeft), points, autoPoints: points, overridden: false } };
}
export function overrideRasmScore(state: RasmState, points: number): RasmState {
  const p = Math.max(0, Math.min(3, Math.round(points)));
  return { ...state, current: { ...state.current, points: p, overridden: p !== state.current.autoPoints } };
}
export function rasmTotals(turns: RasmTurn[]): Record<Team, number> {
  return turns.reduce((t, turn) => ({ ...t, [turn.team]: t[turn.team] + turn.points }), { A: 0, B: 0 } as Record<Team, number>);
}
/** Moves to the next turn. Ties after regular turns add a bonus word per team, repeating until one team leads. */
export function advanceRasm(state: RasmState, players: Player[], rand: Rand = Math.random): { state: RasmState; done: boolean } {
  const history = [...state.history, state.current];
  const nextIndex = state.current.index + 1;
  const next = (tieRound: number) => {
    const current = createTurn(players, nextIndex, state.usedWords, tieRound, rand);
    return { state: { ...state, history, current, tieRound, phase: 'handoff' as const, usedWords: [...state.usedWords, current.wordId] }, done: false };
  };
  const finished = { state: { ...state, history, phase: 'result' as const }, done: true };
  if (state.tieRound === 0 && nextIndex < state.totalTurns) return next(0);
  const teams = activeTeams(players);
  if (teams.length < 2) return finished;
  const totals = rasmTotals(history);
  if (state.tieRound === 0) return totals.A === totals.B ? next(1) : finished;
  const played = history.filter(t => t.tieRound === state.tieRound).length;
  if (played < teams.length) return next(state.tieRound);
  return totals.A === totals.B ? next(state.tieRound + 1) : finished;
}
export const wordById = (id: string) => SKETCH_WORDS.find(w => w.id === id);
