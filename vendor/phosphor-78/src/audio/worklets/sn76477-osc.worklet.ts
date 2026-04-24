// AR8 + NFR9 + NFR10: AudioWorklet-based custom oscillator with
// SN76477-flavored "circuit heat" — a deliberate departure from the
// mathematically-pure OscillatorNode the placeholder used.
//
// AB5: this file lives in its own realm (the AudioWorkletGlobalScope).
// It cannot import from anywhere outside this file. Any types or
// constants needed here are inlined.
//
// What "SN76477-flavored" means concretely:
// 1. Square waves get a tiny sub-sample dither added to the edge
//    transition so the waveform isn't bit-exactly periodic. Real
//    analog square sources have phase noise at every cycle.
// 2. Saw waves get pre-clip soft saturation (tanh-shaped) before
//    the linear ramp completes, mimicking the SN76477's mixer
//    saturating slightly below rail.
// 3. Triangle waves get a tiny asymmetry between rise and fall
//    times to mimic capacitor-charge nonlinearity.
// 4. Noise uses a 16-bit LFSR (a fixture of every period chip),
//    not Math.random() — same seed = identical output across
//    runs, which makes the regression tests reproducible.

declare const sampleRate: number;
declare class AudioWorkletProcessor {
  constructor();
  readonly port: MessagePort;
}
declare function registerProcessor(
  name: string,
  ctor: new () => AudioWorkletProcessor,
): void;

type Waveform = 'square' | 'saw' | 'triangle' | 'noise';

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

const TWO_PI = Math.PI * 2;

class SN76477Oscillator extends AudioWorkletProcessor {
  static get parameterDescriptors(): readonly ParamRecord[] {
    return [
      { name: 'frequency', defaultValue: 440, minValue: 0, maxValue: 22050, automationRate: 'a-rate' },
      { name: 'amplitude', defaultValue: 0.4, minValue: 0, maxValue: 1, automationRate: 'a-rate' },
      { name: 'dutyCycle', defaultValue: 0.5, minValue: 0.05, maxValue: 0.95, automationRate: 'a-rate' },
      { name: 'heat', defaultValue: 0.3, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  // Persistent oscillator state across process() calls.
  private phase = 0;
  private lfsr = 0xace1; // 16-bit LFSR seed (Galois)
  private waveform: Waveform = 'square';

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<{ waveform?: Waveform }>) => {
      if (event.data.waveform) this.waveform = event.data.waveform;
    };
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: ProcessorParameters,
  ): boolean {
    const output = outputs[0];
    if (!output) return true;
    const channel = output[0];
    if (!channel) return true;

    const freqArr = parameters['frequency'];
    const ampArr = parameters['amplitude'];
    const dutyArr = parameters['dutyCycle'];
    const heatArr = parameters['heat'];
    const heat = heatArr?.[0] ?? 0.3;

    for (let i = 0; i < channel.length; i++) {
      const freq = freqArr?.[i] ?? freqArr?.[0] ?? 440;
      const amp = ampArr?.[i] ?? ampArr?.[0] ?? 0.4;
      const duty = dutyArr?.[i] ?? dutyArr?.[0] ?? 0.5;

      this.phase += freq / sampleRate;
      while (this.phase >= 1) this.phase -= 1;

      let sample: number;
      switch (this.waveform) {
        case 'square':
          sample = this.square(duty, heat);
          break;
        case 'saw':
          sample = this.saw(heat);
          break;
        case 'triangle':
          sample = this.triangle(heat);
          break;
        case 'noise':
        default:
          sample = this.noise();
          break;
      }
      channel[i] = sample * amp;
    }
    return true;
  }

  // ─── Waveforms ────────────────────────────────────────────────

  private square(duty: number, heat: number): number {
    // Sub-sample dither on the duty boundary: jitter the comparison
    // by a fraction of a sample-equivalent so the edge transition
    // varies slightly per cycle instead of being bit-exact.
    const jitter = heat * 0.005 * (this.nextNoise() - 0.5);
    return this.phase < duty + jitter ? 1 : -1;
  }

  private saw(heat: number): number {
    const linear = this.phase * 2 - 1;
    if (heat <= 0) return linear;
    // Soft pre-clip saturation via tanh-shaped warp; heat=1 gives
    // a ~3dB compression of the upper third of the ramp.
    const drive = 1 + heat * 0.5;
    return Math.tanh(linear * drive) / Math.tanh(drive);
  }

  private triangle(heat: number): number {
    // Asymmetric rise/fall: positive ramp uses the lower 0.5+heat*0.05
    // portion of the phase, negative ramp uses the rest.
    const breakpoint = 0.5 + heat * 0.05;
    if (this.phase < breakpoint) {
      return (this.phase / breakpoint) * 2 - 1;
    }
    const t = (this.phase - breakpoint) / (1 - breakpoint);
    return 1 - t * 2;
  }

  private noise(): number {
    return this.nextNoise() * 2 - 1;
  }

  /** Galois 16-bit LFSR. Returns a value in [0, 1). */
  private nextNoise(): number {
    const lsb = this.lfsr & 1;
    this.lfsr >>>= 1;
    if (lsb) this.lfsr ^= 0xb400; // taps: 16, 14, 13, 11
    return this.lfsr / 0x10000;
  }
}

// Wrap the registration so the module is benign when imported in
// non-AudioWorklet contexts (the type tests below need the class).
if (typeof registerProcessor !== 'undefined') {
  registerProcessor('sn76477-osc', SN76477Oscillator);
}

// Test-only export: lets unit tests exercise the math without a
// real AudioWorkletGlobalScope. Stripped by the bundler when the
// worklet is loaded as an actual processor (no consumers in the
// app graph).
export { SN76477Oscillator };
export const sn76477TestSurface = {
  twoPi: TWO_PI,
};
