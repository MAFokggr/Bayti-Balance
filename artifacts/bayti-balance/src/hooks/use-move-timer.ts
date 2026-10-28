import { useCallback, useEffect, useRef, useState } from 'react';

export function useMoveTimer(limitSeconds?: number) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const accumulated = useRef(0);
  const started = useRef<number | null>(null);
  const pause = useCallback(() => {
    if (started.current !== null) accumulated.current += (performance.now() - started.current) / 1000;
    started.current = null;
    setSeconds(limitSeconds === undefined ? accumulated.current : Math.min(limitSeconds, accumulated.current));
    setRunning(false);
  }, [limitSeconds]);
  const start = useCallback(() => {
    if (started.current !== null || (limitSeconds !== undefined && accumulated.current >= limitSeconds)) return;
    started.current = performance.now(); setRunning(true);
  }, [limitSeconds]);
  const reset = useCallback(() => { started.current = null; accumulated.current = 0; setSeconds(0); setRunning(false); }, []);
  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(() => {
      const elapsed = accumulated.current + (started.current === null ? 0 : (performance.now() - started.current) / 1000);
      if (limitSeconds !== undefined && elapsed >= limitSeconds) {
        accumulated.current = limitSeconds; started.current = null; setSeconds(limitSeconds); setRunning(false);
      } else setSeconds(elapsed);
    }, 100);
    const hidden = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { window.clearInterval(tick); document.removeEventListener('visibilitychange', hidden); };
  }, [running, limitSeconds, pause]);
  return { seconds, remaining: limitSeconds === undefined ? null : Math.max(0, limitSeconds - seconds), running, start, pause, reset, stop: pause };
}
