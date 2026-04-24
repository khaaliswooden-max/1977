// AR9 + N2: Hot-tunable audio parameters exposed as signals.
//
// The companion / behind-the-scenes page reads-and-writes these to
// drive the live ADSR/filter sliders the visitor can interact with.
// Game-side code (audio/synth/*) only READS these via subscribe;
// per CR10 it never writes.
//
// Story 3.6 introduces the signal layer; story 5.4 wires the
// companion sliders to write into them.

import { signal, type Signal } from '@/util/signals';

// ─── ADSR envelope defaults ──────────────────────────────────────
//
// Sensible starting values that produce recognizable per-note
// shapes for the existing synths. The companion sliders in story
// 5.4 will let the visitor explore [0, 5000] ms ranges.

export const adsrAttackMs: Signal<number> = signal(5);
export const adsrDecayMs: Signal<number> = signal(50);
export const adsrSustain: Signal<number> = signal(0.6);
export const adsrReleaseMs: Signal<number> = signal(100);

// ─── Filter cutoff defaults ──────────────────────────────────────

export const filterCutoffHz: Signal<number> = signal(1500);

// ─── March pitch trim ────────────────────────────────────────────
//
// Lets the companion shift all 4 march pitches up/down by a fixed
// fraction (e.g. for fine-tuning during the spectrum-baseline pass
// in story 3.6 / 5.4). Default 1.0 = no shift.

export const marchPitchScale: Signal<number> = signal(1.0);
