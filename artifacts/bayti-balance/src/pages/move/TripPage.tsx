import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { Map as MapIcon, List, Wand2, Plus, Minus, PiggyBank, Footprints, Armchair, Droplets, Building2, Save, CalendarDays, Home as HomeIcon, Accessibility, Info, Sun, Sunset } from 'lucide-react';
import { ACTIVITY_STOPS } from '@/lib/move-data';
import type { ActivityStop, Interest, TripChange, TripPreferences, TripStop } from '@/lib/move-types';
import { MoveHeader, ErrorNote, isHot, type MoveCtx } from '@/components/move/kit';
import { stopIcon, STOP_COLORS } from '@/components/move/stopIcons';

const TripMap = lazy(() => import('@/components/move/TripMap'));
const INTERESTS: Interest[] = ['nature', 'sport', 'food', 'culture', 'play'];

class MapBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn('[Move map] falling back to list', e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function StopRow({ s, i, onRemove }: { s: ActivityStop | TripStop; i: number; onRemove?: () => void }) {
  const I = stopIcon(s.illustration, (s as TripStop).kind);
  const opt = (s as TripStop).optional;
  return <div className={`mv-stop ${opt ? 'optional' : ''}`} data-testid={`row-stop-${s.id}`}>
    <div className="mv-stop-art" style={{ background: STOP_COLORS[i % STOP_COLORS.length] }}><I size={20} /></div>
    <div className="mv-grow">
      <div className="mv-row" style={{ gap: 5 }}><strong style={{ fontSize: 14 }}>{s.name}</strong>{'kind' in s && <span className="mv-tag">{s.kind}</span>}{opt && <span className="mv-tag sun">optional, not in totals</span>}</div>
      <div className="mv-fine">{s.distanceKm} km · {s.minutes} min · AED {s.cost} · {s.indoor ? 'indoor' : 'outdoor'}{s.heatSuitable ? ' · heat-ok' : ''}{s.accessible ? ' · step-free (check)' : ''}</div>
      <div className="mv-fine">{s.familySuitability}</div>
    </div>
    {onRemove && <button className="mv-back" style={{ minWidth: 44, minHeight: 44, padding: 0 }} onClick={onRemove} aria-label={`Remove ${s.name}`} data-testid={`button-remove-${s.id}`}><Minus size={16} /></button>}
  </div>;
}

export default function TripPage({ ctx }: { ctx: MoveCtx }) {
  const { move, weather } = ctx;
  const [prefs, setPrefs] = useState<TripPreferences>(move.data.tripPreferences);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [tileError, setTileError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);
  const plan = move.data.trip;
  const tod = plan?.timeOfDay ?? move.data.tripPreferences.timeOfDay;
  const unsafeWeather = weather === 'dusty' || (weather === 'highHeat' && tod !== 'sunset');
  const outdoorStops = plan?.stops.filter((s) => !s.indoor) ?? [];
  const unsafe = !!plan && unsafeWeather && outdoorStops.length > 0;
  const [weatherError, setWeatherError] = useState<string | null>(null);
  // One automatic indoor adaptation per weather/route; never loops.
  const adapted = useRef<string>('');
  useEffect(() => {
    if (!plan || !unsafe) return;
    if (adapted.current === weather) return; // already tried for this weather; show error instead of retrying
    adapted.current = weather;
    try { move.changeTrip('indoor', weather); setWeatherError(null); }
    catch (e) { setWeatherError(e instanceof Error ? e.message : 'No indoor stop fits this route right now.'); }
  }, [plan, unsafe, weather]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!unsafe) { setWeatherError(null); adapted.current = ''; } }, [unsafe]);
  const p = <K extends keyof TripPreferences>(k: K, v: TripPreferences[K]) => setPrefs((o) => ({ ...o, [k]: v }));
  const attempt = (fn: () => void) => { setError(null); setSavedMsg(false); try { fn(); } catch (e) { setError(e instanceof Error ? e.message : 'That change could not be made.'); } };
  const build = () => { adapted.current = ''; attempt(() => move.buildTrip(prefs, weather)); };
  const change = (a: TripChange, stopId?: string) => attempt(() => move.changeTrip(a, weather, stopId));
  const save = () => { if (unsafe) return; attempt(() => { move.saveTripToFamily(); setSavedMsg(true); }); };
  const mapFallback = <div className="mv-map" style={{ display: 'grid', placeItems: 'center', padding: 20, textAlign: 'center' }}><div><MapIcon size={28} /><p className="mv-lead">The map could not load. The list below has every stop.</p><button className="mv-btn ghost" onClick={() => setView('list')} data-testid="button-show-list">Show list</button></div></div>;
  const CONTROLS: [TripChange, string, typeof Plus][] = [['add', 'Add stop', Plus], ['cheaper', 'Make cheaper', PiggyBank], ['less-walking', 'Reduce walking', Footprints], ['rest', 'Add rest', Armchair], ['water', 'Add water break', Droplets], ['indoor', 'Make indoor', Building2]];
  const counted = plan?.stops.filter((s) => !s.optional) ?? [];

  return <main className="mv-page mv-sky motion-in">
    <MoveHeader kicker="Plan an activity" title={<>An Abu Dhabi<br />family outing.</>} weather={weather} demo="Demo estimates"
      lead="Rule-based ideas from 12 illustrative stops. Costs, distances and accessibility are rough estimates, not bookings or navigation. Always check with venues." />
    {error && <ErrorNote text={error} onClose={() => setError(null)} />}
    {unsafe && <div className="mv-alert" role="alert" data-testid="status-trip-unsafe"><Sun size={18} /><span><strong>Outdoor stops are not safe in {weather === 'dusty' ? 'dusty' : 'high heat'} conditions{weather === 'highHeat' ? ' at this time of day' : ''}.</strong> {weatherError ?? 'Switching to indoor options...'} Try raising the budget, choosing indoor or after sunset, then Rebuild route, or tap Make indoor. Saving is off until the route is safe.</span></div>}
    {plan && !unsafe && weather === 'highHeat' && tod === 'sunset' && outdoorStops.length > 0 && <div className="mv-note"><Sunset size={18} /> Outdoor stops are kept for after sunset. Check real conditions before going and bring water.</div>}
    {isHot(weather) && <div className="mv-note"><Sun size={18} /> {weather === 'dusty' ? 'Dusty' : 'Very hot'} right now: the planner picks indoor or after-sunset stops.</div>}

    <section className="mv-stack" style={{ marginBottom: 14 }}>
      <div className="mv-card soft">
        <label className="mv-kicker" htmlFor="budget">Budget: AED {prefs.budget}</label>
        <input id="budget" className="mv-range" type="range" min={0} max={500} step={10} value={prefs.budget} onChange={(e) => p('budget', Number(e.target.value))} data-testid="input-budget" />
        <label className="mv-kicker" htmlFor="minutes">Time: {Math.floor(prefs.minutes / 60)}h {prefs.minutes % 60}m</label>
        <input id="minutes" className="mv-range" type="range" min={30} max={360} step={15} value={prefs.minutes} onChange={(e) => p('minutes', Number(e.target.value))} data-testid="input-minutes" />
      </div>
      <div className="mv-card soft"><div className="mv-kicker" style={{ marginBottom: 8 }}>Interests</div>
        <div className="mv-row">{INTERESTS.map((i) => <button key={i} className="mv-chip" aria-pressed={prefs.interests.includes(i)} style={{ textTransform: 'capitalize' }} onClick={() => p('interests', prefs.interests.includes(i) ? prefs.interests.filter((x) => x !== i) : [...prefs.interests, i])} data-testid={`button-interest-${i}`}>{i}</button>)}</div>
      </div>
      <div className="mv-card soft mv-stack" style={{ gap: 10 }}>
        <div className="mv-row">{(['any', 'indoor', 'outdoor'] as const).map((l) => <button key={l} className="mv-chip" aria-pressed={prefs.location === l} style={{ textTransform: 'capitalize' }} onClick={() => p('location', l)} data-testid={`button-location-${l}`}>{l}</button>)}</div>
        <div className="mv-row">
          <button className="mv-chip" aria-pressed={prefs.timeOfDay === 'daytime'} onClick={() => p('timeOfDay', 'daytime')} data-testid="button-time-daytime"><Sun size={14} /> Daytime</button>
          <button className="mv-chip" aria-pressed={prefs.timeOfDay === 'sunset'} onClick={() => p('timeOfDay', 'sunset')} data-testid="button-time-sunset"><Sunset size={14} /> After sunset</button>
          <button className="mv-chip" aria-pressed={prefs.accessible} onClick={() => p('accessible', !prefs.accessible)} data-testid="button-accessible"><Accessibility size={14} /> Step-free needed</button>
        </div>
      </div>
      <button className="mv-btn full sun" onClick={build} data-testid="button-build-trip"><Wand2 size={17} /> {plan ? 'Rebuild route' : 'Build our route'}</button>
    </section>

    <div className="mv-row" style={{ marginBottom: 8 }}>
      <h2 className="mv-h2" style={{ margin: 0 }}>{plan ? 'Your route' : 'All stops'}</h2><span className="mv-grow" />
      <button className="mv-chip" aria-pressed={view === 'map'} onClick={() => setView('map')} data-testid="button-view-map"><MapIcon size={14} /> Map</button>
      <button className="mv-chip" aria-pressed={view === 'list'} onClick={() => setView('list')} data-testid="button-view-list"><List size={14} /> List</button>
    </div>
    {view === 'map' && <div style={{ marginBottom: 12 }}>
      <MapBoundary fallback={mapFallback}><Suspense fallback={<div className="mv-map mv-skel" />}><div className="mv-map"><TripMap stops={ACTIVITY_STOPS} route={plan?.stops ?? []} onTileError={() => setTileError(true)} /></div></Suspense></MapBoundary>
      {tileError && <p className="mv-fine" role="status">Some map tiles did not load (offline?). Use the list view.</p>}
      <p className="mv-fine">Map data © OpenStreetMap contributors. Pins are approximate planning zones.</p>
    </div>}

    {plan ? <>
      <div className="mv-grid2" style={{ marginBottom: 6 }}>
        <div className="mv-stat"><b data-testid="text-trip-cost">AED {plan.cost}</b><span>est. cost</span></div>
        <div className="mv-stat"><b data-testid="text-trip-minutes">{plan.minutes} min</b><span>est. time</span></div>
      </div>
      <p className="mv-fine">Totals cover the {counted.length} main stops only. Dashed optional stops are not counted. Budget AED {prefs.budget}, time {prefs.minutes} min.</p>
      <div className="mv-stack" style={{ gap: 8, margin: '10px 0' }}>{plan.stops.map((s, i) => <StopRow key={`${s.id}-${i}`} s={s} i={i} onRemove={() => change('remove', s.id)} />)}</div>
      <div className="mv-grid2" style={{ marginBottom: 12 }}>{CONTROLS.map(([a, label, I]) => <button key={a} className="mv-btn ghost" style={{ fontSize: 13, padding: '0 10px' }} onClick={() => change(a)} data-testid={`button-trip-${a}`}><I size={15} /> {label}</button>)}</div>
      <div className="mv-card soft"><div className="mv-row" style={{ marginBottom: 8 }}><Info size={16} /><strong>Why the plan looks like this</strong></div>
        <div className="mv-stack" style={{ gap: 6 }} aria-live="polite">{plan.explanations.length ? [...plan.explanations].reverse().map((e, i) => <div key={`${i}-${e}`} className="mv-explain" data-testid={`text-explanation-${i}`}>{e}</div>) : <p className="mv-fine">Changes you make will be explained here.</p>}</div>
      </div>
      <button className="mv-btn full oasis" onClick={save} disabled={unsafe} data-testid="button-save-trip"><Save size={17} /> Save to family plan</button>
      {savedMsg && <div className="mv-note" role="status" style={{ marginTop: 10 }} data-testid="status-trip-saved"><span>Saved to today's family timeline as one route (not marked done). <Link href="/home" style={{ textDecoration: 'underline' }} data-testid="link-home-plan"><HomeIcon size={13} /> Open Home</Link></span></div>}
      <Link href="/move/weekend" className="mv-btn full ghost" style={{ marginTop: 10 }} data-testid="link-weekend"><CalendarDays size={17} /> Weekend plan view</Link>
    </> : view === 'list' && <div className="mv-stack" style={{ gap: 8 }}>{ACTIVITY_STOPS.map((s, i) => <StopRow key={s.id} s={s} i={i} />)}</div>}
    {plan && view === 'list' && <details style={{ marginTop: 12 }}><summary className="mv-kicker">All 12 catalogue stops</summary><div className="mv-stack" style={{ gap: 8, marginTop: 8 }}>{ACTIVITY_STOPS.map((s, i) => <StopRow key={s.id} s={s} i={i} />)}</div></details>}
  </main>;
}
