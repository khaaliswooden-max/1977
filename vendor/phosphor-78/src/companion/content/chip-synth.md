# How the chip synthesizer works

The 1978 Space Invaders cabinet had a Texas Instruments SN76477
sound chip plus a few discrete oscillators. It made noises by
running square waves through analog filters, modulated by hand-
tuned RC networks. There was no audio file format involved —
sound was a circuit, not a recording.

Phosphor 78's audio is built on the same principle. The bundle
contains zero audio files. Every sound is generated in real time
by a graph of Web Audio nodes, with the shape of those graphs
designed to sound the way a 1978 arcade machine did.

```svg
<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <defs>
    <marker id="arrow2" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="#00ff66" />
    </marker>
  </defs>
  <g font-family="monospace" font-size="11" fill="#ddd" text-anchor="middle">
    <rect x="10" y="80" width="120" height="40" fill="#143" stroke="#00ff66" rx="4" />
    <text x="70" y="105">SN76477 osc</text>
    <line x1="130" y1="100" x2="175" y2="100" stroke="#00ff66" marker-end="url(#arrow2)" />
    <rect x="180" y="80" width="120" height="40" fill="#220" stroke="#ffaa00" rx="4" />
    <text x="240" y="105">BiquadFilter</text>
    <line x1="300" y1="100" x2="345" y2="100" stroke="#00ff66" marker-end="url(#arrow2)" />
    <rect x="350" y="80" width="100" height="40" fill="#202" stroke="#ff66cc" rx="4" />
    <text x="400" y="105">ADSR gain</text>
    <line x1="450" y1="100" x2="495" y2="100" stroke="#00ff66" marker-end="url(#arrow2)" />
    <rect x="500" y="80" width="90" height="40" fill="#444" stroke="#ddd" rx="4" />
    <text x="545" y="105">Master</text>
    <text x="300" y="170" fill="#888">A typical per-event synth: oscillator → filter → envelope → master gain</text>
  </g>
</svg>
```

## Custom oscillator in an AudioWorklet

The Web Audio API ships with `OscillatorNode`, which produces
mathematically perfect square / saw / triangle / sine waves. They
sound clean — too clean. A real analog oscillator has cycle-to-
cycle jitter, slight amplitude wobble, and produces wave edges
that aren't bit-exact periodic. To get that 1978 character we
wrote our own oscillator inside an `AudioWorkletProcessor`.

The processor lives in its own `AudioWorkletGlobalScope` realm.
Its `process()` method runs at the audio thread's tempo,
processing 128 samples per call. For each sample we:

1. Advance a phase counter by `frequency / sampleRate`.
2. Pick the wave value from the current phase plus a tiny
   per-sample dither to break perfect periodicity.
3. Apply waveform-specific saturation:
   - **square** gets sub-sample dither on the duty boundary
   - **saw** gets `tanh(linear * drive)` soft pre-clip
   - **triangle** gets asymmetric rise/fall times (positive ramp
     slightly shorter than negative)
   - **noise** is a 16-bit Galois LFSR (taps 16, 14, 13, 11),
     producing deterministic pseudo-randomness that survives
     bit-for-bit between runs

The "heat" parameter (0..1) controls how much of each effect
gets applied. At heat = 0 the worklet behaves like a standard
oscillator; at heat = 1 it sounds noticeably analog.

```svg
<svg viewBox="0 0 600 160" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <g font-family="monospace" font-size="11">
    <text x="20" y="20" fill="#888">LFSR (16-bit Galois, taps 16/14/13/11)</text>
    <g transform="translate(0, 30)">
      <!-- 16 boxes representing bits, with arrows to taps -->
      <g fill="#222" stroke="#888">
        <rect x="20"  y="0" width="35" height="35" />
        <rect x="55"  y="0" width="35" height="35" />
        <rect x="90"  y="0" width="35" height="35" />
        <rect x="125" y="0" width="35" height="35" />
        <rect x="160" y="0" width="35" height="35" />
        <rect x="195" y="0" width="35" height="35" />
        <rect x="230" y="0" width="35" height="35" />
        <rect x="265" y="0" width="35" height="35" />
        <rect x="300" y="0" width="35" height="35" />
        <rect x="335" y="0" width="35" height="35" />
        <rect x="370" y="0" width="35" height="35" />
        <rect x="405" y="0" width="35" height="35" />
        <rect x="440" y="0" width="35" height="35" />
        <rect x="475" y="0" width="35" height="35" />
        <rect x="510" y="0" width="35" height="35" />
        <rect x="545" y="0" width="35" height="35" />
      </g>
      <!-- Highlight tap positions -->
      <g fill="#143" stroke="#00ff66">
        <rect x="20"  y="0" width="35" height="35" />
        <rect x="90"  y="0" width="35" height="35" />
        <rect x="125" y="0" width="35" height="35" />
        <rect x="195" y="0" width="35" height="35" />
      </g>
      <g fill="#00ff66" font-size="10" text-anchor="middle">
        <text x="37" y="22">16</text>
        <text x="107" y="22">14</text>
        <text x="142" y="22">13</text>
        <text x="212" y="22">11</text>
      </g>
      <text x="20" y="60" fill="#888">XOR these four bits to compute the next bit fed into position 1.</text>
    </g>
  </g>
</svg>
```

