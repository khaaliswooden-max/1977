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

## Bundled assets

*(No third-party sprites or audio samples are bundled in `code`.
Sound effects are synthesized at runtime from parameter files in
`assets/sfx/`; music is synthesized procedurally in WebAudio. When an
external asset is added, append a section here with: the file path,
source URL, author, license, and a copy of any required license notice.)*

---

If you believe something is missing from this file, please open an issue or pull request — see [CONTRIBUTING.md](CONTRIBUTING.md).
