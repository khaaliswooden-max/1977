# Controls

Full reference for *1977 — Aircraft Warfare*.

## Desktop (keyboard)

### Player 1

| Action       | Primary       | Alternate       |
| ------------ | ------------- | --------------- |
| Move left    | `A`           | `←`             |
| Move right   | `D`           | `→`             |
| Move up      | `W`           | `↑`             |
| Move down    | `S`           | `↓`             |
| Fire         | `Space`       | `Z`             |
| Bomb         | `X`           | —               |

### Player 2

| Action       | Primary       | Alternate       |
| ------------ | ------------- | --------------- |
| Move left    | `J`           | Numpad `4`      |
| Move right   | `L`           | Numpad `6`      |
| Move up      | `I`           | Numpad `8`      |
| Move down    | `K`           | Numpad `5`      |
| Fire         | `Enter`       | `NumpadEnter`, `M` |
| Bomb         | `N`           | —               |

### System

| Action            | Key           |
| ----------------- | ------------- |
| Pause / resume    | `P` or `Esc`  |
| Confirm in menus  | `Enter` / `Space` |

## Mobile (touch)

The screen is split into two halves once the game starts:

- **Left half** → Player 1
  - Drag anywhere in the left zone to steer the virtual joystick
  - **FIRE** button at the bottom-right of the left zone
- **Right half** → Player 2
  - Drag anywhere in the right zone to steer the virtual joystick
  - **FIRE** button at the bottom-left of the right zone

Bombs on mobile are not yet bound — see [issues](https://github.com/khaaliswooden-max/1977/issues) or [MODDING.md](MODDING.md) to add them.

## Gamepad

Not yet supported. Contributions welcome — start with `navigator.getGamepads()` and map to the same input struct that `Player.getInput()` produces.

## Rebinding

There is no in-game rebind menu. To change keys, edit the `keys[...]` checks inside `Player.getInput()` in `code`. See the "Player controls" section of [MODDING.md](MODDING.md).
