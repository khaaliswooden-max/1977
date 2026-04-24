// AB3: companion writes signals; render/audio modules only read.
// This helper builds a labeled range slider that two-way-binds to
// any Signal<number>. The rendered HTML is intentionally vanilla
// — no framework dependency.

import type { Signal } from '@/util/signals';

export interface SliderOptions {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** Display formatter for the current value (default: 3-decimal). */
  readonly format?: (value: number) => string;
}

export function buildSlider(
  signal: Signal<number>,
  opts: SliderOptions,
): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'slider';

  const labelText = document.createElement('span');
  labelText.className = 'slider-label';
  labelText.textContent = opts.label;

  const valueText = document.createElement('span');
  valueText.className = 'slider-value';
  const fmt = opts.format ?? ((v: number) => v.toFixed(3));

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(opts.min);
  input.max = String(opts.max);
  input.step = String(opts.step);
  input.value = String(signal.value);

  input.addEventListener('input', () => {
    const v = Number(input.value);
    if (Number.isFinite(v)) signal.set(v);
  });

  // Subscribe so external writes (e.g. another slider, or a reset
  // button) keep the slider visually in sync.
  signal.subscribe((v) => {
    valueText.textContent = fmt(v);
    if (input.value !== String(v)) input.value = String(v);
  });

  wrap.append(labelText, input, valueText);
  return wrap;
}
