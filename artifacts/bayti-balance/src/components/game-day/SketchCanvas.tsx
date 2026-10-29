import { useCallback, useEffect, useRef, type PointerEvent } from 'react';
import { normalizePoint, type Stroke } from '@/lib/rasm';

type Props = {
  strokes: Stroke[]; onChange?: (strokes: Stroke[]) => void; color?: string; size?: number;
  editable?: boolean; replayMs?: number; onReplayDone?: () => void; label: string; testId: string;
};

/** Canvas that stores strokes as 0..1 coordinates so any screen size can replay them. */
export function SketchCanvas({ strokes, onChange, color = '#17264D', size = 0.018, editable = false, replayMs = 0, onReplayDone, label, testId }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef(strokes);
  const drawing = useRef<Stroke | null>(null);
  const progress = useRef(replayMs ? 0 : 1);
  const doneRef = useRef(onReplayDone); doneRef.current = onReplayDone;
  const changeRef = useRef(onChange); changeRef.current = onChange;

  const paint = useCallback(() => {
    const c = canvas.current; const ctx = c?.getContext('2d'); if (!c || !ctx) return;
    const w = c.width, h = c.height; ctx.clearRect(0, 0, w, h);
    const all = strokesRef.current; const total = all.reduce((n, s) => n + s.points.length, 0);
    let budget = Math.ceil(total * progress.current);
    for (const s of all) {
      if (budget <= 0) break;
      const pts = s.points.slice(0, budget); budget -= pts.length;
      ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = Math.max(1.5, s.size * w); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0][0] * w, pts[0][1] * h, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); continue; }
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h))); ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const el = wrap.current; const c = canvas.current; if (!el || !c) return;
    const fit = () => { const r = el.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); c.width = Math.max(1, Math.round(r.width * dpr)); c.height = Math.max(1, Math.round(r.height * dpr)); paint(); };
    fit();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }
    const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, [paint]);

  useEffect(() => { if (!drawing.current) { strokesRef.current = strokes; paint(); } }, [strokes, paint]);

  useEffect(() => {
    if (!replayMs) { progress.current = 1; paint(); return; }
    let raf = 0; const start = performance.now(); progress.current = 0;
    const step = (t: number) => { progress.current = Math.min(1, (t - start) / replayMs); paint(); if (progress.current < 1) raf = requestAnimationFrame(step); else doneRef.current?.(); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [replayMs, paint]);

  const point = (e: PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return normalizePoint(e.clientX - r.left, e.clientY - r.top, r.width, r.height); };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!editable) return; e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId);
    const s: Stroke = { color, size, points: [point(e)] }; drawing.current = s;
    strokesRef.current = [...strokesRef.current, s]; paint(); changeRef.current?.(strokesRef.current);
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const cur = drawing.current; if (!editable || !cur) return;
    const p = point(e); const last = cur.points[cur.points.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.003) return;
    const next = { ...cur, points: [...cur.points, p] }; drawing.current = next;
    strokesRef.current = [...strokesRef.current.slice(0, -1), next]; paint(); changeRef.current?.(strokesRef.current);
  };
  const up = () => { drawing.current = null; };

  return <div ref={wrap} className={`gd-canvas ${editable ? 'editable' : ''}`}>
    <canvas ref={canvas} role="img" aria-label={label} data-testid={testId} data-stroke-count={strokes.length}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
    {!strokes.length && <span className="gd-canvas-empty">{editable ? 'Draw here with finger or mouse' : 'No lines yet'}</span>}
  </div>;
}
