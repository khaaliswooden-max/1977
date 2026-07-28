# 1977 — AIRCRAFT WARFARE

A retro arcade-style vertical shoot-'em-up built as a single self-contained HTML file. Solo or 2-player local co-op, CRT scanline aesthetic, three difficulty tiers, power-ups, bombs, and boss fights.

## Features

- **3D Gaussian Splat renderer** — the whole world (ships, bullets, explosions, starfield) is drawn as depth-sorted clouds of anisotropic 3D gaussians through a tilted perspective camera; waves fly in from the distance. Toggle back to the classic 2D canvas renderer in Options
- **Single-file game** — one HTML document, zero build step, zero dependencies
- **1P or 2P local co-op** on the same keyboard (or two touch zones on mobile)
- **Three difficulties**: NOVICE, INTERMEDIATE, ADVANCED — tuning enemy speed, fire rate, boss HP, lives, and starting shield
- **Power-ups**: SHOT (weapon level up), SPEED, SHIELD, BOMB
- **Mobile-ready** with on-screen joysticks and fire buttons
- **CRT look**: scanlines + vignette overlay, pixelated rendering

## Quick start

Clone and open the file in any modern browser:

```bash
git clone https://github.com/khaaliswooden-max/1977.git
cd 1977
# rename on first use if you prefer (optional)
# mv code index.html
xdg-open index.html   # Linux
open index.html       # macOS
start index.html      # Windows
```

Or serve it locally (recommended for mobile testing over LAN):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/
```

No build step, no npm install, no toolchain.

## Controls

| Action       | Player 1                 | Player 2                        |
| ------------ | ------------------------ | ------------------------------- |
| Move         | `W` `A` `S` `D` / Arrows | `I` `J` `K` `L` / Numpad 8456   |
| Fire         | `Space` or `Z`           | `Enter` / `NumpadEnter` / `M`   |
| Bomb         | `X`                      | `N`                             |
| Pause        | `P` / `Esc`              | —                               |

On touch devices: left half of the screen drives Player 1 (joystick + FIRE), right half drives Player 2.

See [CONTROLS.md](CONTROLS.md) for the full reference.

## Tech stack

- Plain HTML5 + CSS + JavaScript
- WebGL 3D Gaussian Splatting world renderer (instanced billboards, EWA covariance projection, back-to-front premultiplied-alpha compositing) with a `<canvas>` 2D HUD composited on top
- Classic `<canvas>` 2D renderer kept as a fallback/option, `image-rendering: pixelated`
- Google Fonts: *Share Tech Mono*, *Orbitron*

## Project layout

```
.
├── index.html          # the game (single HTML file, built from src/)
├── README.md
├── LICENSE             # code license
├── ASSETS_LICENSE.md   # art / audio license (if/when assets are added)
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── SUPPORT.md
├── CREDITS.md
├── CONTROLS.md
├── BUILD.md
├── MODDING.md
└── THIRD_PARTY_NOTICES.md
```

## Contributing

Bug reports, balance tweaks, new enemies, and pixel art are all welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Code is released under the [MIT License](LICENSE). Game assets (sprites, audio, fonts-where-redistributed) are covered separately by [ASSETS_LICENSE.md](ASSETS_LICENSE.md).
