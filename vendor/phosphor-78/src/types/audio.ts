// CC4 + N3: discrete events emitted by the reducer in addition to
// state. Audio + visual subsystems consume events in the main loop;
// reducer never calls them directly.

export type GameEvent =
  | { readonly type: 'invader_killed'; readonly row: number; readonly col: number }
  | { readonly type: 'player_shoot' }
  | { readonly type: 'player_killed' }
  | { readonly type: 'ufo_appeared' }
  | { readonly type: 'ufo_killed'; readonly score: number }
  | { readonly type: 'wave_cleared'; readonly wave: number }
  | { readonly type: 'game_over' }
  | { readonly type: 'extra_life'; readonly threshold: number };