The deterministic LFSR matters for testing. The reducer is pure
(CR1: no `Math.random` allowed) and audio modules follow the same
discipline — same input always produces the same output. That
lets the spectrum-regression tests in story 5.x compare the
synth's output to a reference recording without flaky pass/fail.

## ADSR envelope generation

Each note's amplitude isn't a square switch from 0 to peak — it
follows the classic Attack / Decay / Sustain / Release contour:

```svg
<svg viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg" class="diagram">
  <g font-family="monospace" font-size="11">
    <line x1="20" y1="160" x2="580" y2="160" stroke="#888" />
    <line x1="20" y1="20"  x2="20"  y2="160" stroke="#888" />
    <text x="10" y="20" fill="#888" text-anchor="end">1</text>
    <text x="10" y="160" fill="#888" text-anchor="end">0</text>
    <text x="300" y="178" fill="#888" text-anchor="middle">time</text>
    <!-- ADSR envelope: attack to 1, decay to 0.6, sustain at 0.6, release to 0. -->
    <polyline points="20,160 90,20 180,76 380,76 480,160" fill="none" stroke="#00ff66" stroke-width="2" />
    <g fill="#00ff66" font-size="10" text-anchor="middle">
      <text x="55"  y="14">A</text>
      <text x="135" y="14">D</text>
      <text x="280" y="68">S</text>
      <text x="430" y="14">R</text>
    </g>
    <line x1="90"  y1="20"  x2="90"  y2="160" stroke="#444" stroke-dasharray="4 3" />
    <line x1="180" y1="76"  x2="180" y2="160" stroke="#444" stroke-dasharray="4 3" />
    <line x1="380" y1="76"  x2="380" y2="160" stroke="#444" stroke-dasharray="4 3" />
    <text x="55"  y="172" fill="#888" text-anchor="middle">attack</text>
    <text x="135" y="172" fill="#888" text-anchor="middle">decay</text>
    <text x="280" y="172" fill="#888" text-anchor="middle">sustain (until note-off)</text>
    <text x="430" y="172" fill="#888" text-anchor="middle">release</text>
  </g>
</svg>
```

The envelope worklet is also sample-accurate. Its `gate`
parameter is edge-detected: a rising edge starts the
attack-decay-sustain ramp, a falling edge starts release-from-
current-value. Timing is computed in samples (using the global
`sampleRate` variable), not in milliseconds — even a 1 ms scheduler
hiccup wouldn't change the envelope shape, because the worklet
counts samples directly.

## Per-event synths

Each in-game event has its own little factory. Story 3.3-3.5
covered them in detail; here's the inventory:

- **invader-march** — 4-step descending pitch loop (C3 / B2 / A#2
  / A2). Driven by `audioClock.currentStep(N)` where N is the
  remaining-alien count, which is what produces the famous "tempo
  speeds up as aliens die" effect (see the timing chapter).
- **shoot** — single square chirp from 1200 Hz to 200 Hz over 80 ms.
  Short, sharp, recognizable.
- **explosion** — lowpass-filtered LFSR noise burst, 300 ms. The
  filter sweeps from 1500 Hz down to 200 Hz so the timbre opens
  bright then closes dark.
- **invader-killed** — highpass-filtered LFSR noise, 80 ms.
  Brighter and shorter than the explosion so the two are
  distinguishable when they overlap.
- **ufo** — two detuned sawtooths beating at +/-10 Hz, both
  modulated by an 8 Hz LFO. The wobble is the alien-spaceship
  feel.
- **ufo-killed** — bandpass-filtered noise mixed with a fast
  descending square pulse. Distinct from player explosion.

Each synth uses a different LFSR seed (0xACE1 / 0xBEEF / 0xCAFE)
so sounds don't sound mathematically identical when their
durations overlap.

## CR7: AudioParam writes are graceful

A bug we don't have: writing directly to `audioParam.value`. That
shortcut sets the value at the next audio-thread tick, which can
land in the middle of a sample buffer and produce a click. The
correct pattern is `setValueAtTime(value, when)` or
`linearRampToValueAtTime(value, when)`, which schedule a
sample-accurate transition.

Every audio module in Phosphor 78 follows CR7. ESLint can't
enforce it (the `value` setter looks identical to a normal
property write), but the per-synth tests in story 3.x assert each
fire path uses the scheduling APIs.

## Why all this matters in 22 KB

The total production bundle for Phosphor 78, including every
synth, every shader, every game module, the persistence pipeline,
and every byte of teaching content on this page, is around 70 KB
gzipped. The audio half of that is around 8 KB. There are no
audio files. There are no megabyte-scale sample libraries. The
entire game's sound design exists as `setValueAtTime` calls and
oscillator graphs.

This isn't a virtue in itself — modern games can and should ship
megabytes of recorded audio when they need to. But for a 1978
arcade reproduction it's the only honest choice. The original
machine had less than 4 KB of program ROM and no recorded sound
at all. Shipping 50 MB of WAV files to play a Space Invaders clone
would be cosplay, not reproduction.

The result is a build small enough that it loads instantly even
on slow connections, fast enough that you can hear sounds in
under a millisecond from the input event, and pure enough that
the spectrum-regression tests in story 5.x can pin down each
synth's signature against a reference recording without any
fuzzy-comparison wiggle room.

## Try the buttons above

The "Try it" row triggers each synth at the current ADSR / filter
values. Drag the ADSR sliders, then click a button to hear the
new envelope shape. Toggle the march loop on, then drag the
filter cutoff — the march character changes in real time.
