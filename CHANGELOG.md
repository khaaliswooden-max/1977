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
