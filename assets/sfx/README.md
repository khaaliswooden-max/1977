# SFX — sound effect sources

Phase 2 will populate this directory with `sfxr.js`-compatible JSON param
files. Each file is a small JSON object describing a procedurally generated
sound; at build time `build.mjs` inlines them as `const <NAME> = { ... }`
into `code` so players never fetch them at runtime.

Planned files (Phase 2):

- `shoot.json`
- `shoot_powered.json`
- `hit_enemy.json`
- `hit_player.json`
- `explode_small.json`
- `explode_big.json`
- `powerup.json`
- `bomb.json`
- `menu_move.json`
- `menu_confirm.json`
- `boss_warn.json`

Generate these with the sfxr UI at `vendor/sfxr.js/index.html` and save the
exported JSON here. See `vendor/sfxr.js/README` for the param reference.
