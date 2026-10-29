import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Pause, Play, RotateCcw, Square, Timer, UserRound } from 'lucide-react';
import { ExerciseCelebration } from './ExerciseCelebration';
import { CameraExerciseExample } from './CameraExerciseExample';
import type { CameraExercise, CoachMetrics, CoachMode } from '@/lib/camera-types';
import { cameraAsset, cameraFailure, loadPoseModel, waitForCameraFrame } from '@/lib/camera-runtime';
import './camera-additions.css';

const CAMERA_RULES = {
  squatDownKneeAngleDeg: 110,
  squatUpKneeAngleDeg: 160,
  sideStepFraction: 0.12,
  jumpRiseFraction: 0.06,
  visibilityMinimum: 0.5,
  visibilityTimeoutMs: 2000,
  repCooldownMs: 500,
  calibrationMs: 2000,
  targetFps: 20,
} as const;

const ADVICE = ['Keep your back tall', 'Move a little slower', 'Raise your arms higher', 'Good form', 'Great control', 'Take a short break', 'Keep your body centered'];
const BONES: [number, number][] = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[24,26],[26,28],[28,30],[30,32]];
type Exercise = CameraExercise;
type Props = {
  member: string; onRep: (exercise: string, reps: number) => void;
  initialCount?: number; initialCounts?: Record<string, number>;
  initialExercise?: Exercise; allowedExercises?: Exercise[]; targetReps?: number; showExample?: boolean;
  onMetrics?: (metrics: CoachMetrics) => void; paused?: boolean; onStop?: () => void;
};
type Point = { x: number; y: number; visibility?: number };

function createTrackingCanvas() {
  // Use a dedicated DOM canvas, not the 2D skeleton overlay or an implicit
  // OffscreenCanvas. MediaPipe needs WebGL for image input even with CPU inference.
  const canvas = document.createElement('canvas');
  if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) {
    throw new Error('WebGL is unavailable for movement tracking.');
  }
  return canvas;
}

