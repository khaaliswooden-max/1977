// Companion visualizer for the audio-master clock (story 5.5).
//
// Shows three live-updating numbers:
//   • Audio clock now (s)            — ctx.currentTime
//   • Remaining-aliens N (settable)  — drives the tempo lookup
//   • Next-tone interval (ms)        — marchDelayInterrupts(N) * 16.67
//
// A small "alive aliens" slider lets the visitor scrub through the
// 1..55 range and watch how the inter-note interval drops, which
// is the music-as-mechanic story spelled out interactively.

import { t } from '@/companion/i18n';
import { marchDelayInterrupts, INTERRUPT_PERIOD_MS } from '@/constants/computer-archeology';

export interface AudioClockViz {
  readonly element: HTMLElement;
  start(): void;
  stop(): void;
}

export function buildAudioClockViz(): AudioClockViz {
  const wrap = document.createElement('div');
  wrap.className = 'audio-clock-viz';
  const s = t();

  const heading = document.createElement('h3');
  heading.className = 'sub-heading';
  heading.textContent = s.clockHeading;
  wrap.appendChild(heading);

  // Live readouts grid.
  const grid = document.createElement('div');
  grid.className = 'viz-grid';
  const [nowRow, nowVal] = makeRow(s.clockWallTime);
  const [aliensRow, aliensVal] = makeRow(s.clockAliens);
  const [intervalRow, intervalVal] = makeRow(s.clockInterval);
  const [stepRow, stepVal] = makeRow(s.clockPhase);
  grid.append(nowRow, aliensRow, intervalRow, stepRow);
  wrap.appendChild(grid);

  // Slider for N — visitor scrubs through alien counts.
  const sliderWrap = document.createElement('label');
  sliderWrap.className = 'slider';
  const sliderLabelSpan = document.createElement('span');
  sliderLabelSpan.className = 'slider-label';
  sliderLabelSpan.textContent = s.clockSliderLabel;
  const sliderRange = document.createElement('input');
  sliderRange.type = 'range';
  sliderRange.min = '1';
  sliderRange.max = '55';
  sliderRange.step = '1';
  sliderRange.value = '55';
  const sliderReadout = document.createElement('span');
  sliderReadout.className = 'slider-value';
  sliderReadout.textContent = '55';
  sliderWrap.append(sliderLabelSpan, sliderRange, sliderReadout);
  wrap.appendChild(sliderWrap);

  let aliveCount = 55;
  sliderRange.addEventListener('input', () => {
    aliveCount = Number(sliderRange.value);
    sliderReadout.textContent = String(aliveCount);
  });

  let rafId = 0;
  let started = false;
  let phase = 0;
  let phaseAccum = 0;
  let lastWall = performance.now();

  const tick = () => {
    const now = performance.now();
    const dtMs = now - lastWall;
    lastWall = now;
    const intervalMs = marchDelayInterrupts(aliveCount) * INTERRUPT_PERIOD_MS;
    phaseAccum += dtMs;
    while (phaseAccum >= intervalMs) {
      phaseAccum -= intervalMs;
      phase = (phase + 1) % 4;
    }
    nowVal.textContent = (now / 1000).toFixed(2);
    aliensVal.textContent = String(aliveCount);
    intervalVal.textContent = intervalMs.toFixed(1);
    stepVal.textContent = `${phase + 1} / 4`;
    rafId = requestAnimationFrame(tick);
  };

  return {
    element: wrap,
    start() {
      if (started) return;
      started = true;
      lastWall = performance.now();
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      if (!started) return;
      started = false;
      cancelAnimationFrame(rafId);
    },
  };
}

function makeRow(label: string): [HTMLElement, HTMLSpanElement] {
  const row = document.createElement('div');
  row.className = 'viz-row';
  const lab = document.createElement('span');
  lab.className = 'viz-label';
  lab.textContent = label;
  const val = document.createElement('span');
  val.className = 'viz-value';
  val.textContent = '—';
  row.append(lab, val);
  return [row, val];
}
