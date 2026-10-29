import { createReadStream, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** Serve the installed MediaPipe runtime, including non-SIMD browser support.
 * Generated binary assets stay in ignored build output, not in source control.
 */
export function localVisionAssets(): Plugin {
  const directory = path.join(path.dirname(fileURLToPath(import.meta.resolve('@mediapipe/tasks-vision'))), 'wasm');
  const names = readdirSync(directory).filter(name => /^vision_wasm_(nosimd_)?internal\.(js|wasm)$/.test(name));
  return {
    name: 'bayti-local-vision-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? '';
        const name = pathname.startsWith('/wasm/') ? pathname.slice('/wasm/'.length) : '';
        if (!names.includes(name)) return next();
        res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
        res.setHeader('Cache-Control', 'no-cache');
        const stream = createReadStream(path.join(directory, name));
        stream.on('error', next);
        stream.pipe(res);
      });
    },
    generateBundle() {
      for (const name of names) {
        this.emitFile({ type: 'asset', fileName: `wasm/${name}`, source: readFileSync(path.join(directory, name)) });
      }
    },
  };
}
