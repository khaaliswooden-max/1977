# Third-Party Notices

This file lists third-party software, assets, and services used by or distributed with *1977 — Aircraft Warfare*, along with their licenses.

The game source code itself does not bundle any third-party runtime libraries. Everything below is either loaded at runtime from a public CDN or used only during development.

## Runtime

### Share Tech Mono

- **Use**: loaded at runtime from Google Fonts
- **URL**: <https://fonts.google.com/specimen/Share+Tech+Mono>
- **Author**: Ralph Levien
- **License**: [SIL Open Font License 1.1](https://openfontlicense.org/)

### Orbitron

- **Use**: loaded at runtime from Google Fonts
- **URL**: <https://fonts.google.com/specimen/Orbitron>
- **Author**: Matt McInerney
- **License**: [SIL Open Font License 1.1](https://openfontlicense.org/)

### Google Fonts CDN

- **Use**: serves the fonts above via `https://fonts.googleapis.com`
- **Privacy**: requests to the Google Fonts CDN may be logged by Google. If you self-host this game in a privacy-sensitive context, vendor the font files locally and remove the `@import` from the `<style>` block in `code`.

## Development (not redistributed)

### sfxr.js

- **Use**: schema reference only. The `assets/sfx/*.json` parameter files
  follow the sfxr parameter schema (waveType, startFrequency, slide,
  attackTime, sustainTime, decayTime, squareDuty, vibratoDepth/Speed, etc.)
  so contributors can author new SFX with the `vendor/sfxr.js/index.html`
  UI and save the exported params here.
- **Runtime**: sfxr.js is **not bundled**; a fresh WebAudio implementation
  in `code` reads the same schema.
- **URL**: <https://github.com/humphd/sfxr.js>
- **Authors**: David Humphrey (JS port); Thomas Vian (ActionScript port);
  Tomas Pettersson (original C++ sfxr).
- **License**: MIT. See `vendor/sfxr.js/LICENSE`.

### webgl-crt-shader

- **Use**: GLSL fragment-shader reference. The WebGL post-process in `code`
  implements scanlines, barrel curvature, bloom, vignette, chromatic
  aberration, and flicker based on the techniques in
  `vendor/webgl-crt-shader/CRTShader.js`. The implementation is fresh,
  targets WebGL1 (not Three.js), and uses a subset of the uniform set.
- **Runtime**: `vendor/webgl-crt-shader` is **not bundled**; only the
  GLSL approach is credited.
- **URL**: repository in `vendor/webgl-crt-shader/README.md`.
- **License**: MIT. See `vendor/webgl-crt-shader/LICENSE`.

### Proton (particle engine)

- **Use**: design reference. The upgraded `Particle` class in `code`
  adds trails, gravity, drag, rotation, and color-over-lifetime — all
  concepts standard to Proton. Proton itself is an ES module tree that
  would require a bundler; `code` stays single-file.
- **Runtime**: Proton is **not bundled**.
- **URL**: `vendor/Proton/README.md`.
- **License**: MIT. See `vendor/Proton/LICENSE`.

### canvas-confetti

- **Use**: reference for celebration bursts. The `Confetti` module in
  `index.html` is a ~40-line DIY implementation tuned for our 480×640
  canvas; the full library is not inlined to keep `index.html` small.
- **Runtime**: canvas-confetti is **not bundled**.
- **URL**: `vendor/canvas-confetti/README.md`.
- **License**: ISC. See `vendor/canvas-confetti/LICENSE`.

### particles.js-bg

- **Use**: design reference for the parallax starfield layering.
  `code` ships a hand-rolled 3-layer starfield + nebula.
- **Runtime**: particles.js-bg is **not bundled**.
- **URL**: `vendor/particles.js-bg/README.md`.
- **License**: MIT. See `vendor/particles.js-bg/LICENSE`.

### gamecontroller.js

- **Use**: reference for the Gamepad API integration approach (standard
  button layout, dual-rumble haptics). `code` uses the native browser
  Gamepad API directly — no library inlined.
- **Runtime**: gamecontroller.js is **not bundled**.
- **URL**: `vendor/gamecontroller.js/readme.md`.
- **License**: MIT. See `vendor/gamecontroller.js/license.md`.

### joypad.js

- **Use**: secondary reference for the Gamepad API and standard button
  index mapping. `code` uses the native browser Gamepad API directly.
- **Runtime**: joypad.js is **not bundled**.
- **URL**: `vendor/joypad.js/README.md`.
- **License**: MIT. See `vendor/joypad.js/LICENSE`.

### nipplejs

- **Use**: not integrated. The existing inline touch zone implementation
  was retained for Phase 5; nipplejs stays a reference for a future
  polish pass if the current scheme needs replacing.
- **Runtime**: nipplejs is **not bundled**.
- **URL**: `vendor/nipplejs/README.md`.
- **License**: MIT. See `vendor/nipplejs/LICENSE`.

### bullethell

- **Use**: reference for enemy bullet patterns (aimed, ring burst,
  spiral). Phase 3/5 bosses and enemies use hand-coded variants of
  these shapes; no code was copied.
- **Runtime**: bullethell is **not bundled**.
- **URL**: `vendor/bullethell/README.md`.
- **License**: see `vendor/bullethell/LICENSE`.

## Bundled assets

*(No third-party sprites or audio samples are bundled in `code`.
Sound effects are synthesized at runtime from parameter files in
`assets/sfx/`; music is synthesized procedurally in WebAudio. When an
external asset is added, append a section here with: the file path,
source URL, author, license, and a copy of any required license notice.)*

---

If you believe something is missing from this file, please open an issue or pull request — see [CONTRIBUTING.md](CONTRIBUTING.md).