export function CameraCoach({
  member, onRep, initialCount = 0, initialCounts = {}, initialExercise = 'squat',
  allowedExercises, targetReps, showExample = false, onMetrics, paused: externallyPaused, onStop,
}: Props) {
  const choices: Exercise[] = allowedExercises?.length ? allowedExercises : ['squat', 'arm raise', 'side step', 'jump', 'high knees'];
  const startingExercise = choices.includes(initialExercise) ? initialExercise : choices[0];
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const generationRef = useRef(0);
  const detectorRef = useRef<any>(null);
  const graphicsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<Uint8Array | null>(null);
  const videoTimeRef = useRef(-1);
  const filesRef = useRef<any>(null);
  const detectorDelegateRef = useRef<'GPU' | 'CPU' | null>(null);
  const cpuFallbackUsedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const frameAtRef = useRef(0);
  const historyRef = useRef<Point[][]>([]);
  const lostAtRef = useRef(0);
  const cooldownRef = useRef(0);
  const phaseRef = useRef('Ready');
  const baselineRef = useRef<number | null>(null);
  const calibrationStartedRef = useRef<number | null>(null);
  const centerRef = useRef<number | null>(null);
  const stateRef = useRef(false);
  const pausedRef = useRef(false);
  const pausedModeRef = useRef<'live' | 'preview' | 'demo'>('live');
  const trackingRef = useRef<'searching' | 'tracking' | 'lost'>('searching');
  const framesRef = useRef({ total: 0, visible: 0 });
  const peakRiseRef = useRef(0);
  const [jumpRise, setJumpRise] = useState<{ last: number | null; previous: number | null }>({ last: null, previous: null });
  const onMetricsRef = useRef(onMetrics);
  onMetricsRef.current = onMetrics;
  const [exercise, setExercise] = useState<Exercise>(startingExercise);
  const exerciseRef = useRef<Exercise>(startingExercise);
  exerciseRef.current = exercise;
  const onRepRef = useRef(onRep);
  onRepRef.current = onRep;
  const [permissionExplained, setPermissionExplained] = useState(false);
  const [state, setState] = useState<CoachMode>('ready');
  const modeRef = useRef<CoachMode>('ready');
  modeRef.current = state;
  const [trackingStatus, setTrackingStatus] = useState<'searching' | 'tracking' | 'lost'>('searching');
  const [delegate, setDelegate] = useState<'GPU' | 'CPU' | null>(null);
  const [error, setError] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [reps, setReps] = useState(initialCounts[startingExercise] ?? initialCount);
  const repsRef = useRef(initialCounts[startingExercise] ?? initialCount);
  const [phase, setPhase] = useState('Ready');
  const [elapsed, setElapsed] = useState(0);
  const [adviceIndex, setAdviceIndex] = useState(3);
  const [celebration, setCelebration] = useState<number | null>(null);
  const clearCelebration = useCallback(() => setCelebration(null), []);
  useEffect(() => {
    onMetricsRef.current?.({
      exercise, reps, elapsedSeconds: elapsed, mode: state, phase, tracking: trackingStatus,
      lastJumpRise: state === 'demo' ? null : jumpRise.last,
      previousJumpRise: state === 'demo' ? null : jumpRise.previous,
      consistency: state !== 'demo' && framesRef.current.total ? Math.round(framesRef.current.visible / framesRef.current.total * 100) : 0,
    });
  }, [exercise, reps, elapsed, state, phase, trackingStatus, jumpRise]);

  const setMode = (mode: typeof state) => { stateRef.current = mode === 'live'; setState(mode); };
  const updateTrackingStatus = (value: 'searching' | 'tracking' | 'lost') => {
    if (trackingRef.current !== value) {
      trackingRef.current = value;
      setTrackingStatus(value);
    }
  };
  const releaseGraphics = useCallback(() => {
    const canvas = graphicsCanvasRef.current;
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    graphicsCanvasRef.current = null;
  }, []);
  const trackingCanvas = () => {
    releaseGraphics();
    const canvas = createTrackingCanvas();
    graphicsCanvasRef.current = canvas;
    return canvas;
  };
  const teardown = useCallback(() => {
    generationRef.current += 1;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current?.close?.();
    detectorRef.current = null;
    releaseGraphics();
    filesRef.current = null;
    modelRef.current = null;
    videoTimeRef.current = -1;
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    detectorDelegateRef.current = null;
  }, [releaseGraphics]);
  const reportTrackingFailure = useCallback((cause: unknown) => {
    stateRef.current = false;
    cancelAnimationFrame(rafRef.current);
    const detector = detectorRef.current;
    detectorRef.current = null;
    detectorDelegateRef.current = null;
    try { detector?.close?.(); } catch (closeError) { console.warn('[Bayti camera] Detector cleanup failed', closeError); }
    releaseGraphics();
    setDelegate(null);
    const message = cause instanceof Error ? cause.message : String(cause);
    setTrackingError(/webgl|opengl|activetexture/i.test(message)
      ? 'Your camera is on, but movement tracking needs WebGL support. Enable hardware acceleration in your browser or try a different browser. You can also use Demo Mode.'
      : `Your camera is on, but movement tracking could not start. ${message} Retry tracking, or use Demo Mode.`);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    pausedModeRef.current = 'preview';
    setState(pausedRef.current ? 'paused' : 'preview');
  }, [releaseGraphics]);
  useEffect(() => {
    if (state === 'live' || state === 'demo') {
      const tick = window.setInterval(() => setElapsed((value) => value + 1), 1000);
      const tips = window.setInterval(() => setAdviceIndex((value) => (value + 1) % ADVICE.length), 4000);
      return () => { window.clearInterval(tick); window.clearInterval(tips); };
    }
    return undefined;
  }, [state]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && (stateRef.current || modeRef.current === 'demo' || modeRef.current === 'preview')) {
        clearCelebration();
        pausedRef.current = true;
        cancelAnimationFrame(rafRef.current);
        pausedModeRef.current = modeRef.current === 'demo' ? 'demo' : modeRef.current === 'preview' ? 'preview' : 'live';
        stateRef.current = false;
        setState('paused');
      }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => { document.removeEventListener('visibilitychange', visibility); teardown(); };
  }, [teardown]);
  useEffect(() => {
    const savedCount = initialCounts[exercise] ?? initialCount;
    repsRef.current = savedCount;
    setReps(savedCount);
    clearCelebration();
    historyRef.current = [];
    baselineRef.current = null;
    calibrationStartedRef.current = null;
    centerRef.current = null;
    cooldownRef.current = 0;
    lostAtRef.current = 0;
    framesRef.current = { total: 0, visible: 0 };
    peakRiseRef.current = 0;
    setJumpRise({ last: null, previous: null });
    setElapsed(0);
    phaseRef.current = state === 'demo' || (state === 'paused' && pausedModeRef.current === 'demo')
      ? 'Demo mode · tap when you complete a rep' : 'Ready';
    setPhase(phaseRef.current);
  }, [member, exercise]);
  const changeReps = useCallback((next: number) => {
    repsRef.current = next;
    setReps(next);
    onRepRef.current(exerciseRef.current, next);
  }, []);
  const updatePhase = (value: string) => { phaseRef.current = value; setPhase(value); };

  const countRep = useCallback(() => {
    if (Date.now() - cooldownRef.current < CAMERA_RULES.repCooldownMs) return false;
    cooldownRef.current = Date.now();
    const next = repsRef.current + 1;
    repsRef.current = next;
    setReps(next);
    onRepRef.current(exerciseRef.current, next);
    if (next % 3 === 0) setCelebration(next);
    return true;
  }, []);

  const analyze = useCallback((landmarks: Point[], width: number, height: number) => {
    const activeExercise = exerciseRef.current;
    const visible = (i: number) => landmarks[i] && (landmarks[i].visibility ?? 1) >= CAMERA_RULES.visibilityMinimum;
    const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const angle = (a: Point, b: Point, c: Point) => {
      const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
      const degrees = Math.abs(radians * 180 / Math.PI) % 360;
      return degrees > 180 ? 360 - degrees : degrees;
    };
    let ready = false;
    let landedRise = 0;
    if (activeExercise === 'squat') {
      const kneeTriples: [number, number, number][] = [[23,25,27],[24,26,28]];
      const visibleAngles = kneeTriples
        .filter(([hip, knee, ankle]) => [hip,knee,ankle].every(visible))
        .map(([hip, knee, ankle]) => angle(landmarks[hip], landmarks[knee], landmarks[ankle]));
      if (visibleAngles.length) {
        const deg = visibleAngles.reduce((sum, value) => sum + value, 0) / visibleAngles.length;
        if (deg < CAMERA_RULES.squatDownKneeAngleDeg) { if (!phaseRef.current.includes('Down')) updatePhase('Down · hold'); }
        else if (deg > CAMERA_RULES.squatUpKneeAngleDeg && phaseRef.current.includes('Down')) { updatePhase('Stand tall'); ready = true; }
      }
    } else if (activeExercise === 'arm raise') {
      const sides: [number, number, number][] = [[11,15,23],[12,16,24]];
      const visibleSides = sides.filter(([shoulder,wrist,hip]) => [shoulder,wrist,hip].every(visible));
      const raised = visibleSides.some(([shoulder,wrist]) => landmarks[wrist].y < landmarks[shoulder].y);
      const lowered = visibleSides.some(([,wrist,hip]) => landmarks[wrist].y > landmarks[hip].y);
      if (raised) { if (phaseRef.current !== 'Arms raised') updatePhase('Arms raised'); }
      else if (lowered && phaseRef.current === 'Arms raised') { updatePhase('Arms down'); ready = true; }
    } else if (activeExercise === 'side step' && [23,24].every(visible)) {
      const x = midpoint(landmarks[23], landmarks[24]).x;
      if (centerRef.current === null) centerRef.current = x;
      if (phaseRef.current !== 'Step out' && Math.abs(x - centerRef.current) > CAMERA_RULES.sideStepFraction) updatePhase('Step out');
      else if (phaseRef.current === 'Step out' && Math.abs(x - centerRef.current) < CAMERA_RULES.sideStepFraction) { updatePhase('Back to center'); ready = true; }
    } else if (activeExercise === 'jump' && [23,24].every(visible)) {
      const y = midpoint(landmarks[23], landmarks[24]).y;
      if (baselineRef.current === null) { baselineRef.current = y; calibrationStartedRef.current = Date.now(); updatePhase('Calibrating · stand still'); }
      else if (calibrationStartedRef.current !== null && Date.now() - calibrationStartedRef.current < CAMERA_RULES.calibrationMs) {
        baselineRef.current = baselineRef.current * .92 + y * .08;
        updatePhase('Calibrating · stand still');
      }
      else if (y < baselineRef.current - CAMERA_RULES.jumpRiseFraction) {
        peakRiseRef.current = Math.max(peakRiseRef.current, baselineRef.current - y);
        if (phaseRef.current !== 'In the air') updatePhase('In the air');
      }
      else if (phaseRef.current === 'In the air') {
        landedRise = peakRiseRef.current; peakRiseRef.current = 0;
        updatePhase('Landed'); ready = true;
      }
    } else if (activeExercise === 'high knees' && [23,24,25,26].every(visible)) {
      const leftUp = landmarks[25].y < landmarks[23].y;
      const rightUp = landmarks[26].y < landmarks[24].y;
      if (leftUp !== rightUp) {
        const side = leftUp ? 'left' : 'right';
        if (phaseRef.current !== `Knee ${side}`) { updatePhase(`Knee ${side}`); ready = true; }
      }
    }
    if (ready && countRep() && activeExercise === 'jump' && landedRise > 0) {
      setJumpRise((old) => ({ previous: old.last, last: landedRise }));
    }
    void width; void height;
  }, [countRep]);

  const draw = useCallback((points: Point[], w: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = Math.max(2, w / 200);
    ctx.strokeStyle = '#65ffe0';
    ctx.fillStyle = '#ffe58b';
    BONES.forEach(([a,b]) => {
      if (!points[a] || !points[b]) return;
      if ((points[a].visibility ?? 1) < CAMERA_RULES.visibilityMinimum || (points[b].visibility ?? 1) < CAMERA_RULES.visibilityMinimum) return;
      ctx.beginPath(); ctx.moveTo(points[a].x*w, points[a].y*h); ctx.lineTo(points[b].x*w, points[b].y*h); ctx.stroke();
    });
    points.forEach((p) => {
      if ((p.visibility ?? 1) < CAMERA_RULES.visibilityMinimum) return;
      ctx.beginPath(); ctx.arc(p.x*w,p.y*h,Math.max(3,w/120),0,Math.PI*2);ctx.fill();
    });
  }, []);

  const frameLoop = useCallback(() => {
    if (!stateRef.current || !videoRef.current || !detectorRef.current) return;
    const now = performance.now();
    if (now - frameAtRef.current >= 1000 / CAMERA_RULES.targetFps && videoRef.current.readyState >= 2 &&
        videoRef.current.videoWidth > 0 && videoRef.current.currentTime !== videoTimeRef.current) {
      frameAtRef.current = now;
      videoTimeRef.current = videoRef.current.currentTime;
      try {
        const result = detectorRef.current.detectForVideo(videoRef.current, now);
        const raw: Point[] | undefined = result.landmarks?.[0];
        const hasVisiblePose = raw && raw.filter((p) => (p.visibility ?? 1) >= CAMERA_RULES.visibilityMinimum).length >= 8;
        framesRef.current.total++;
        if (raw && hasVisiblePose) {
          framesRef.current.visible++;
          const wasLost = lostAtRef.current > 0 && Date.now() - lostAtRef.current >= CAMERA_RULES.visibilityTimeoutMs;
          lostAtRef.current = 0;
          updateTrackingStatus('tracking');
          if (wasLost) {
            updatePhase('Ready');
            cooldownRef.current = Date.now();
            historyRef.current = [];
            baselineRef.current = null; calibrationStartedRef.current = null;
            centerRef.current = null; peakRiseRef.current = 0;
          }
          historyRef.current = [...historyRef.current, raw].slice(-5);
          const smoothed = raw.map((p, i) => {
            const samples = historyRef.current.map((frame) => frame[i]).filter((sample) => sample && (sample.visibility ?? 1) >= CAMERA_RULES.visibilityMinimum);
            if (samples.length === 0) return p;
            return {
              ...p,
              x: samples.reduce((sum, sample) => sum + sample.x, 0) / samples.length,
              y: samples.reduce((sum, sample) => sum + sample.y, 0) / samples.length,
            };
          });
          draw(smoothed, videoRef.current.videoWidth, videoRef.current.videoHeight);
          analyze(smoothed, videoRef.current.videoWidth, videoRef.current.videoHeight);
        } else {
          if (!lostAtRef.current) lostAtRef.current = Date.now();
          if (Date.now() - lostAtRef.current >= CAMERA_RULES.visibilityTimeoutMs) {
            updatePhase('Step back so we can see you');
            updateTrackingStatus('lost');
          } else if (trackingRef.current !== 'lost') {
            updateTrackingStatus('searching');
          }
          historyRef.current = [];
          draw([], videoRef.current.videoWidth, videoRef.current.videoHeight);
        }
      } catch (cause) {
        console.error('[Bayti camera] Pose frame failed', cameraFailure(cause), {
          delegate: detectorDelegateRef.current,
          videoWidth: videoRef.current?.videoWidth,
          videoHeight: videoRef.current?.videoHeight,
          currentTime: videoRef.current?.currentTime,
        });
        if (detectorDelegateRef.current === 'GPU' && !cpuFallbackUsedRef.current && filesRef.current) {
          cpuFallbackUsedRef.current = true;
          stateRef.current = false;
          setState('preview');
          const fallbackGeneration = generationRef.current;
          const files = filesRef.current;
          void (async () => {
            try {
              detectorRef.current?.close?.();
              const vision = await import('@mediapipe/tasks-vision') as any;
              const cpuDetector = await vision.PoseLandmarker.createFromOptions(files, {
                 baseOptions: { modelAssetBuffer: modelRef.current, delegate: 'CPU' },
                 canvas: trackingCanvas(),
                runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5,
              });
              if (generationRef.current !== fallbackGeneration) {
                cpuDetector.close?.();
                return;
              }
              detectorRef.current = cpuDetector;
              detectorDelegateRef.current = 'CPU';
              setDelegate('CPU');
              updateTrackingStatus('searching');
              updatePhase('CPU tracking enabled');
              if (pausedRef.current) return;
              setMode('live');
              rafRef.current = requestAnimationFrame(frameLoop);
            } catch (cause) {
              if (generationRef.current !== fallbackGeneration) return;
               console.error('[Bayti camera] CPU fallback failed', cameraFailure(cause));
              reportTrackingFailure(cause);
            }
          })();
          return;
        }
        reportTrackingFailure(cause);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(frameLoop);
  }, [analyze, draw, reportTrackingFailure]);

  const startCamera = async () => {
    clearCelebration();
    teardown(); setDelegate(null); setError(''); setTrackingError(''); setMode('loading'); setPermissionExplained(true);
    pausedRef.current = false;
    const requestGeneration = ++generationRef.current;
    const requestIsCurrent = () => generationRef.current === requestGeneration;
    cpuFallbackUsedRef.current = false;
    updateTrackingStatus('searching');
    let cameraOpened = false;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not available in this browser. Use a secure connection or try Demo Mode.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (!requestIsCurrent()) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Camera preview could not be opened. Please retry.');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      await waitForCameraFrame(videoRef.current);
      if (!requestIsCurrent()) return;
      cameraOpened = true;
      setMode('preview');
      const vision = await import('@mediapipe/tasks-vision') as any;
      if (!requestIsCurrent()) return;
      const files = await vision.FilesetResolver.forVisionTasks(cameraAsset(import.meta.env.BASE_URL, 'wasm'));
      if (!requestIsCurrent()) return;
      filesRef.current = files;
      const model = await loadPoseModel(cameraAsset(import.meta.env.BASE_URL, 'models/pose_landmarker_lite.task'));
      if (!requestIsCurrent()) return;
      modelRef.current = model;
      try {
        const gpuDetector = await vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetBuffer: model, delegate: 'GPU' },
          canvas: trackingCanvas(),
          runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5,
        });
        if (!requestIsCurrent()) {
          gpuDetector.close?.();
          return;
        }
        detectorRef.current = gpuDetector;
        detectorDelegateRef.current = 'GPU';
        setDelegate('GPU');
      } catch (cause) {
        if (!requestIsCurrent()) return;
        console.warn('[Bayti camera] GPU unavailable; trying CPU', cameraFailure(cause));
        const cpuDetector = await vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetBuffer: model, delegate: 'CPU' },
          canvas: trackingCanvas(),
          runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5,
        });
        if (!requestIsCurrent()) {
          cpuDetector.close?.();
          return;
        }
        detectorRef.current = cpuDetector;
        detectorDelegateRef.current = 'CPU';
        cpuFallbackUsedRef.current = true;
        setDelegate('CPU');
      }
      frameAtRef.current = performance.now();
      baselineRef.current = null; centerRef.current = null; historyRef.current = [];
      updatePhase('Find a comfortable space');
      if (pausedRef.current) return;
      setMode('live');
      rafRef.current = requestAnimationFrame(frameLoop);
    } catch (cause) {
      if (!requestIsCurrent()) return;
      console.error('[Bayti camera] Startup failed', cameraFailure(cause));
      if (cameraOpened) {
        reportTrackingFailure(cause);
        return;
      }
      teardown();
      updateTrackingStatus('searching');
      const name = (cause as { name?: string })?.name;
      const message = name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser settings, then retry.' :
        name === 'NotFoundError' ? 'No camera was found on this device. Connect a camera or choose Demo Mode.' :
        name === 'NotReadableError' ? 'The camera is already being used by another app. Close it and retry, or choose Demo Mode.' :
        (cause as Error)?.message || 'The camera or pose model could not start. Check the local model files, then retry or choose Demo Mode.';
      setError(message); setMode('error');
    }
  };
  const stop = () => { teardown(); clearCelebration(); pausedRef.current = false; setDelegate(null); setTrackingError(''); updateTrackingStatus('searching'); setMode('ready'); updatePhase('Ready'); onStop?.(); };
  const pause = () => { clearCelebration(); cancelAnimationFrame(rafRef.current); if (state === 'live' || state === 'preview' || state === 'demo') pausedModeRef.current = state; pausedRef.current = true; setMode('paused'); };
  const resume = () => {
    pausedRef.current = false;
    if (pausedModeRef.current === 'demo') setMode('demo');
    else if (streamRef.current && detectorRef.current) {
      historyRef.current = []; baselineRef.current = null; calibrationStartedRef.current = null;
      centerRef.current = null; peakRiseRef.current = 0; cooldownRef.current = Date.now(); updatePhase('Ready');
      setMode('live'); rafRef.current = requestAnimationFrame(frameLoop);
    } else if (streamRef.current) setMode('preview'); else void startCamera();
  };
  const launchDemo = () => { teardown(); clearCelebration(); framesRef.current = { total: 0, visible: 0 }; setJumpRise({ last: null, previous: null }); pausedRef.current = false; setDelegate(null); setTrackingError(''); updateTrackingStatus('searching'); setError(''); setMode('demo'); updatePhase('Demo mode · tap when you complete a rep'); };
  useEffect(() => {
    if (externallyPaused && (state === 'live' || state === 'demo' || state === 'preview')) pause();
  }, [externallyPaused, state]);
  useEffect(() => {
    if (externallyPaused === false && state === 'paused') resume();
  }, [externallyPaused]);
  const reset = () => {
    changeReps(0);
    clearCelebration();
    setElapsed(0);
    framesRef.current = { total: 0, visible: 0 }; peakRiseRef.current = 0;
    setJumpRise({ last: null, previous: null });
    historyRef.current = [];
    lostAtRef.current = 0;
    cooldownRef.current = 0;
    baselineRef.current = null;
    calibrationStartedRef.current = null;
    centerRef.current = null;
    updatePhase(state === 'demo' || (state === 'paused' && pausedModeRef.current === 'demo')
      ? 'Demo mode · tap when you complete a rep' : 'Ready');
  };
  const time = `${Math.floor(elapsed/60).toString().padStart(2,'0')}:${(elapsed%60).toString().padStart(2,'0')}`;
  const active = state === 'live' || state === 'demo' || state === 'preview';
  return <section aria-label="Movement camera coach">
    <div className="card" style={{padding:14}}>
      <div className="exercise-toolbar">
        <label className="eyebrow" htmlFor="exercise-choice">Choose a movement</label>
        <button type="button" className="exercise-reset" onClick={reset} aria-label={`Reset ${exercise} reps`} title={`Reset only ${exercise} reps and timer for ${member}`}><RotateCcw size={15} aria-hidden="true"/> Reset reps</button>
      </div>
      <select id="exercise-choice" className="exercise-select" value={exercise} disabled={choices.length === 1} onChange={(e) => { clearCelebration(); const nextExercise = e.target.value as Exercise; exerciseRef.current = nextExercise; setExercise(nextExercise); const savedCount = initialCounts[nextExercise] ?? 0; repsRef.current = savedCount; setReps(savedCount); baselineRef.current = null; calibrationStartedRef.current = null; centerRef.current = null; updatePhase('Ready'); }}>
        {choices.map((item) => <option key={item} value={item}>{item.replace(/\b\w/g,(c)=>c.toUpperCase())}</option>)}
      </select>
      <div className="exercise-progress"><span><strong>{reps}</strong> saved reps</span><span>A sticker every 3 reps</span></div>
      <p className="exercise-reset-note">Reset clears only this movement’s reps and timer.</p>
      {targetReps !== undefined && <div className="coach-target" aria-label="Progress toward the exercise target"><span>{reps} / {targetReps} reps</span><progress max={targetReps} value={Math.min(targetReps, reps)} /></div>}
      {showExample && <CameraExerciseExample exercise={exercise} />}
      <p className="coach-visibility" aria-live="polite">{state === 'demo' ? 'Demo · no form or height analysis' : trackingStatus === 'tracking' ? 'Pose visible · move comfortably' : trackingStatus === 'lost' ? 'Pose not visible · step into view' : 'Waiting for a visible pose'}<small>Visibility feedback only, not a medical form assessment.</small></p>
      <p className="copy" style={{fontSize:12}}>Body tracing appears over your live image once MediaPipe finds you. Keep your whole body in view, with good lighting and space to move.</p>
      <div className={`camera-panel ${active ? 'is-active' : 'is-idle'}`} style={{marginTop:12}}>
        <video ref={videoRef} muted playsInline aria-label="Mirrored live camera preview" />
        <canvas ref={canvasRef} data-testid="camera-body-tracing" aria-hidden="true" />
        {celebration !== null && (state === 'live' || state === 'demo') && <ExerciseCelebration key={celebration} reps={celebration} onDone={clearCelebration}/>}
        {!active && <div style={{position:'absolute',inset:0,zIndex:1,display:'grid',placeItems:'center',background:'linear-gradient(145deg,#254b60,#142f3f)'}}>
          <div style={{textAlign:'center',padding:20,maxWidth:280}}>
            {state === 'loading' ? <><div className="camera-status" style={{display:'inline-flex'}}><Camera size={15}/> Starting camera</div><p style={{color:'#e6eee9'}}>Allow camera access in your browser’s permission prompt. Your video will appear here.</p><button className="button button-secondary" onClick={stop}>Cancel</button></> :
            state === 'error' ? <><div className="camera-status" style={{display:'inline-flex'}}>Camera unavailable</div><p style={{lineHeight:1.5,color:'#fff6ea'}}>{error}</p><button className="button button-secondary" onClick={() => void startCamera()}><RotateCcw size={16}/> Retry camera</button><button className="button" style={{marginTop:9,background:'#a4ddbd',color:'#17314d'}} onClick={launchDemo}>Use Demo Mode</button></> :
            state === 'paused' ? <><div className="camera-status" style={{display:'inline-flex'}}>Paused</div><p style={{color:'#e6eee9'}}>Take your time. Your rep count is saved.</p><button className="button button-secondary" onClick={resume}><Play size={16}/> Resume</button></> :
            <><div style={{width:60,height:60,border:'1px solid #ffffff77',borderRadius:'50%',display:'grid',placeItems:'center',margin:'0 auto 12px',color:'#a9edcf'}}><UserRound size={27}/></div><strong style={{fontSize:19}}>Make room to move</strong><p style={{lineHeight:1.5,color:'#e3eee8'}}>Bayti uses your camera to follow body landmarks and count movement reps. Video stays on this device and is not recorded or uploaded.</p>
              <button className="button button-secondary" onClick={() => permissionExplained ? void startCamera() : (setPermissionExplained(true), void startCamera())}><Camera size={16}/> Enable camera</button>
              <button className="button" style={{display:'flex',margin:'9px auto 0',background:'transparent',border:'1px solid #ffffff77'}} onClick={launchDemo}>Try Demo Mode</button></>}
          </div>
        </div>}
        <div className="camera-overlay">
          <div className="camera-overlay-left">
            <span className="camera-status"><span style={{width:8,height:8,background:active?'#9de1b6':'#d9c8a5',borderRadius:'50%'}} />{state === 'demo' ? 'Demo mode' : state === 'live' ? 'Live camera' : state === 'preview' ? 'Camera on' : state === 'paused' ? 'Paused' : 'Ready'}</span>
            {state === 'live' && <span className={`tracking-chip tracking-${trackingStatus}`} aria-live="polite">
              <span className="tracking-dot"/>{trackingStatus === 'tracking' ? `Tracking · ${delegate ?? 'AI'}` : trackingStatus === 'lost' ? 'Step back' : 'Finding you'}
            </span>}
            {state === 'preview' && <span className="tracking-chip" role="status"><span className="tracking-dot"/>{trackingError ? 'Tracking off' : 'Loading coach'}</span>}
          </div>
          <span className="timer-row"><Timer size={14}/>{time}</span>
        </div>
        <div className="camera-bottom">
          <div><div className="rep-count">{reps}</div><div style={{fontSize:11,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>reps · {phase}</div></div>
           {state === 'preview' ? <div className="advice-pill">{trackingError ? 'Reps are not being counted' : 'Loading movement tracking…'}</div> : active && <div className="advice-pill" key={adviceIndex}>{ADVICE[adviceIndex]}</div>}
        </div>
      </div>
      {trackingError && <div className="tracking-error" role="alert">
        <p>{trackingError}</p>
        <button className="button button-secondary" onClick={() => void startCamera()}><RotateCcw size={16}/> Retry tracking</button>
        <button className="button button-secondary" onClick={launchDemo}>Use Demo Mode</button>
      </div>}
      {(error || trackingError) && <a className="button button-secondary" style={{marginTop:10}} href={`${import.meta.env.BASE_URL}camera-test`} target="_blank" rel="noopener noreferrer">Open camera in a separate tab</a>}
      {state === 'demo' && <button className="button full" style={{marginTop:12,background:'#d9eee2',color:'#17264D'}} onClick={() => { countRep(); updatePhase('Demo rep counted'); }}>Tap to count</button>}
      <div className="camera-controls" style={{marginTop:12}}>
        <button onClick={state === 'paused' ? resume : pause} disabled={!active && state !== 'paused'}>{state === 'paused' ? <Play size={14}/> : <Pause size={14}/>} {state === 'paused' ? 'Resume' : 'Pause'}</button>
        <button onClick={stop} disabled={state === 'ready'}><Square size={14}/> Stop</button>
      </div>
      {state === 'ready' && !permissionExplained && <p className="copy" style={{fontSize:12,margin:'10px 2px 0'}}>Your camera is not on yet. We explain why it’s needed before asking for access.</p>}
      <p className="copy" style={{fontSize:11,margin:'10px 2px 0'}}>Move at your own pace. Stop if something hurts. Bayti Balance is an educational prototype. It does not diagnose medical conditions or replace advice from a qualified professional.</p>
    </div>
  </section>;
}
