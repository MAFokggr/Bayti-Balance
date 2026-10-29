import cardsData from '../data/headCards.json';
import type { Player } from './game-day';
import { activeTeams, shuffle, teamRoster, type Team } from './rasm';

/** Khamen on Head: pure rules for the phone-on-forehead game. */
export type HeadCategory = 'landmarks' | 'malls' | 'parks' | 'alain' | 'animals' | 'mix';
export type HeadCard = { id: string; emoji: string; name: string; category: Exclude<HeadCategory, 'mix'> };
export const HEAD_CARDS: HeadCard[] = cardsData as HeadCard[];
export const HEAD_CATEGORIES: { id: HeadCategory; name: string; emoji: string }[] = [
  { id: 'landmarks', name: 'Abu Dhabi Landmarks', emoji: '🕌' },
  { id: 'malls', name: 'Malls', emoji: '🛍️' },
  { id: 'parks', name: 'Parks and Beaches', emoji: '🏖️' },
  { id: 'alain', name: 'Al Ain', emoji: '⛰️' },
  { id: 'animals', name: 'UAE Animals', emoji: '🦅' },
  { id: 'mix', name: 'Mix', emoji: '🎲' },
];
export const CARDS_PER_TURN = 5;
export const HEAD_SECONDS = 60;
export type HeadMark = 'got' | 'miss';
export type HeadTurn = { index: number; tieRound: number; who: string; guesser: string; cards: string[]; marks: HeadMark[]; score: number; timedOut: boolean; stopped: boolean };
export type HeadState = {
  category: HeadCategory; individual: boolean; turnsEach: number; phase: 'rules' | 'play' | 'turn-end';
  current: HeadTurn; history: HeadTurn[]; used: string[]; tieRound: number; tieContenders: string[];
  secondsLeft: number; paused: boolean;
};
type Rand = () => number;

