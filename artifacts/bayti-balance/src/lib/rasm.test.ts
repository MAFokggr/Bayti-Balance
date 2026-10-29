import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CONFIGS, GAME_DAY_KEY, gameReducer, initialGameDay, loadGameDay, type Player } from './game-day';
import {
  advanceRasm, applyGuess, normalizePoint, overrideRasmScore, pickChoices, rasmTotals,
  rolesForTurn, scoreGuess, startRasm, validateRasmTeams,
} from './rasm';

const players: Player[] = [
  { id: 'a1', name: 'A1', avatar: 'A', color: '#fff', team: 'A' },
  { id: 'a2', name: 'A2', avatar: 'A', color: '#fff', team: 'A' },
  { id: 'b1', name: 'B1', avatar: 'B', color: '#fff', team: 'B' },
  { id: 'b2', name: 'B2', avatar: 'B', color: '#fff', team: 'B' },
];
const constantRandom = () => 0;

test('featured Game Day lineup has exactly five games and extra games stay in More games', () => {
  assert.deepEqual(GAME_CONFIGS.filter(g => g.featured).map(g => g.id), ['football', 'rasm', 'head', 'heritage', 'pearl']);
  assert.deepEqual(GAME_CONFIGS.filter(g => !g.featured).map(g => g.id), ['hazawi', 'manners']);
});

test('Rasm requires two competing teams with two distinct teammates each', () => {
  assert.match(validateRasmTeams(players.slice(0, 2)), /4 players/);
  assert.match(validateRasmTeams(players.map(p => ({ ...p, team: 'A' as const }))), /both Team A and Team B/);
  assert.equal(validateRasmTeams(players), null);
  assert.deepEqual(rolesForTurn(players, 0), { team: 'A', drawer: 'a1', guesser: 'a2' });
  assert.deepEqual(rolesForTurn(players, 2), { team: 'A', drawer: 'a2', guesser: 'a1' });
  assert.deepEqual(rolesForTurn(players, 1), { team: 'B', drawer: 'b1', guesser: 'b2' });
});

test('Rasm choices contain the answer once and exactly three distractors', () => {
  const choices = pickChoices('dallah', constantRandom);
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices).size, 4);
  assert.equal(choices.filter(id => id === 'dallah').length, 1);
});

test('Rasm awards the early bonus, can be host-fixed, and scores extra tied rounds', () => {
  assert.equal(scoreGuess(true, 10), 3);
  assert.equal(scoreGuess(true, 9), 2);
  assert.equal(scoreGuess(false, 20), 0);
  let state = startRasm(players, 2, 'pass', constantRandom);
  state = applyGuess(state, 'wrong', 0);
  state = { ...state, current: { ...state.current, points: 0 } };
  let advance = advanceRasm(state, players, constantRandom);
  state = applyGuess(advance.state, 'wrong', 0);
  advance = advanceRasm(state, players, constantRandom);
  assert.equal(advance.done, false);
  assert.equal(advance.state.tieRound, 1);
  assert.equal(advance.state.current.team, 'A');
  state = applyGuess(advance.state, advance.state.current.wordId, 20);
  advance = advanceRasm(state, players, constantRandom);
  assert.equal(advance.state.current.team, 'B');
  state = applyGuess(advance.state, null, 0);
  advance = advanceRasm(state, players, constantRandom);
  assert.equal(advance.done, true);
  assert.deepEqual(rasmTotals(advance.state.history), { A: 3, B: 0 });
  const fresh = startRasm(players, 2, 'pass', constantRandom);
  const corrected = overrideRasmScore(applyGuess(fresh, 'wrong', 0), 3);
  assert.equal(corrected.current.points, 3);
  assert.equal(corrected.current.overridden, true);
});

test('drawing coordinates are clamped, normalized, and portable across aspect ratios', () => {
  assert.deepEqual(normalizePoint(25, 25, 100, 50), [0.25, 0.5]);
  assert.deepEqual(normalizePoint(-10, 90, 100, 50), [0, 1]);
});

test('active Rasm turns keep the guess timer and normalized strokes in local storage', () => {
  const playersOnTeams = players;
  let state = gameReducer(initialGameDay(), { type: 'players', players: playersOnTeams });
  state = gameReducer(state, { type: 'game', game: 'rasm' });
  const rasm = startRasm(playersOnTeams, 6, 'pass', constantRandom);
  const active = { ...rasm, phase: 'draw' as const, current: {
    ...rasm.current, secondsLeft: 17, strokes: [{ color: '#22AFA0', size: 0.018, points: [[0.2, 0.4], [0.8, 0.7]] as [number, number][] }],
  } };
  const inPlay = { ...state, rasm: active, stage: 'content' as const };
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  values.set(GAME_DAY_KEY, JSON.stringify(inPlay));
  const restored = loadGameDay(storage);
  assert.equal(restored.rasm?.current.secondsLeft, 17);
  assert.deepEqual(restored.rasm?.current.strokes[0].points, [[0.2, 0.4], [0.8, 0.7]]);
});
