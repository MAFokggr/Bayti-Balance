import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraAsset, cameraFailure, loadPoseModel } from './camera-runtime';

test('camera assets stay within the artifact base path', () => {
  assert.equal(cameraAsset('/', '/wasm'), '/wasm');
  assert.equal(cameraAsset('/family/', 'models/pose.task'), '/family/models/pose.task');
  assert.equal(cameraAsset('/family', '/wasm'), '/family/wasm');
});

test('camera errors preserve actionable exception details', () => {
  const error = new Error('Permission denied');
  error.name = 'NotAllowedError';
  assert.equal(cameraFailure(error), 'NotAllowedError: Permission denied');
});

test('pose loader rejects an HTML fallback instead of passing it to MediaPipe', async () => {
  const fetchBefore = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html>not a model</html>', { headers: { 'content-type': 'text/html' } });
  try { await assert.rejects(loadPoseModel('/models/pose.task'), /returned a page/); }
  finally { globalThis.fetch = fetchBefore; }
});
