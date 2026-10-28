import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, Repeat2, Volume2, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';
import { SCENE_DETAILS } from './sceneMeta';

const PROGRESS_TICK_MS = 60;

function announceSceneSelection(index: number, sceneKeys: string[]) {
  const key = sceneKeys[index];
  const details = SCENE_DETAILS[key];
  if (!details?.filePath) return;
  window.parent.postMessage({
    type: 'REPLIT_VIDEO_SCENE_SELECTED',
    payload: { sceneIndex: index, sceneCount: sceneKeys.length, sceneTitle: details.title || key, filePath: details.filePath, lineNumber: 1 },
  }, '*');
}

function formatPlaybackTime(durationMs: number) {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function PlaybackStatus({
  sceneKeys, activeIndex, activeDuration, activeStartTime, totalDuration, tick, paused, onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);
  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);
  useEffect(() => {
    if (paused) return;
    const start = performance.now();
    const timer = window.setInterval(() => setElapsed(elapsedBaseRef.current + performance.now() - start), PROGRESS_TICK_MS);
    return () => {
      window.clearInterval(timer);
      elapsedBaseRef.current += performance.now() - start;
    };
  }, [tick, paused]);
  const progress = activeDuration ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(totalDuration, activeStartTime + Math.min(elapsed, activeDuration));
  return (
    <>
      <div className="film-progress">
        {sceneKeys.map((key, index) => (
          <button key={key} className={`film-progress-segment ${index === activeIndex ? 'active' : ''}`} onClick={() => onJumpTo(index)} aria-label={`Jump to scene ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined}>
            <span style={{ transform: `scaleX(${index < activeIndex ? 1 : index === activeIndex ? progress : 0})` }} />
          </button>
        ))}
      </div>
      <div className="film-counter">{activeIndex + 1}/{sceneKeys.length}</div>
      <div className="film-time" role="timer" aria-label={`Playback time ${formatPlaybackTime(totalElapsed)} of ${formatPlaybackTime(totalDuration)}`}>
        {formatPlaybackTime(totalElapsed)} <i>/</i> {formatPlaybackTime(totalDuration)}
      </div>
    </>
  );
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const [muted, setMuted] = useState(false);
  const {
    sceneKeys, activeIndex, locked, paused, mountKey, tick, durations, activeDuration,
    activeStartTime, totalDuration, onSceneChange, jumpTo, toggleLock, togglePause,
  } = useSceneControls(SCENE_DURATIONS);
  const sensorRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);

  const handleJumpTo = useCallback((index: number) => {
    jumpTo(index);
    announceSceneSelection(index, sceneKeys);
  }, [jumpTo, sceneKeys]);
  const handlePointerEnter = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(true);
  }, []);
  const handlePointerLeave = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(false);
  }, []);
  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' && collapsed) setTapPinned(true);
  }, [collapsed]);
  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      if (!current) {
        setHovering(false);
        setTapPinned(false);
      }
      return !current;
    });
  }, []);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (sensorRef.current && !sensorRef.current.contains(event.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', onDocumentPointerDown);
    return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
  }, [collapsed, tapPinned]);

  useEffect(() => {
    if (!paused) return;
    const frozen = document.getAnimations().filter((animation) => animation.playState === 'running');
    frozen.forEach((animation) => animation.pause());
    return () => frozen.forEach((animation) => animation.play());
  }, [paused]);

  if (!isIframed) return <VideoTemplate />;
  const barVisible = !collapsed || hovering || tapPinned;

  return (
    <div className="film-with-controls">
      <VideoTemplate key={mountKey} durations={durations} loop paused={paused} muted={muted} onSceneChange={onSceneChange} />
      <div
        ref={sensorRef}
        className="film-control-sensor"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <div className="film-control-filler" aria-hidden="true" />
        <div className={`film-control-bar ${barVisible ? 'visible' : ''}`} aria-hidden={!barVisible}>
          <button className="film-control-button" onClick={togglePause} title={paused ? 'Play' : 'Pause'} aria-label={paused ? 'Play' : 'Pause'}>
            {paused ? <Play /> : <Pause />}
          </button>
          <button className={`film-control-button ${locked ? 'selected' : ''}`} onClick={toggleLock} title={locked ? 'Loop current scene: on' : 'Loop current scene: off'} aria-label={locked ? 'Loop current scene: on' : 'Loop current scene: off'} aria-pressed={locked}>
            <Repeat2 />
          </button>
          <button className="film-control-button" onClick={() => setMuted((value) => !value)} title={muted ? 'Unmute music' : 'Mute music'} aria-label={muted ? 'Unmute music' : 'Mute music'} aria-pressed={muted}>
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <div className="film-control-divider" />
          <PlaybackStatus
            sceneKeys={sceneKeys}
            activeIndex={activeIndex}
            activeDuration={activeDuration}
            activeStartTime={activeStartTime}
            totalDuration={totalDuration}
            tick={tick}
            paused={paused}
            onJumpTo={handleJumpTo}
          />
          <button className="film-control-button film-collapse" onClick={handleToggleCollapsed} title={collapsed ? 'Show controls' : 'Hide controls'} aria-label={collapsed ? 'Show controls' : 'Hide controls'} aria-expanded={!collapsed}>
            {collapsed ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
      </div>
    </div>
  );
}
