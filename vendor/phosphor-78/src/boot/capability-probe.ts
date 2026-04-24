// CC7 + AR18: Single-shot capability probe at boot.
// Cache results to localStorage so repeat boots skip redundant work.

import {
  createWebGL2Context,
  hasColorBufferFloat,
} from '@/foundation/webgl-context';
import { log } from '@/util/log';

const CACHE_KEY = 'phosphor-78:capabilities:v1';

export type GpuTier = 'low' | 'mid' | 'high';

export interface Capabilities {
  readonly webgl2: boolean;
  readonly colorBufferFloat: boolean;
  readonly sab: boolean;
  readonly gpuTier: GpuTier;
  readonly gpuRenderer: string;
  readonly refreshRateHz: number;
  readonly devicePixelRatio: number;
  readonly audioBaseLatencyMs: number | null;
  readonly probedAt: number;
}

export interface ProbeOptions {
  /** Bypass localStorage cache (default false). */
  readonly skipCache?: boolean;
  /** AudioContext to inspect for latency. Created lazily if omitted. */
  readonly audioContext?: AudioContext | null;
}

export function loadCachedCapabilities(): Capabilities | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Capabilities;
  } catch (e) {
    log.warn('capability cache read failed', e);
    return null;
  }
}

export function saveCachedCapabilities(c: Capabilities): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch (e) {
    log.warn('capability cache write failed', e);
  }
}

export function probe(opts: ProbeOptions = {}): Capabilities {
  if (!opts.skipCache) {
    const cached = loadCachedCapabilities();
    if (cached) {
      log.info('using cached capabilities', cached);
      return cached;
    }
  }

  // WebGL2 + RGBA16F support, via a throwaway canvas.
  const probeCanvas = document.createElement('canvas');
  const ctx = createWebGL2Context(probeCanvas, { preferHighPrecision: true });
  let webgl2 = false;
  let colorBufferFloat = false;
  let gpuRenderer = 'unknown';
  if (ctx.kind === 'ok') {
    webgl2 = true;
    const gl = ctx.value.gl;
    colorBufferFloat = hasColorBufferFloat(gl);
    gpuRenderer = readRendererString(gl);
  }

  const sab = isSharedArrayBufferAvailable();
  const refreshRateHz = readRefreshRate();
  const audioBaseLatencyMs = readAudioBaseLatency(opts.audioContext ?? null);
  const gpuTier = inferGpuTier(gpuRenderer);

  const caps: Capabilities = {
    webgl2,
    colorBufferFloat,
    sab,
    gpuTier,
    gpuRenderer,
    refreshRateHz,
    devicePixelRatio: window.devicePixelRatio,
    audioBaseLatencyMs,
    probedAt: Date.now(),
  };

  saveCachedCapabilities(caps);
  log.info('probed capabilities', caps);
  return caps;
}

function readRendererString(gl: WebGL2RenderingContext): string {
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  if (!dbg) return 'unknown';
  try {
    return String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
  } catch {
    return 'unknown';
  }
}

function isSharedArrayBufferAvailable(): boolean {
  if (typeof SharedArrayBuffer === 'undefined') return false;
  // crossOriginIsolated guards SAB writability in modern browsers.
  return Boolean((globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated);
}

function readRefreshRate(): number {
  // window.screen.refreshRate is non-standard; fall back to 60.
  const screenWithRR = window.screen as Screen & { refreshRate?: number };
  return Number.isFinite(screenWithRR.refreshRate) && screenWithRR.refreshRate
    ? screenWithRR.refreshRate
    : 60;
}

function readAudioBaseLatency(ctx: AudioContext | null): number | null {
  if (!ctx) return null;
  const lat = ctx.baseLatency;
  return typeof lat === 'number' && Number.isFinite(lat) ? lat * 1000 : null;
}

/**
 * Heuristic GPU tier from the renderer string. This is intentionally
 * simple: integrated/Intel/Apple-low → low, high-end discrete → high,
 * everything else → mid. Refined by frame-time samples in story 4.6
 * once we have a real renderer.
 */
export function inferGpuTier(renderer: string): GpuTier {
  const r = renderer.toLowerCase();
  if (
    r.includes('rtx') ||
    r.includes('rx 7') ||
    r.includes('rx 6') ||
    r.includes('m1 max') ||
    r.includes('m1 ultra') ||
    r.includes('m2 max') ||
    r.includes('m2 ultra') ||
    r.includes('m3 max') ||
    r.includes('m3 ultra')
  ) {
    return 'high';
  }
  if (
    r.includes('intel') ||
    r.includes('uhd') ||
    r.includes('hd graphics') ||
    r.includes('iris') ||
    r.includes('mali') ||
    r.includes('adreno') ||
    r.includes('powervr')
  ) {
    return 'low';
  }
  return 'mid';
}
