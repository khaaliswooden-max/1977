// Clock contract used by the reducer. The audio module owns the
// implementation (AudioClock) but the game layer only sees this
// interface, keeping AB1 (game/ cannot import audio/) intact.

export interface Clock {
  readonly currentTime: number;
  currentStep(remainingInvaders: number): number;
}
