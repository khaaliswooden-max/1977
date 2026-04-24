# 30-minute demo script (Story 5.7)

For the simulated walkthrough the brief asks for. Aim: in 30
minutes a technical friend should be able to follow the
architecture, understand the three pillars, and ask non-trivial
questions. Pass condition: at least 3 non-trivial questions, at
least 2 you can answer.

This script is a working outline, not a polished talk. Use it as
a checklist; pause after each section to ask "any questions?"

## Minute 0-3: project framing

- 1978 Taito Space Invaders is the foundational arcade game.
  Phosphor 78 is a pixel-perfect web replica targeting the
  *experience*, not just the gameplay. Three pillars must all
  hold: gameplay 1:1 with the disassembly, audio synthesized
  from oscillator math (no sample files), CRT effects to the
  point that screenshots are hard to distinguish from MAME.
- Show the live game (game URL). Point out the curvature, the
  scanlines, the phosphor glow trail when the player ship moves.
- Open the companion page. Show the table of contents.

## Minute 3-10: timing — why the audio clock drives the game

- Open the timing chapter on the companion page.
- Walk through the two-clocks diagram: rAF jitters by 1-3ms,
  AudioContext is sample-accurate.
- Walk through the lookahead scheduler diagram: every 25ms a
  poll runs and queues events into AudioContext's
  near-future via setValueAtTime.
- Drag the N slider on the audio-clock visualizer from 55 down
  to 1 — watch the inter-note interval drop from 867ms to 83ms.
- Show the table at $1A11 / $1A21 in references/computer-archeology/Code.html.
- Mention the saucer-scoring bug: 16-byte table, wrap check
  uses < $63 instead of < $64, so the 16th byte is unreachable
  and the cycle is effectively 15 long. That's where the famous
  "every 15 hits = 300" pattern comes from. Open
  src/constants/computer-archeology.ts and find SAUCER_SCORE_CYCLE_RAW.

## Minute 10-18: chip synth — every sound from oscillator math

- Open the chip-synth chapter.
- Walk through the synth graph diagram (oscillator → filter →
  envelope → master).
- Click "Try it" buttons one at a time. Open the network tab
  and refresh — show that NO audio file gets requested.
- Open src/audio/worklets/sn76477-osc.worklet.ts. Walk through
  the LFSR (4 lines), the per-waveform branch, the per-cycle
  dither.
- Open src/audio/synth/explosion.ts. Show the lowpass filter
  sweep + LFSR noise buffer. Note that each synth uses a
  different LFSR seed so they're bit-distinct when overlapping.
- Drag the ADSR sliders, click a Try button after each adjust.
  Talk through CR7 (no AudioParam.value writes, ever).

## Minute 18-26: CRT shader — three layers, three tiers

- Open the CRT shader chapter.
- Walk through the pipeline diagram: scene canvas → upload →
  persistence → composite.
- Push the phosphor decay slider to 0.99. Move the player on the
  game page (open in another tab) — the trail is comically
  long. Pull it back to 0 and show how cold modern flat panels
  feel.
- Push curvature to 0.3. The screen looks like a fishbowl.
- Open src/render/passes/composite.ts. Show the three fragment
  shader sources (Low / Mid / High). Talk through the tier
  ladder being build-time compiled, not runtime branched.
- Mention the RGBA16F vs RGBA8 banding analysis.

## Minute 26-30: architecture + Q&A

- Show the file tree: 7 src layers (foundation / render / audio
  / game / persistence / boot / companion). Show ESLint
  enforcing AB1 (game/ can't import audio/render/companion/debug).
- Show src/constants/computer-archeology.ts. Every ROM-derived
  constant has a citation. coverage test pins each value to its
  ROM address.
- Show DEVLOG.md. Walk through the Epic-by-Epic summaries.
- Show the post-v1 isolation list (issues labeled post-v1).
  Mention what's deliberately NOT in v1: collision detection
  (a real gap), the spectrum regression tests, follow-on
  Pac-Man / Galaxian.

## Backup talking points (if you have time)

- Why no game framework? The point is to demonstrate the
  underlying tech. A framework would hide the interesting parts.
- Why TypeScript strict? Because the project is a portfolio
  piece — every type error caught is one less embarrassment.
- Why no public deploy yet? The game still looks like
  placeholder rectangles game-wise (no collision = no death =
  no real game). Once collision lands and the visuals match the
  CRT effort, we'll publish.
