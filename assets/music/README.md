# Music — background tracks

Phase 2 will drop `.wav`/`.mp3`/`.ogg` loops here. `build.mjs` inlines each
as a base64 data URI via `INLINE:ASSET` markers, keeping the game a single
file.

Planned tracks (Phase 2):

- `bgm_menu.ogg`   — title / mode-select loop
- `bgm_stage.ogg`  — in-stage loop (crossfades between levels)
- `bgm_boss.ogg`   — boss encounter loop

## Attribution

Music may be borrowed from `vendor/ld39-zeroVoltX/res` under its original
license. Every borrowed track **must** be credited in both
[`CREDITS.md`](../../CREDITS.md) and
[`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md) before inlining.
