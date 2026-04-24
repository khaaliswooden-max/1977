// Story 4.2 + 4.6 — WebGL2 render pipeline with tier degradation.
//
// Each frame:
//   1. The scene rasterizer draws GameState into a hidden 224x256
//      Canvas2D (the M1 placeholder painting code, untouched).
//   2. SourceUploadPass uploads that canvas as a GL texture and
//      renders it into a framebuffer.
//   3. PersistencePass mixes the current frame with the previous
//      output via phosphor decay (the iconic CRT glow tail).
//   4. CompositePass blits the persistence result to the main
//      canvas using the active CRT tier (low / mid / high).
//
// Tier selection (story 4.6):
//   1. Read user preference from localStorage (settings.shaderTier).
//   2. URL ?tier=high|mid|low overrides if present.
//   3. Otherwise infer from capability probe (GPU tier).
//   4. Try chosen tier; on failure walk down high -> mid -> low.
//   5. If all 3 fail, fall back to the Canvas2D direct path.
// activeShaderTier signal is updated to whatever finally won, so
// the debug overlay (story 5.x) and companion page can display it.

import { createWebGL2Context } from '@/foundation/webgl-context';
import { activeShaderTier, type ShaderTier } from '@/boot/degradation';
import { type Capabilities } from '@/boot/capability-probe';
import {
  createCompositePass,
  type CompositePass,
  type CrtTier,
} from '@/render/passes/composite';
import {
  createPersistencePass,
  type PersistencePass,
} from '@/render/passes/persistence';
import {
  createSourceUploadPass,
  type SourceUploadPass,
} from '@/render/passes/source-upload';
import { createSceneRasterizer } from '@/render/scene';
import type { GameState } from '@/types/game';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '@/util/coords';
import { log } from '@/util/log';
import { isErr } from '@/util/result';
import { load, type ShaderTier as PersistedTier } from '@/persistence/save';

export interface Renderer {
  draw(state: GameState): void;
  dispose(): void;
}

export interface RendererOptions {
  /** Capability probe result (story 1.7). Used to default the tier
   *  when the user has no saved preference. */
  readonly capabilities?: Capabilities | null;
  /** Override the URL-derived tier (test seam). */
  readonly tierOverride?: CrtTier;
}

const TIER_ORDER: readonly ShaderTier[] = ['high', 'mid', 'low'] as const;

export function createRenderer(
  canvas: HTMLCanvasElement,
  opts: RendererOptions = {},
): Renderer {
  const scene = createSceneRasterizer();

  const ctxResult = createWebGL2Context(canvas);
  if (isErr(ctxResult)) {
    log.warn(
      'WebGL2 unavailable; falling back to Canvas2D direct render',
      ctxResult.error,
    );
    return canvas2dFallback(canvas, scene);
  }
  const gl = ctxResult.value.gl;

  const upload = createSourceUploadPass(gl, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  if (isErr(upload)) {
    log.warn('source-upload pass failed; falling back', upload.error);
    return canvas2dFallback(canvas, scene);
  }
  const persistence = createPersistencePass(gl, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  if (isErr(persistence)) {
    log.warn('persistence pass failed; falling back', persistence.error);
    upload.value.dispose();
    return canvas2dFallback(canvas, scene);
  }

  const preferredTier = pickPreferredTier(opts);
  const composite = walkTiers(gl, preferredTier);
  if (composite === null) {
    log.error('all CRT tiers failed; falling back to Canvas2D');
    upload.value.dispose();
    persistence.value.dispose();
    return canvas2dFallback(canvas, scene);
  }

  activeShaderTier.set(composite.tier);
  log.info(
    `webgl2 pipeline active: tier=${composite.tier}, color=${ctxResult.value.colorFormat}`,
  );

  return makeWebglRenderer(canvas, scene, upload.value, persistence.value, composite);
}

function makeWebglRenderer(
  canvas: HTMLCanvasElement,
  scene: ReturnType<typeof createSceneRasterizer>,
  upload: SourceUploadPass,
  persistence: PersistencePass,
  composite: CompositePass,
): Renderer {
  // Story 5.12: clear the persistence ping-pong buffers when the
  // game-mode kind changes so the GAME OVER (or title) text doesn't
  // leave a phosphor trail across the next state. Tracked here in
  // the renderer rather than in the reducer so render code stays
  // the only owner of GPU-side state.
  let lastModeKind: string | null = null;
  return {
    draw(state) {
      if (state.mode.kind !== lastModeKind) {
        if (lastModeKind !== null) persistence.clear();
        lastModeKind = state.mode.kind;
      }
      scene.draw(state);
      const currentFrame = upload.upload(scene.canvas);
      const persisted = persistence.apply(currentFrame);
      composite.draw(persisted, canvas.width, canvas.height);
    },
    dispose() {
      composite.dispose();
      persistence.dispose();
      upload.dispose();
    },
  };
}

/** Walk preferred -> next-down until one compiles. Null if all fail. */
function walkTiers(
  gl: WebGL2RenderingContext,
  preferred: CrtTier,
): CompositePass | null {
  const start = TIER_ORDER.indexOf(preferred);
  for (let i = start; i < TIER_ORDER.length; i++) {
    const tier = TIER_ORDER[i] as CrtTier;
    const r = createCompositePass(gl, tier);
    if (isErr(r)) {
      log.warn(`composite tier ${tier} failed`, r.error);
      continue;
    }
    return r.value;
  }
  return null;
}

/** Resolve the preferred tier given user prefs, URL, capabilities. */
export function pickPreferredTier(opts: RendererOptions): CrtTier {
  // 1. Explicit override beats everything (test seam).
  if (opts.tierOverride) return opts.tierOverride;

  // 2. URL ?tier=...
  const fromUrl = readTierFromURL();
  if (fromUrl) return fromUrl;

  // 3. localStorage saved preference.
  const fromSave = readTierFromSave();
  if (fromSave) return fromSave;

  // 4. Capability-derived default.
  if (opts.capabilities) {
    return opts.capabilities.gpuTier;
  }

  // 5. Mid is the safe middle when we know nothing.
  return 'mid';
}

function readTierFromURL(): CrtTier | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const v = url.searchParams.get('tier');
    if (v === 'low' || v === 'mid' || v === 'high') return v;
  } catch {
    // Ignore (e.g. opaque URL).
  }
  return null;
}

function readTierFromSave(): CrtTier | null {
  // Only honor the saved tier if the user has actually written one
  // (i.e. localStorage has the key). load() returns DEFAULT_SAVE
  // when the key is missing, which would mask the capability
  // fallback if we trusted it unconditionally.
  if (typeof localStorage === 'undefined') return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem('phosphor-78:save:v1');
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const save = load();
    const t: PersistedTier = save.settings.shaderTier;
    if (t === 'low' || t === 'mid' || t === 'high') return t;
  } catch {
    // load() is already supposed to soft-fail.
  }
  return null;
}

function canvas2dFallback(
  canvas: HTMLCanvasElement,
  scene: ReturnType<typeof createSceneRasterizer>,
): Renderer {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('invariant: 2d fallback ctx unavailable');
  ctx.imageSmoothingEnabled = false;
  // Mark the active tier as null-ish so the debug overlay knows
  // we're in fallback mode.
  activeShaderTier.set(null);
  return {
    draw(state) {
      scene.draw(state);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(scene.canvas, 0, 0, canvas.width, canvas.height);
    },
    dispose() {},
  };
}

// Back-compat alias for any caller still importing the M1 name.
export const createPlaceholderRenderer = createRenderer;
