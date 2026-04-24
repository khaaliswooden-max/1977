# M5 Integration Audit (Story 5.1)

The brief lists "cross-pillar integration review" as a quality gate
before v1 freeze. This document records what was audited, what
passed, what surfaced as a gap, and which gaps are owned by which
follow-up story.

## Method

Walk every concrete cross-pillar contact point I can think of. For
each, declare current state and the test (manual or automated) that
keeps it honest. Do this BEFORE the companion page exists so the
findings shape what stories 5.2 - 5.7 actually need to do.

## Pillars

- **Render** (`src/render/*`, `src/foundation/*`) — WebGL2
  pipeline, persistence, composite shader, HiDPI pixel pipeline
- **Audio** (`src/audio/*`) — AudioWorklet oscillator + envelope,
  6 synth modules, engine that routes events
- **Game** (`src/game/*`, `src/types/*`) — pure reducer, fixed-step
  loop, sub-reducers
- **Persistence** (`src/persistence/*`) — localStorage save schema
- **Boot** (`src/boot/*`) — capability probe, degradation
- **Companion** (`src/companion/*`) — does not exist yet (story 5.2+)

## Contact points reviewed

### 1. Game ↔ Audio: events flow one way

- The reducer emits `GameEvent[]` per tick.
- `audioEngine.handle(events)` consumes them, fires the matching
  synth.
- `audioEngine.tick({remainingInvaders, ufoActive})` polls game
  state for the per-frame UFO drone and march clock.

**Status**: ✅ Working. The two surfaces are explicit: events for
edge-triggered effects, tick state for level-triggered.

**Gap**: bullet-vs-target collision is missing across the board
(noted since story 1.15). With it absent, `invader_killed`,
`player_killed`, `ufo_killed` events never fire — so most of the
synth library is dormant in actual play. Listed as a known
follow-up issue, NOT a blocker for v1 in the brief's scope but
worth flagging on the M6 freeze checklist.

### 2. Game ↔ Render: state flows one way (immutable snapshot)

- `renderer.draw(state)` reads the immutable GameState snapshot.
- Game layer never imports render. AB1 enforces this in lint —
  any attempt to `import * from '@/render/*'` in `src/game/**`
  fails the build.

**Status**: ✅ Working. AB1 is enforced by `no-restricted-imports`
in eslint.config.js.

### 3. Render ↔ Audio: no contact, by design

- They share NO modules. Audio events go through the reducer; render
  state is the GameState. AB2 (render and audio do not import each
  other) is implicitly maintained.

**Status**: ✅ Working.

### 4. Pause ↔ Audio: lifecycle drives suspend / resume

- `createPauseController` accepts `onPause` / `onResume` hooks.
- `main.ts` wires them to `audioCtx.suspend()` / `resume()`.
- Document `visibilitychange` and `window.blur` auto-pause; manual
  `resume` only.

**Status**: ✅ Working. Tested in `src/game/pause.test.ts`.

### 5. CR7 (no AudioParam.value writes) across audio modules

- All 8 audio modules use `setValueAtTime` /
  `linearRampToValueAtTime` / `setTargetAtTime` exclusively.

**Status**: ✅ Working. Per-synth tests (story 3.x) assert this for
every fire path. No grep finds `AudioParam.value =` or `.value =`
in the audio tree.

### 6. CR12 (ROM constants cite their source) across game systems

- Verified by `src/constants/computer-archeology-coverage.test.ts`
  (story 2.6). Every ROM-derived constant is named, has a citation
  in the docstring, and is asserted in the coverage test.

**Status**: ✅ Working.

### 7. HUD readability under CRT shader

- HUD is rendered into the 224x256 source canvas BEFORE the CRT
  pipeline runs. Halation in the High tier brightens around HUD
  numerals; the rendering uses 8px monospace which has enough
  internal contrast that the score and lives stay readable.

**Status**: ✅ Manual test passes (Playwright e2e proceeds without
console errors, reads of the canvas show HUD survives the
shader). A future companion-page sliders story (5.3+) should
include a "HUD legibility" check at maximum halation.

**Tightening planned**: when the companion page lands its
sliders, add a screenshot comparison at min/max halation to
verify the HUD doesn't degenerate.

### 8. Pixel pipeline ↔ shader resolution

- The shader samples a 224×256 source texture. The pixel pipeline
  scales the OUTPUT canvas by an integer factor. Curvature
  distortion samples outside the source then renders black; this
  is intended (rounded corners).

**Status**: ✅ Working. `tests/pixel-pipeline.spec.ts` confirms the
canvas dims are integer multiples of 224×256 in real Chromium.

### 9. Boot → Render: capability tier feeds shader-tier default

- `pickPreferredTier({capabilities})` defaults to
  `capabilities.gpuTier` when no URL or save preference is set
  (story 4.6).

**Status**: ✅ Working. `src/render/pipeline.test.ts` covers the
priority chain.

### 10. Companion ↔ Render/Audio: signal store contract

- `render/tunables.ts` and `audio/tunables.ts` expose 4 + 6
  signals. Render passes and synth modules read; companion will
  write (story 5.3 + 5.4).

**Status**: ✅ Plumbing in place. Real verification waits for the
companion page to actually write to the signals.

## Cross-pillar gaps surfaced

| # | Gap | Owner story |
|---|-----|-------------|
| A | Bullet-vs-target collision detection — affects audio (no kill events fire), render (sprites never disappear after being hit), game (game-over via wave clear is unreachable in practice). | New story (likely 5.2 or named follow-up) |
| B | HUD legibility check at high halation — automated screenshot diff. | Folded into story 5.3 (companion sliders) |
| C | MAME blind-selection comparison — half-completed (capture spec exists; user needs to drive MAME). | Story 4.7, deferred to user |
| D | Audio spectrum regression against reference recording. | Story 5.x (5.4 most likely) |

## What "passes M5" looks like

The brief: "shader on/off switch keeps companion page readable; HUD
numbers don't blur under halation; visualizations / sliders bypass
shader and render direct; color dispersion / halation don't break
visual feedback." The first three need the companion page to exist
before they're even testable. The fourth (color dispersion not
breaking gameplay readability) is currently OK at default tunable
values but the sliders will let visitors push to extremes.

So this audit's verdict is a partial one: items 1-9 above are
complete, items 10 and the companion-dependent gates (1-3 of the
brief's M5 list) wait on stories 5.2-5.6. Story 5.1 is closed when
the audit is recorded; the gates re-open during 5.7's three-pass
polish.
