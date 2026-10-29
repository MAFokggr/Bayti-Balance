/** MediaPipe assets are served locally, relative to this app's preview path. */
export function cameraAsset(base: string, path: string) {
  return `${base.replace(/\/?$/, '/')}${path.replace(/^\//, '')}`;
}

export function cameraFailure(cause: unknown) {
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`;
  return String(cause);
}

export async function waitForCameraFrame(video: HTMLVideoElement) {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return;
  await new Promise<void>((resolve, reject) => {
    const check = () => {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener('loadeddata', check);
      video.removeEventListener('resize', check);
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('The camera opened but did not send a video frame. Close other camera apps and retry.'));
    }, 10000);
    video.addEventListener('loadeddata', check);
    video.addEventListener('resize', check);
    check();
  });
}

export async function loadPoseModel(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The local pose model could not load (${response.status}). Reload the app and retry.`);
  if (response.headers.get('content-type')?.includes('text/html')) {
    throw new Error('The pose model URL returned a page instead of a model. Reload the app and retry.');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 1024) throw new Error('The local pose model is incomplete. Reload the app and retry.');
  return bytes;
}
