import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Square, Droplets, Flag, Footprints, Sparkles, RotateCcw, FileVideo, VideoOff } from 'lucide-react';
import { walkingNote } from '@/lib/move-data';
import { useMoveTimer } from '@/hooks/use-move-timer';
import { MoveHeader, fmt, newId, type MoveCtx } from '@/components/move/kit';

const PACES = [{ id: 'slow', label: 'Slow', m: 0.6 }, { id: 'steady', label: 'Steady', m: 1 }, { id: 'brisk', label: 'Brisk', m: 1.35 }];
const ROUTE_SECONDS = 600; // simulated 10-minute loop
const WATER_AT = 0.5;
const VIDEO_SRC = `${import.meta.env.BASE_URL}videos/nature-walk.mp4`;

export default function WalkingPage({ ctx }: { ctx: MoveCtx }) {
  const video = useRef<HTMLVideoElement>(null);
  const timer = useMoveTimer();
  const [pace, setPace] = useState(1);
  const [progress, setProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [src, setSrc] = useState(VIDEO_SRC);
  const [localName, setLocalName] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const sessionId = useRef(newId());
  const last = useRef(0);

  // Simulated route progress advances with active seconds x pace.
  useEffect(() => {
    const d = timer.seconds - last.current; last.current = timer.seconds;
    if (d > 0) setProgress((p) => Math.min(1, p + (d * PACES[pace].m) / ROUTE_SECONDS));
    if (timer.seconds === 0) setProgress(0);
  }, [timer.seconds, pace]);
  useEffect(() => () => { if (localName && src.startsWith('blob:')) URL.revokeObjectURL(src); }, [src, localName]);

  const play = async () => {
    setVideoError(null);
    try { await video.current?.play(); setPlaying(true); timer.start(); }
    catch { setVideoError('The walking video could not start playing.'); setPlaying(false); }
  };
  const pause = () => { video.current?.pause(); setPlaying(false); timer.pause(); };
  const stop = () => {
    video.current?.pause(); if (video.current) video.current.currentTime = 0;
    setPlaying(false);
    if (timer.seconds >= 10) {
      ctx.move.saveSession({ id: sessionId.current, memberId: ctx.member.id, exerciseId: 'nature-walk', label: 'Nature walk (video)', reps: 0, target: 0, seconds: timer.seconds, consistency: 0, mode: 'demo' });
      setSaved(`Walk saved: about ${fmt(timer.seconds)} at your chosen pace. +5 points.`);
      sessionId.current = newId();
    } else setSaved(timer.seconds > 0 ? 'Stopped. Walks under 10 seconds are not saved.' : null);
    timer.stop(); timer.reset(); last.current = 0; setProgress(0);
  };
  const retry = () => { setVideoError(null); setSrc(VIDEO_SRC + `?r=${Date.now()}`); setLocalName(null); };
  const chooseLocal = (f?: File) => { if (!f) return; setVideoError(null); setLocalName(f.name); setSrc(URL.createObjectURL(f)); };

  const note = walkingNote(timer.seconds, ctx.weather);
  const noteKey = Math.floor(timer.seconds / 15);
  const water = progress >= WATER_AT && progress < WATER_AT + 0.06;

  return <main className="mv-page mv-sky motion-in">
    <MoveHeader back="/move/gym" kicker="Walking mode · indoor nature walk" title={<>Walk with<br />the palms.</>} weather={ctx.weather} demo
      lead="A muted, looping nature video to walk along with indoors. Pace, route and notes are simulated. Nothing tracks your steps or speed." />
    <div className="mv-video">
      <video ref={video} src={src} muted loop playsInline preload="metadata" aria-label="Nature walk video, muted" data-testid="video-nature-walk"
        onError={() => { setVideoError(localName ? 'That file could not be played here.' : 'The nature walk video is missing or could not load (videos/nature-walk.mp4).'); setPlaying(false); timer.pause(); }}
        onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <div className="mv-video-top"><span className="mv-weather"><Footprints size={13} /> {fmt(timer.seconds)}</span><span className="sl-demo">Demo</span></div>
      {videoError ? <div className="mv-video-err" role="alert" data-testid="status-video-error"><div style={{ display: 'grid', gap: 10, placeItems: 'center' }}>
        <VideoOff size={36} /><strong>{videoError}</strong>
        <button className="mv-btn sun" onClick={retry} data-testid="button-video-retry"><RotateCcw size={16} /> Retry</button>
        <label className="mv-btn ghost" style={{ cursor: 'pointer' }}><FileVideo size={16} /> Preview a local video<input type="file" accept="video/*" hidden onChange={(e) => chooseLocal(e.target.files?.[0])} data-testid="input-local-video" /></label>
        <small style={{ opacity: .8 }}>A local preview is not saved and stays on this device only.</small>
      </div></div>
        : timer.seconds > 0 && <div key={noteKey} className="mv-video-note" aria-live="polite" data-testid="text-walk-note"><Sparkles size={18} /> <span>{note} <small style={{ opacity: .6 }}>(Demo note)</small></span></div>}
    </div>
    {localName && !videoError && <p className="mv-fine">Previewing local file "{localName}". Not saved.</p>}

    <div className="mv-card soft" style={{ marginTop: 14 }}>
      <div className="mv-row"><strong>Route progress</strong><span className="mv-grow" /><span className="mv-tag sun">Simulated</span></div>
      <div className="mv-route" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Simulated route progress">
        <span style={{ transform: `scaleX(${progress})` }} />
        <i style={{ left: `${WATER_AT * 100}%` }} title="Water break"><Droplets size={13} /></i>
        <i style={{ left: '100%' }}><Flag size={13} /></i>
        <i className="walker" style={{ left: `${progress * 100}%` }}><Footprints size={13} /></i>
      </div>
      {water && <div className="mv-note"><Droplets size={18} /> Water break marker. Pause and sip if you need it.</div>}
      <label className="mv-kicker" htmlFor="pace" style={{ display: 'block', marginTop: 12 }}>Pace: {PACES[pace].label}</label>
      <input id="pace" className="mv-range" type="range" min={0} max={2} step={1} value={pace} onChange={(e) => setPace(Number(e.target.value))} aria-valuetext={PACES[pace].label} data-testid="input-pace" />
      <div className="mv-row" style={{ justifyContent: 'space-between' }}>{PACES.map((p) => <span key={p.id} className="mv-fine">{p.label}</span>)}</div>
    </div>
    <div className="mv-grid2">
      {playing ? <button className="mv-btn" onClick={pause} data-testid="button-walk-pause"><Pause size={17} /> Pause</button>
        : <button className="mv-btn sun" onClick={play} disabled={!!videoError} data-testid="button-walk-play"><Play size={17} /> {timer.seconds ? 'Resume' : 'Play'}</button>}
      <button className="mv-btn coral" onClick={stop} data-testid="button-walk-stop"><Square size={16} /> Stop</button>
    </div>
    {saved && <div className="mv-note" role="status" style={{ marginTop: 12 }} data-testid="status-walk-saved">{saved}</div>}
  </main>;
}
