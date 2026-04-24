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

*(Nothing yet — the project has no build step and no dev dependencies.)*

## Bundled assets

*(No third-party sprites, audio, or data files are currently bundled. When one is added, append a section here with: the file path, source URL, author, license, and a copy of any required license notice.)*

---

If you believe something is missing from this file, please open an issue or pull request — see [CONTRIBUTING.md](CONTRIBUTING.md).
