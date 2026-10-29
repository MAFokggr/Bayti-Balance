import { useSyncExternalStore } from 'react';
import { gameReducer, initialGameDay, loadGameDay, resetGameDay, saveGameDay, type GameDayState } from './game-day';

/**
 * Single owner of Game Day state. Every page reads the same in-memory state and
 * every dispatch saves synchronously, so navigating between Play and the engine
 * can never overwrite a fresh game selection with a stale copy.
 */
type Action = Parameters<typeof gameReducer>[1];
const hasStorage = () => typeof localStorage !== 'undefined';
let state: GameDayState = hasStorage() ? loadGameDay(localStorage) : initialGameDay();
let storageError = '';
let snapshot = { state, storageError };
const listeners = new Set<() => void>();
const emit = () => { snapshot = { state, storageError }; listeners.forEach(l => l()); };
const persist = () => {
  if (!hasStorage()) return;
  try { saveGameDay(localStorage, state); storageError = ''; }
  catch { storageError = 'Could not save Game Day on this device. Free browser storage and retry.'; }
};
export function dispatchGameDay(action: Action) {
  const next = gameReducer(state, action);
  if (next === state) return;
  state = next; persist(); emit();
}
export const getGameDayState = () => state;
export function resetGameDayStore() {
  if (hasStorage()) resetGameDay(localStorage);
  state = initialGameDay(); storageError = ''; emit();
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useGameDayStore() {
  const snap = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return { state: snap.state, dispatch: dispatchGameDay, storageError: snap.storageError };
}
