import { useEffect, useRef } from 'react';
import type { ComponentType } from 'react';
import {
  VideoCanvas,
  type VideoAspectRatio,
  VideoPausedContext,
  useVideoPlayer,
} from '@/lib/video';
import { AnimatePresence } from 'framer-motion';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import './film.css';

export const SCENE_DURATIONS = {
  opening: 4000,
  move: 4000,
  eat: 5000,
  recover: 5000,
  resolve: 6000,
};

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';
const COMPONENTS: Record<string, ComponentType> = {
  opening: Scene1,
  move: Scene2,
  eat: Scene3,
  recover: Scene4,
  resolve: Scene5,
};
const SCENE_START_SEC: Record<string, number> = (() => {
  const starts: Record<string, number> = {};
  let total = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    starts[key] = total / 1000;
    total += ms;
  }
  return starts;
})();

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.42;
    if (paused) {
      audio.pause();
      return;
    }
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > 0.18) audio.currentTime = targetTime;
    audio.play().catch(() => {});
  }, [baseSceneKey, currentSceneKey, muted, paused]);

  const Scene = COMPONENTS[baseSceneKey] ?? Scene1;

  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas
        aspectRatio={VIDEO_ASPECT_RATIO}
        className="film-canvas"
        style={{ backgroundColor: 'var(--paper)' }}
      >
        <div className="film-grain" aria-hidden="true" />
        <AnimatePresence mode="sync" initial={false}>
          <Scene key={currentSceneKey} />
        </AnimatePresence>
        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
          preload="auto"
          autoPlay
          muted={muted}
        />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
