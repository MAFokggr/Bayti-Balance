import type { RasmPhase, Stroke, Team } from './rasm';

/** Two-window link for Rasm Yalla. Same browser, same device, no server. */
export const RASM_CHANNEL = 'rasm-yalla';
export type RasmTurnInfo = { index: number; tieRound: number; team: Team; drawer: string; guesser: string; choices: string[]; picked: string | null; answer: string | null; points: number };
export type RasmMessage =
  | { type: 'hello' }
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'sync'; phase: RasmPhase; seconds: number; turn: RasmTurnInfo; strokes: Stroke[] }
  | { type: 'strokes'; strokes: Stroke[] }
  | { type: 'tick'; phase: RasmPhase; seconds: number }
  | { type: 'guess'; wordId: string }
  | { type: 'done'; summary: string };

export const canLinkWindows = () => typeof BroadcastChannel !== 'undefined';
export function openRasmChannel(onMessage: (m: RasmMessage) => void) {
  if (!canLinkWindows()) return null;
  const channel = new BroadcastChannel(RASM_CHANNEL);
  channel.onmessage = (e: MessageEvent<RasmMessage>) => { if (e.data && typeof e.data === 'object' && 'type' in e.data) onMessage(e.data); };
  return { post: (m: RasmMessage) => { try { channel.postMessage(m); } catch { /* window closing */ } }, close: () => channel.close() };
}
export type RasmLink = NonNullable<ReturnType<typeof openRasmChannel>>;
