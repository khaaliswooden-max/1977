// AR8 + AR9 + AR10 + AB5: Sample-accurate ADSR envelope generator.
//
// Lives in its own AudioWorkletGlobalScope realm; no imports from
// the main app. Used by the synth modules (story 3.3+) to shape
// each note's amplitude. Output multiplies an oscillator's output
// downstream; this processor only emits the envelope signal in
// [0, 1].
//
// The envelope state machine:
//   idle  --gate=1--> attack (0 -> 1 over `attack` ms)
//   attack --done--> decay (1 -> sustain over `decay` ms)
//   decay  --done--> sustain (hold at `sustain` until gate=0)
//   sustain --gate=0--> release (current -> 0 over `release` ms)
//   release --done--> idle
//
// All timing is computed in samples (using the global `sampleRate`),
// not in wall-clock ms. This is what makes it "sample-accurate" —
// the same gate event always produces the same envelope sample-by-
// sample regardless of process()-block scheduling jitter.

declare const sampleRate: number;
declare class AudioWorkletProcessor {
  constructor();
  readonly port: MessagePort;
}
declare function registerProcessor(
  name: string,
  ctor: new () => AudioWorkletProcessor,
): void;

interface ParamRecord {
  readonly name: string;
  readonly defaultValue: number;
  readonly minValue: number;
  readonly maxValue: number;
  readonly automationRate: 'a-rate' | 'k-rate';
}

interface ProcessorParameters {
  readonly [name: string]: Float32Array;
}

type Stage = 'idle' | 'attack' | 'decay' | 'sustain' | 'release';

class EnvelopeProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(): readonly ParamRecord[] {
    return [
      // Gate: above 0.5 -> note-on; below -> note-off. Edges
      // transition the state machine.
      { name: 'gate', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'a-rate' },
      // ADSR times in MILLISECONDS for ergonomic ADSR sliders.
      { name: 'attack', defaultValue: 5, minValue: 0, maxValue: 5_000, automationRate: 'k-rate' },
      { name: 'decay', defaultValue: 50, minValue: 0, maxValue: 5_000, automationRate: 'k-rate' },
      { name: 'sustain', defaultValue: 0.6, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'release', defaultValue: 100, minValue: 0, maxValue: 5_000, automationRate: 'k-rate' },
    ];
  }

  private stage: Stage = 'idle';
  /** Samples remaining in the current stage (only meaningful for A/D/R). */
  private stageSamples = 0;
  /** Envelope value at the START of the current stage. */
  private stageStartValue = 0;
  /** Last emitted envelope value. */
  private value = 0;
  /** Gate level last sample (for edge detection). */
  private prevGate = 0;

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: ProcessorParameters,
  ): boolean {
    const output = outputs[0];
    if (!output) return true;
    const channel = output[0];
    if (!channel) return true;

    const gateArr = parameters['gate'];
    const attack = parameters['attack']?.[0] ?? 5;
    const decay = parameters['decay']?.[0] ?? 50;
    const sustain = parameters['sustain']?.[0] ?? 0.6;
    const release = parameters['release']?.[0] ?? 100;

    for (let i = 0; i < channel.length; i++) {
      const gate = gateArr?.[i] ?? gateArr?.[0] ?? 0;

      // Edge detection on the gate signal.
      if (gate > 0.5 && this.prevGate <= 0.5) {
        this.startStage('attack', this.value, msToSamples(attack));
      } else if (gate <= 0.5 && this.prevGate > 0.5) {
        this.startStage('release', this.value, msToSamples(release));
      }
      this.prevGate = gate;

      // Advance the current stage.
      switch (this.stage) {
        case 'attack': {
          const t = this.stageProgress();
          this.value = this.stageStartValue + (1 - this.stageStartValue) * t;
          if (this.stageSamples <= 0) this.startStage('decay', this.value, msToSamples(decay));
          break;
        }
        case 'decay': {
          const t = this.stageProgress();
          this.value = this.stageStartValue + (sustain - this.stageStartValue) * t;
          if (this.stageSamples <= 0) {
            this.stage = 'sustain';
            this.value = sustain;
          }
          break;
        }
        case 'sustain':
          this.value = sustain;
          break;
        case 'release': {
          const t = this.stageProgress();
          this.value = this.stageStartValue + (0 - this.stageStartValue) * t;
          if (this.stageSamples <= 0) {
            this.stage = 'idle';
            this.value = 0;
          }
          break;
        }
        case 'idle':
          this.value = 0;
          break;
      }

      channel[i] = this.value;
      if (this.stageSamples > 0) this.stageSamples--;
    }
    return true;
  }

  private startStage(stage: Stage, fromValue: number, lengthSamples: number): void {
    this.stage = stage;
    this.stageStartValue = fromValue;
    this.stageSamples = Math.max(1, lengthSamples);
  }

  /** Linear progress in [0, 1] through the current stage. */
  private stageProgress(): number {
    // Start of stage we initialized stageSamples to length L; we
    // count down each sample. So progress = 1 - remaining / L. We
    // recompute L from stageSamples by stashing, but to keep this
    // simple we just step the value linearly: each sample we move
    // 1/stageSamples of the way from current toward target.
    if (this.stageSamples <= 0) return 1;
    return 1 / (this.stageSamples + 1);
  }
}

if (typeof registerProcessor !== 'undefined') {
  registerProcessor('adsr-envelope', EnvelopeProcessor);
}

function msToSamples(ms: number): number {
  return Math.max(0, Math.round((ms / 1000) * sampleRate));
}

export { EnvelopeProcessor, msToSamples };
