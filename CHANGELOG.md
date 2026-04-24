# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Repository documentation: README, LICENSE, CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT,
  SECURITY, SUPPORT, CREDITS, CONTROLS, BUILD, MODDING, ASSETS_LICENSE, THIRD_PARTY_NOTICES.
- **Phase 1 — enhancement foundation.**
  - New `src/game.html` source template; `code` is now the generated artifact.
  - New `build.mjs` (Node 18+, zero deps) resolving `INLINE:FILE`,
    `INLINE:ASSET`, `INLINE:SFXR`, and `INLINE:VERSION` markers idempotently.
  - New `assets/{sfx,music,sprites}/` directories with planning READMEs for
    Phase 2 / Phase 3 content.
  - `Config` module persists settings to `localStorage` under
    `aw1977.config.v1` (CRT toggle, shake, reduced-motion, volume, colorblind,
    high scores). `reducedMotion` already halves particle counts; other keys
    are consumed in Phase 2+.
  - `Audio` stub module reserves the sound API surface for Phase 2.
  - Script reorganized into labelled sections (CONFIG, AUDIO, RENDER,
    INPUT, ENTITIES, UI, ENGINE) so later phases have clear drop-in points.
  - Build version stamp emitted to the JS console on boot.
- **Phase 5 — player features.**
  - Gamepad support via the native HTML5 Gamepad API (vendor
    gamecontroller.js / joypad.js credited as references). Left stick
    + D-pad = movement, A/RT = fire, B/X = bomb. Haptic rumble on bomb
    (0.9, 300ms) and on taking damage (1.0, 400ms). Toasts on connect
    and disconnect.
  - Combo system: chain enemy kills within ~2s to raise a score
    multiplier up to x4. On-screen chain counter + decay bar above the
    top bar. Combo resets on player damage.
  - Weapon variants: STANDARD (existing, now 5 levels), SPREAD (wide
    fan that grows with level), LASER (piercing vertical beams — SHOT
    pickups become far more powerful), HOMING (bullets that track the
    nearest enemy / boss). New `WEAPON` power-up rolls a random type
    different from the current one. HUD shows the current weapon's
    4-letter abbreviation next to the level.
  - 2P revive: when a co-op player runs out of lives their wreck
    persists for 15s. The surviving teammate can stand within 32px of
    it for 3s to revive them with 1 life (progress ring + sparkles).
    Game-over is suppressed while a wreck is still revivable.
  - Key rebinding: new `KEY BINDINGS` screen under Options. Highlight
    an action, press Enter, then press any key — that key becomes the
    binding. Key autorepeat is guarded so holding Enter doesn't
    accidentally bind to Enter. `RESET BINDINGS` restores defaults.
  - `DEFAULT_BINDINGS` + `Config.bindings` replace the previous
    hard-coded input checks; persistence is seamless with Phase 4
    settings storage.
- **Phase 4 — UX / UI.**
  - Main menu extended with `OPTIONS` and `HIGH SCORES` entries; vendor
    version stamp visible at the bottom.
  - New `OPTIONS` screen: live sliders for Master/Music/SFX volume,
    CRT mode (webgl / css / off), screen-shake, slow-mo toggle,
    reduced-motion toggle, colorblind palette stub, and a
    `RESET DEFAULTS` action. Changes persist via `Config`.
  - New `HIGH SCORES` screen: top-10 per difficulty, switch tabs with
    left/right. Scores stored in `Config.highScores` under
    `aw1977.config.v1`; capped at 200 entries total.
  - New `NAME_ENTRY` screen: 3-initial entry when a run qualifies for
    the current difficulty's top-10. Up/Down to change letter, Left/Right
    to move cursor, Enter to confirm.
  - `Toast` queue replaces the single flash-message banner: stacks
    multiple notifications (wave transitions, power-ups, saved scores)
    with slide-in / slide-out animation.
  - HUD now shows an odometer-style animated score that lerps toward the
    real value — a small arcade touch.
  - Damage vignette: red radial gradient during invulnerability frames
    and a pulsing low-lives warning.
  - Bug fix: game-over screen no longer crashes when rendering 2P
    per-player scores (was calling `.padStart` on a number).
  - Back navigation via `Esc` now works on MODE/OPTIONS/HIGHSCORES.
- **Phase 3 — graphics.**
  - WebGL CRT post-process (`CRT` module): scanlines, barrel curvature,
    bloom, vignette, chromatic aberration, flicker. GLSL adapted from
    `vendor/webgl-crt-shader/CRTShader.js`; targets WebGL1 (not Three.js).
    Toggleable via `Config.crt` (`webgl` | `css` | `off`). Falls back to
    CSS overlay if WebGL init fails.
  - `Camera` module: screen shake, hit flash, slow-motion, all scaled by
    `Config.shake` / `Config.slowMo` / `Config.reducedMotion`.
  - `Confetti` module: boss-kill and stage-clear bursts (DIY, ~40 lines).
  - `Particle` class upgraded with trails, gravity/drag, color-over-life,
    and streak/square/circle shapes. `explode()` now spawns both debris
    and fast streak shards. New `thruster()` emits trailed engine
    particles.
  - Parallax starfield: 3 layers (far / mid / near) at different scroll
    speeds, plus 3 soft nebula blobs behind them.
  - Bullets now glow, leave a short trail, and have a bright core.
  - Boss phase changes (50% HP, 25% HP) now trigger an explosion pulse,
    camera shake, chromatic aberration, and a warn SFX.
  - Impact hooks: bomb = shake+flash+aberration, player death =
    shake+flash+slow-mo+aberration, enemy death = small shake,
    boss kill = shake+flash+slow-mo+aberration+confetti.
- **Phase 2 — sound.**
  - Inline sfxr-schema-compatible WebAudio synth (`synthSfxr`) renders
    parameter files from `assets/sfx/` into `AudioBuffer`s at boot.
  - 11 SFX presets: `shoot`, `shoot_powered`, `hit_enemy`, `hit_player`,
    `explode_small`, `explode_big`, `powerup`, `bomb`, `menu_move`,
    `menu_confirm`, `boss_warn`.
  - WebAudio bus: master → music / sfx gain nodes, volumes driven by
    `Config` (`volMaster`, `volMusic`, `volSfx`).
  - `Audio.duck(amount, ms)` briefly dips the music bus on bomb / player
    death / boss death.
  - Procedural chiptune music engine schedules square/saw/triangle
    oscillator notes. Three looping tracks (menu, stage, boss) swap on
    menu → stage → boss-warn → boss-dead transitions and stop on game over.
  - AudioContext is created lazily on first user gesture (complies with
    browser autoplay policy) and resumes if suspended.
  - `vendor/sfxr.js` (MIT) credited as schema source in CREDITS.md and
    THIRD_PARTY_NOTICES.md even though its runtime code isn't bundled.

## [0.1.0] - 2026-04-24

### Added
- Initial single-file HTML build of *1977 — Aircraft Warfare*.
- 1P and 2P local co-op with keyboard and touch controls.
- Three difficulty tiers: NOVICE, INTERMEDIATE, ADVANCED.
- Four power-up types: SHOT, SPEED, SHIELD, BOMB.
- Enemy roster and boss fights.
- CRT scanline + vignette overlay.

[Unreleased]: https://github.com/khaaliswooden-max/1977/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/khaaliswooden-max/1977/releases/tag/v0.1.0
