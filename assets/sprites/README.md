# Sprites — pixel art

Phase 3 will drop `.png` sprite sheets here. `build.mjs` inlines each as a
base64 data URI via `INLINE:ASSET` markers.

Planned sheets (Phase 3):

- `player_ships.png`  — P1/P2 ship frames, thrusters
- `enemies.png`       — 5 enemy types + damage frames
- `bosses.png`        — boss hulls and destructible parts
- `powerups.png`      — SHOT/SPEED/SHIELD/BOMB icons, animated
- `bullets.png`       — player and enemy projectile variants

Author in any pixel editor (Aseprite, Piskel, etc.). Save as indexed or
RGBA PNG with `image-rendering: pixelated` in mind — no anti-aliasing.