export const cardsInCategory = (c: HeadCategory) => c === 'mix' ? HEAD_CARDS : HEAD_CARDS.filter(card => card.category === c);
export const headCardById = (id: string) => HEAD_CARDS.find(c => c.id === id);
export function participants(players: Player[], individual: boolean): string[] {
  return individual ? players.map(p => p.id) : activeTeams(players);
}
export function validateHeadSetup(players: Player[], individual: boolean): string | null {
  if (players.length < 2) return 'Add at least 2 players.';
  if (players.length > 6) return 'Khamen on Head is for up to 6 players.';
  if (individual) return null;
  const r = teamRoster(players);
  for (const t of ['A', 'B'] as Team[]) {
    if (r[t].length < 2) return `Team mode needs 2 people on each team (one guesses, a teammate gives clues). Team ${t} has ${r[t].length}. Add players, or switch to Individual mode.`;
  }
  return null;
}
export function participantLabel(who: string, players: Player[]): string {
  return who === 'A' || who === 'B' ? `Team ${who}` : players.find(p => p.id === who)?.name ?? 'Player';
}
export function drawDeck(category: HeadCategory, used: string[], rand: Rand = Math.random): { cards: string[]; used: string[] } {
  const pool = cardsInCategory(category).map(c => c.id);
  let fresh = pool.filter(id => !used.includes(id));
  let nextUsed = used;
  if (fresh.length < CARDS_PER_TURN) { nextUsed = used.filter(id => !pool.includes(id)); fresh = pool; }
  const cards = shuffle(fresh, rand).slice(0, CARDS_PER_TURN);
  return { cards, used: [...nextUsed, ...cards] };
}
function createHeadTurn(players: Player[], individual: boolean, category: HeadCategory, index: number, who: string, priorTurns: number, used: string[], tieRound: number, rand: Rand) {
  const members = individual ? [] : teamRoster(players)[who as Team];
  const guesser = individual ? who : members[priorTurns % Math.max(1, members.length)]?.id ?? who;
  const deck = drawDeck(category, used, rand);
  const turn: HeadTurn = { index, tieRound, who, guesser, cards: deck.cards, marks: [], score: 0, timedOut: false, stopped: false };
  return { turn, used: deck.used };
}
export function startHead(players: Player[], individual: boolean, category: HeadCategory, turnsEach: number, rand: Rand = Math.random): HeadState {
  const error = validateHeadSetup(players, individual);
  if (error) throw new Error(error);
  const parts = participants(players, individual);
  const { turn, used } = createHeadTurn(players, individual, category, 0, parts[0], 0, [], 0, rand);
  return { category, individual, turnsEach: Math.max(1, turnsEach), phase: 'rules', current: turn, history: [], used, tieRound: 0, tieContenders: [], secondsLeft: HEAD_SECONDS, paused: false };
}
export const beginHeadPlay = (s: HeadState): HeadState => s.phase === 'rules' ? { ...s, phase: 'play', secondsLeft: HEAD_SECONDS, paused: false } : s;
export const toggleHeadPause = (s: HeadState): HeadState => s.phase === 'play' ? { ...s, paused: !s.paused } : s;
export function markHeadCard(s: HeadState, mark: HeadMark): HeadState {
  if (s.phase !== 'play' || s.paused || s.current.marks.length >= CARDS_PER_TURN) return s;
  const marks = [...s.current.marks, mark];
  const current = { ...s.current, marks, score: marks.filter(m => m === 'got').length };
  return { ...s, current, phase: marks.length >= CARDS_PER_TURN ? 'turn-end' : 'play' };
}
/** Ends the turn early; unfinished cards score 0. */
export function endHeadTurn(s: HeadState, reason: 'timeout' | 'stopped'): HeadState {
  if (s.phase !== 'play') return s;
  const marks = [...s.current.marks];
  while (marks.length < CARDS_PER_TURN) marks.push('miss');
  return { ...s, phase: 'turn-end', paused: false, secondsLeft: reason === 'timeout' ? 0 : s.secondsLeft, current: { ...s.current, marks, timedOut: reason === 'timeout', stopped: reason === 'stopped' } };
}
export function tickHead(s: HeadState): HeadState {
  if (s.phase !== 'play' || s.paused) return s;
  const secondsLeft = s.secondsLeft - 1;
  return secondsLeft <= 0 ? endHeadTurn({ ...s, secondsLeft: 0 }, 'timeout') : { ...s, secondsLeft };
}
export function headTotals(turns: HeadTurn[], parts: string[]): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(parts.map(p => [p, 0]));
  turns.forEach(t => { totals[t.who] = (totals[t.who] ?? 0) + t.score; });
  return totals;
}
/** Next turn. Leaders tied after regular turns play one extra 5-card turn each, repeating until one is ahead. */
export function advanceHead(s: HeadState, players: Player[], rand: Rand = Math.random): { state: HeadState; done: boolean } {
  const history = [...s.history, s.current];
  const parts = participants(players, s.individual);
  const nextIndex = s.current.index + 1;
  const regular = parts.length * s.turnsEach;
  const next = (who: string, tieRound: number, contenders: string[]) => {
    const prior = history.filter(t => t.who === who).length;
    const { turn, used } = createHeadTurn(players, s.individual, s.category, nextIndex, who, prior, s.used, tieRound, rand);
    return { state: { ...s, history, current: turn, used, phase: 'rules' as const, tieRound, tieContenders: contenders, secondsLeft: HEAD_SECONDS, paused: false }, done: false };
  };
  const finished = { state: { ...s, history, phase: 'turn-end' as const }, done: true };
  if (s.tieRound === 0 && nextIndex < regular) return next(parts[nextIndex % parts.length], 0, []);
  if (s.tieRound === 0) {
    const totals = headTotals(history, parts);
    const max = Math.max(...parts.map(p => totals[p]));
    const leaders = parts.filter(p => totals[p] === max);
    return leaders.length > 1 ? next(leaders[0], 1, leaders) : finished;
  }
  const played = history.filter(t => t.tieRound === s.tieRound);
  if (played.length < s.tieContenders.length) return next(s.tieContenders[played.length], s.tieRound, s.tieContenders);
  const best = Math.max(...played.map(t => t.score));
  const winners = s.tieContenders.filter(c => played.find(t => t.who === c)?.score === best);
  return winners.length > 1 ? next(winners[0], s.tieRound + 1, winners) : finished;
}
