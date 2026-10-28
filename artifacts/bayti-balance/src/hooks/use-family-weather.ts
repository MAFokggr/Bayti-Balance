import { useEffect, useState } from 'react';
import type { WeatherMode, WeatherReading } from '@/lib/family-types';

const DEMO_TEMPERATURES: Record<WeatherMode, number> = { comfortable: 26, highHeat: 41, dusty: 34, evening: 30 };
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=24.45&longitude=54.37&current=temperature_2m,is_day,weather_code&timezone=Asia%2FDubai';

export function useFamilyWeather(override: WeatherMode | 'live') {
  const [reading, setReading] = useState<WeatherReading>({
    mode: 'comfortable', temperature: 26, isDemo: true, loading: override === 'live', error: null,
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (override !== 'live') return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    setReading((old) => ({ ...old, loading: true, error: null }));
    void (async () => {
      try {
        const response = await fetch(WEATHER_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
        const body = await response.json();
        const temperature = body?.current?.temperature_2m;
        if (typeof temperature !== 'number' || !Number.isFinite(temperature)) throw new Error('Weather temperature was missing.');
        const mode: WeatherMode = temperature >= 37 ? 'highHeat' : body.current.is_day === 0 ? 'evening' : 'comfortable';
        if (!disposed) setReading({ mode, temperature: Math.round(temperature), isDemo: false, loading: false, error: null });
      } catch (cause) {
        if (!disposed) {
          console.warn('[Bayti weather] Using labeled Demo fallback', cause);
          setReading({
            mode: 'comfortable', temperature: 26, isDemo: true, loading: false,
            error: 'Live weather could not be loaded. Demo conditions are shown; retry for a live reading.',
          });
        }
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => { disposed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [override, attempt]);
  const shown: WeatherReading = override === 'live' ? reading : {
    mode: override, temperature: DEMO_TEMPERATURES[override], isDemo: true, loading: false, error: null,
  };
  return { ...shown, retry: () => setAttempt((value) => value + 1) };
}
