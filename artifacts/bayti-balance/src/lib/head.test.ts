import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from './game-day';
import {
  CARDS_PER_TURN, HEAD_CARDS, advanceHead, beginHeadPlay, cardsInCategory, endHeadTurn,
  headTotals, markHeadCard, startHead, tickHead, toggleHeadPause, validateHeadSetup,
} from './head';

const players: Player[] = [
  { id: 'a1', name: 'A1', avatar: 'A', color: '#fff', team: 'A' },
  { id: 'a2', name: 'A2', avatar: 'A', color: '#fff', team: 'A' },
  { id: 'b1', name: 'B1', avatar: 'B', color: '#fff', team: 'B' },
  { id: 'b2', name: 'B2', avatar: 'B', color: '#fff', team: 'B' },
];

test('Khamen on Head card bank covers all requested categories', () => {
  assert.equal(HEAD_CARDS.length, 42);
  for (const category of ['landmarks', 'malls', 'parks', 'alain', 'animals'] as const) {
    assert.ok(cardsInCategory(category).length >= CARDS_PER_TURN);
    assert.equal(new Set(cardsInCategory(category).map(c => c.id)).size, cardsInCategory(category).length);
  }
  assert.equal(cardsInCategory('mix').length, 42);
});

test('team mode requires clue-givers alongside the guesser; individual mode supports two players', () => {
  assert.match(validateHeadSetup(players.slice(0, 2), false)!, /2 people on each team/);
  assert.equal(validateHeadSetup(players.slice(0, 2), true), null);
});

test('five marks score out of five and never exceed the turn limit', () => {
  let state = beginHeadPlay(startHead(players.slice(0, 2), true, 'landmarks', 1));
  for (let i = 0; i < 4; i++) state = markHeadCard(state, 'got');
  state = markHeadCard(state, 'miss');
  assert.equal(state.current.score, 4);
  assert.equal(state.current.marks.length, 5);
  assert.equal(state.phase, 'turn-end');
  assert.equal(markHeadCard(state, 'got'), state);
});

test('Khamen on Head pause and timeout preserve completed score and zero unfinished cards', () => {
  let state = beginHeadPlay(startHead(players.slice(0, 2), true, 'animals', 1));
  state = markHeadCard(state, 'got');
  const paused = toggleHeadPause(state);
  assert.equal(tickHead(paused).secondsLeft, paused.secondsLeft);
  state = { ...state, secondsLeft: 1 };
  state = tickHead(state);
  assert.equal(state.current.score, 1);
  assert.equal(state.current.marks.length, CARDS_PER_TURN);
  assert.equal(state.current.timedOut, true);
  assert.ok(state.current.marks.slice(1).every(mark => mark === 'miss'));
  assert.equal(endHeadTurn(state, 'stopped'), state);
});

test('individual turns rotate and final totals are saved with their tie-break round', () => {
  let state = beginHeadPlay(startHead(players.slice(0, 2), true, 'mix', 1));
  for (let i = 0; i < CARDS_PER_TURN; i++) state = markHeadCard(state, i < 2 ? 'got' : 'miss');
  let advance = advanceHead(state, players.slice(0, 2));
  assert.equal(advance.done, false);
  assert.equal(advance.state.current.who, 'a2');
  state = beginHeadPlay(advance.state);
  for (let i = 0; i < CARDS_PER_TURN; i++) state = markHeadCard(state, 'miss');
  advance = advanceHead(state, players.slice(0, 2));
  assert.equal(advance.done, true);
  assert.deepEqual(headTotals(advance.state.history, ['a1', 'a2']), { a1: 2, a2: 0 });
});
