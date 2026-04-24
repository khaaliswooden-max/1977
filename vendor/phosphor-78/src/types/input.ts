// CC4 + N3: Input as a per-frame snapshot rather than an event
// stream. The reducer reads booleans synchronously; the input system
// is responsible for translating raw DOM events to a snapshot edge.

export interface InputSnapshot {
  readonly left: boolean;
  readonly right: boolean;
  readonly fire: boolean;
  readonly pause: boolean;
  readonly confirm: boolean;
}

export const NEUTRAL_INPUT: InputSnapshot = {
  left: false,
  right: false,
  fire: false,
  pause: false,
  confirm: false,
};
