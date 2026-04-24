# Phosphor 78 — the game

> A museum-grade browser replica of 1978 Taito _Space Invaders_.
> WebGL CRT shader + Web Audio oscillator-graph chip synthesis +
> ROM-cited gameplay constants — three pillars built independently
> and joined at the seams.

This document covers the implemented artifact: what it does, how
it's structured, what each module is responsible for. For the
meta-story (this project is a BMAD end-to-end practice run), see
[bmad-practice.md](bmad-practice.md).

**Status**: ✅ v1 candidate (see [v1 checklist](v1-checklist.md))
**Platform**: desktop browsers (Chrome / Firefox / Safari, recent)
**Stack**: TypeScript 6 strict / Vite 8 / Vitest 4 / Playwright 1

<p align="center">
  <img src="screenshots/01-title.png" alt="Title screen — PHOSPHOR 78 in green phosphor, PRESS ENTER, © 1978 TAITO homage" width="280">
  &nbsp;
  <img src="screenshots/02-formation.png" alt="Wave 1 — full 5×11 formation visible, UFO crossing the top, four shields intact" width="280">
  &nbsp;
  <img src="screenshots/03-action.png" alt="Mid-wave action — formation marching, player firing, shields visible" width="280">
</p>

## What you can do today

- Run `pnpm dev` and play a full Space Invaders round: shoot the
  squid / crab / octopus formation down (each kill awards
  30 / 20 / 10 per ROM table, with a brief explosion sprite),
  hide behind the eroding shields (each hit carves a bullet-shaped
  chunk; descending aliens chew a trail through the bunker),
  intercept the UFO for cycle-table-determined points, die three
  times to game-over and press Enter to restart.
- Open `/behind-the-scenes/` to read 4000 words of teaching
  prose (English or Chinese — toggle in the header), drag 9 live
  sliders, hear 6 per-event synths, watch the audio clock advance
  in real time, and scope each waveform.

## Three pillars

### 1. Looks like a 1978 CRT

WebGL2 pipeline: scene canvas → off-screen RGBA16F framebuffer →
phosphor-persistence ping-pong → composite shader → main canvas.
Three composite tiers (Low / Mid / High) compiled at build time;
the runtime tier-walk picks one from URL `?tier=` override,
localStorage save, or the GPU capability probe. Effects: barrel
curvature, scanline darkening, aperture grille mask, halation
bloom, chromatic aberration. See
[CRT shader chapter](../src/companion/content/crt-shader.md).

### 2. Sounds like 1978

Custom AudioWorklet oscillator with SN76477-style "circuit heat"
(per-cycle dither, soft pre-clip, asymmetric triangle, LFSR
noise). Sample-accurate ADSR envelope worklet. Six per-event
synths (march, shoot, explosion, invader-killed, UFO, UFO-killed)
each with a distinct LFSR seed. Bundle contains zero audio files.
See [chip-synth chapter](../src/companion/content/chip-synth.md).

### 3. Plays like 1978

Every gameplay constant is cited to its address in the
[ComputerArcheology disassembly](https://computerarcheology.com/Arcade/SpaceInvaders/).
The march tempo table, the saucer-scoring cycle (including its
famous off-by-one bug), the shield bitmap, the alien score
values — all bit-exact from the ROM dump frozen at git tag
`reference-snapshot-v1`. The audio clock is the master; the frame
loop is the slave. See
[timing chapter](../src/companion/content/timing.md).

## Quick start

```bash
pnpm install
pnpm dev          # game on http://localhost:5173
pnpm test         # unit tests (396 passing)
pnpm test:e2e     # Playwright e2e (16 passing)
pnpm build        # production bundle (~70KB total, ~16KB gzipped companion)
```

## Architecture

Domain-driven 5-layer source tree:

```
src/
├── foundation/    # WebGL ctx, framebuffer, shader helpers, pixel pipeline
├── render/        # CRT pipeline, passes, scene rasterizer, tunables
├── audio/         # AudioClock, AudioWorklets, per-event synths, engine
├── game/          # Pure reducer + sub-reducers (CR1: no side effects)
├── persistence/   # localStorage save schema with version migration
├── boot/          # capability probe, degradation walk
├── companion/     # behind-the-scenes page (sliders, vizualizers, prose)
├── constants/     # ROM-cited gameplay constants (with coverage test)
├── util/          # Result, log, mini-signal store, coords
└── types/         # GameState / events / clock interface
```

Architectural boundaries enforced by ESLint (story 1.2):

- `game/` cannot import `render/` `audio/` `companion/` `debug/`
- `import/no-default-export` everywhere except config files
- `import/no-relative-parent-imports` everywhere

The full architecture document — 11 ADRs, 8 cross-cutting
concerns, 13 systems, 8 architectural boundaries (AB1-AB8),
14 consistency rules (CR1-CR14) — lives at
[\_bmad-output/game-architecture.md](../_bmad-output/game-architecture.md).

## Acknowledgments

- **Tomohiro Nishikado** — designed Space Invaders in 1978 at
  Taito and changed everything.
- **Chris Cantrell** — reverse-engineered the ROM and published
  it as [ComputerArcheology](https://computerarcheology.com/Arcade/SpaceInvaders/).
  Without his disassembly + commentary this project would have
  been a guess.
- **Timothy Lottes** — the barrel-curvature CRT shader pattern
  this project's composite stage is built on.
- **TroggleMonkey & libretro contributors** —
  [CRT-Royale](https://github.com/libretro/slang-shaders) was
  the second main reference for the shader stack.
- **Ken Shirriff** — die-level reverse-engineering of the
  SN76477 sound chip informed the AudioWorklet's "circuit heat"
  decisions.
- **Chris Wilson** — _A Tale of Two Clocks_ is the canonical
  reference for the lookahead-scheduler pattern audio uses.

The full reference snapshot (ComputerArcheology HTML, libretro
shader sources, original audio recording, CRT close-up photos)
lives at git tag `reference-snapshot-v1`. See
[references/README.md](../references/README.md) for what's
archived and the legal status of each file.

## Legal

Phosphor 78 is an **unofficial homage / educational study piece**
of the 1978 Taito _Space Invaders_ arcade game. It is not
affiliated with, endorsed by, or licensed by Taito Corporation
or Square Enix.

- **Non-commercial** — personal portfolio and educational use only
- All trademarks, character designs, and gameplay concepts of
  _Space Invaders_ remain the property of Taito Corporation
- This repository's source code does not include any original
  Taito assets
- The shield bitmap and march-tempo table are reproduced from
  ComputerArcheology's published disassembly under fair-use
  educational interpretation
- A user-supplied original audio recording lives at
  `references/audio/youtube-longplay-source-B.mp3` for spectrum
  analysis only; it is not bundled into the build
- Takedown requests will be responded to promptly

No license is granted to derivative works of the original Space
Invaders IP. The project's own original code (everything in
`src/` and the inline shader sources, etc.) is unlicensed pending
v1 publish.
