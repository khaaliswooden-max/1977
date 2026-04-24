# Modding Guide

*1977 — Aircraft Warfare* doesn't have a formal plugin API, but because it's a single HTML file with plain JavaScript and no obfuscation, it's easy to fork, rebalance, and reskin. This guide points to the things most modders want to change.

## Getting set up

1. Fork the repository on GitHub.
2. Clone your fork and open `code` in any text editor.
3. Serve it locally: `python3 -m http.server 8000` → open `http://localhost:8000/code`.
4. Reload the browser after each edit. There's no build step.

## Where to change things

All numbers below refer to objects defined near the top of the `<script>` block in `code`.

### Difficulty tuning

Find the `DIFFS` array. Each entry controls one difficulty tier:

```js
{ name:'NOVICE', color:'#44FF88', lives:5, enemySpd:0.7, fireRate:0.6, bossHp:1.0, shield:true }
```

| Field       | Effect                                                     |
| ----------- | ---------------------------------------------------------- |
| `name`      | Label shown on the difficulty select screen                |
| `color`     | Accent color for that tier                                 |
| `lives`     | Starting lives per player                                  |
| `enemySpd`  | Multiplier on enemy vertical/horizontal speed              |
| `fireRate`  | Multiplier on enemy fire rate (higher = shoots more often) |
| `bossHp`    | Multiplier on boss HP                                      |
| `shield`    | Whether players spawn with a free shield                   |

Add a fourth entry to ship a new tier.

### Power-ups

Find `PU_TYPES` and the `colors` table in the `Powerup` class. To add a new power-up:

1. Add a string to `PU_TYPES` (e.g. `'HOMING'`).
2. Add its color to the `colors` object.
3. Handle the new type in the `Player` collision branch where existing power-ups are applied.

### Enemies

Enemy stats live in the `Enemy` class constructor's `switch` block (`case 'bomber':`, etc.). Each case sets `w`, `h`, `hp`, `pts`, `color`, and `vy`. To add a new enemy type:

1. Add a new `case` with your stats.
2. Add the type name to the spawn tables used by the wave scheduler.
3. (Optional) Add a unique draw path in the render function.

### Player controls

Look for the `keys[...]` checks in `Player.getInput()`. Swap `KeyCode` strings to rebind. If you add a control, document it in [CONTROLS.md](CONTROLS.md) in the same PR.

### Visuals

- Palette lives in the color fields on each class and in CSS variables at the top of the `<style>` block.
- Pixelation comes from `image-rendering: pixelated` on the canvas.
- The CRT look is two overlay `div`s: `#scanlines` and `#crt-overlay`. Comment them out for a flat look.

## Sharing your mod

- Fork this repository and push your mod to a branch with a descriptive name (e.g. `mod-neon-palette`).
- Add a note at the top of your fork's README explaining that it is a mod and linking back here.
- Respect licenses: code is MIT, assets are CC BY 4.0 by default. If you include third-party assets, add them to your fork's `THIRD_PARTY_NOTICES.md`.

## Contributing a mod back upstream

Small, focused changes (new enemy, new power-up, palette swap behind a toggle) are welcome as PRs. Large total conversions are better kept as forks. Either way, see [CONTRIBUTING.md](CONTRIBUTING.md).
