# Build & Run

*1977 — Aircraft Warfare* ships as a single HTML file players can open
directly. Since **Phase 1** of the enhancement track, that file (`code`) is
**auto-generated** from `src/game.html` by a tiny Node script (`build.mjs`).
There is still no npm install, no bundler, and no network at build time.

## Source vs. shipped artifact

| Path             | Role                                                      |
| ---------------- | --------------------------------------------------------- |
| `src/game.html`  | **Editable source.** Contains `/* INLINE:... */` markers. |
| `build.mjs`      | Node 18+ script that resolves markers and emits `code`.   |
| `code`           | **Shipped artifact.** Auto-generated; do not hand-edit.   |
| `assets/**`      | SFX params, music, sprites — inlined as data URIs.        |
| `vendor/**`      | Third-party libs — inlined as JS by `INLINE:FILE`.        |

### Rebuilding

```bash
node build.mjs
```

No arguments. Exits non-zero on missing files or malformed markers.

### Marker reference

All markers live inside the `<script>` block of `src/game.html` and are
delimited by `/* /INLINE */` so rebuilds are idempotent.

| Marker                                              | Emits                                                        |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `/* INLINE:FILE path/from/repo/root */`             | File contents pasted verbatim.                               |
| `/* INLINE:ASSET path CONST NAME MIME audio/wav */` | `const NAME = 'data:audio/wav;base64,...';`                  |
| `/* INLINE:SFXR path CONST NAME */`                 | `const NAME = { ...parsed sfxr JSON... };`                   |
| `/* INLINE:VERSION */`                              | `const BUILD_VERSION = '<semver>+<iso-timestamp>';`          |

Phases 2–5 will add markers for `vendor/sfxr.js`, `vendor/Proton`,
`vendor/webgl-crt-shader`, `vendor/canvas-confetti`, `vendor/nipplejs`,
`vendor/gamecontroller.js`, and `vendor/particles.js-bg`.

## Requirements

- Any modern browser: Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- Internet connection **on first load** so Google Fonts can fetch *Share Tech Mono* and *Orbitron* (once cached, the game runs offline)
- For mobile testing: a device on the same LAN as your dev machine

## Running locally

### Option 1 — open the file directly

```bash
# Linux
xdg-open code
# macOS
open code
# Windows (PowerShell)
start code
```

This works, but some browsers restrict `file://` URLs (no touch emulation over LAN, stricter CORS for any future asset loads). Prefer Option 2.

### Option 2 — serve over HTTP (recommended)

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/code
```

Any static server works: `npx serve .`, `caddy file-server`, `busybox httpd -p 8000`, etc.

### Option 3 — test on a real phone

1. Start a static server as in Option 2.
2. Find your LAN IP (`ip a` on Linux, `ifconfig` on macOS, `ipconfig` on Windows).
3. On the phone, open `http://<your-lan-ip>:8000/code`.
4. Both machines must be on the same Wi-Fi network; your firewall must allow inbound `:8000`.

## File naming

The game file is called `code` (no extension) for historical reasons. If you prefer `index.html`:

```bash
mv code index.html
```

All documentation refers to it as `code`; update references in your fork if you rename it.

## "Building" for distribution

Because it's one file, "building" means copying `code` somewhere. Options:

- **GitHub Pages** — push to `gh-pages` (or enable Pages on `main` with `/ (root)`), then the game is live at `https://<user>.github.io/1977/code`. Rename to `index.html` first for a clean URL.
- **itch.io** — zip the single file and upload as an HTML5 game.
- **Neocities / Tilde / any static host** — upload the file directly.

## Offline-first

The game uses no network at runtime **except** for loading Google Fonts on first visit. To make it truly offline:

1. Download the two `.woff2` files from Google Fonts.
2. Place them next to `code`.
3. Replace the `@import url('https://fonts.googleapis.com/...')` line in the `<style>` block with local `@font-face` declarations.
4. Update [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) to note that fonts are now bundled, and add the [OFL license text](https://openfontlicense.org/).

## Troubleshooting

| Symptom                                    | Likely cause                                      | Fix                                                             |
| ------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------- |
| Blocky or blurry fonts                     | Fonts haven't loaded yet / no network             | Wait a second, or serve the fonts locally (see "Offline-first") |
| Canvas looks soft, not pixelated           | Browser ignored `image-rendering: pixelated`      | Use Chrome/Firefox; Safari < 16 has spotty support              |
| Touch controls do nothing on phone         | Page not served over HTTPS or same-origin         | Serve via `http://<lan-ip>:8000`; some iOS features need HTTPS  |
| "Failed to load font" warning in console   | CDN blocked (corporate network, ad-blocker)       | Vendor fonts locally, or allow `fonts.googleapis.com`           |
| Keys do nothing                            | Focus is on devtools or another tab               | Click the canvas once to return focus                           |
