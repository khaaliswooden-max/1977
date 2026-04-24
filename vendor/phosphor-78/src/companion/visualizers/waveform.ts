// Companion waveform scope (story 5.5). Builds a small Web Audio
// graph: an oscillator + an AnalyserNode + a tap into the
// AudioContext destination so the visitor can see what kind of
// shape each waveform produces.
//
// Independent from the audio-preview module's context — this one
// stays silent (gain near zero) and exists purely to scope the
// waveform out to a canvas.

import { t } from '@/companion/i18n';
import { log } from '@/util/log';

const WAVEFORMS: ReadonlyArray<OscillatorType> = ['square', 'sawtooth', 'triangle', 'sine'];

export interface WaveformScope {
  readonly element: HTMLElement;
  dispose(): void;
}

interface ScopeState {
  ctx: AudioContext;
  osc: OscillatorNode;
  gain: GainNode;
  analyser: AnalyserNode;
  rafId: number;
}

let state: ScopeState | null = null;

function ensureState(): ScopeState | null {
  if (state) return state;
  try {
    const ctx = new (window.AudioContext ||
      (window as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext!)();
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    const gain = ctx.createGain();
    // Inaudibly quiet — but the AnalyserNode still gets the signal.
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    osc.connect(gain).connect(analyser).connect(ctx.destination);
    osc.start();
    state = { ctx, osc, gain, analyser, rafId: 0 };
    return state;
  } catch (e) {
    log.warn('waveform scope: audio context creation failed', e);
    return null;
  }
}

async function unlock(s: ScopeState): Promise<void> {
  if (s.ctx.state === 'suspended') {
    try {
      await s.ctx.resume();
    } catch (e) {
      log.warn('waveform scope: resume failed', e);
    }
  }
}

export function buildWaveformScope(): WaveformScope {
  const wrap = document.createElement('div');
  wrap.className = 'waveform-scope';
  const s = t();

  const heading = document.createElement('h3');
  heading.className = 'sub-heading';
  heading.textContent = s.waveformHeading;
  wrap.appendChild(heading);

  const help = document.createElement('p');
  help.className = 'note';
  help.textContent = s.waveformHelp;
  wrap.appendChild(help);

  const waveLabels: Record<OscillatorType, string> = {
    square: s.waveSquare,
    sawtooth: s.waveSawtooth,
    triangle: s.waveTriangle,
    sine: s.waveSine,
    custom: 'custom',
  };

  // Buttons row.
  const btnRow = document.createElement('div');
  btnRow.className = 'preview-row';
  const buttons: HTMLButtonElement[] = [];
  for (const w of WAVEFORMS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preview-btn';
    btn.textContent = waveLabels[w];
    btn.dataset['wave'] = w;
    btn.addEventListener('click', async () => {
      const st = ensureState();
      if (!st) return;
      await unlock(st);
      st.osc.type = w;
      for (const b of buttons) b.classList.toggle('active', b === btn);
    });
    buttons.push(btn);
    btnRow.appendChild(btn);
  }
  buttons[0]?.classList.add('active');
  wrap.appendChild(btnRow);

  // Canvas.
  const canvas = document.createElement('canvas');
  canvas.className = 'scope-canvas';
  canvas.width = 600;
  canvas.height = 160;
  wrap.appendChild(canvas);

  const ctx2d = canvas.getContext('2d')!;

  function draw(): void {
    const st = state;
    if (!st) {
      ctx2d.fillStyle = '#000';
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      ctx2d.fillStyle = '#888';
      ctx2d.font = '12px monospace';
      ctx2d.fillText(t().waveformPlaceholder, 12, 80);
      requestAnimationFrame(draw);
      return;
    }
    const buf = new Uint8Array(st.analyser.fftSize);
    st.analyser.getByteTimeDomainData(buf);
    ctx2d.fillStyle = '#000';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    ctx2d.strokeStyle = '#00ff66';
    ctx2d.lineWidth = 2;
    ctx2d.beginPath();
    const sliceWidth = canvas.width / buf.length;
    for (let i = 0; i < buf.length; i++) {
      const y = ((buf[i] ?? 128) / 255) * canvas.height;
      if (i === 0) ctx2d.moveTo(0, y);
      else ctx2d.lineTo(i * sliceWidth, y);
    }
    ctx2d.stroke();
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  return {
    element: wrap,
    dispose() {
      const st = state;
      if (!st) return;
      try {
        st.osc.stop();
      } catch {
        // already stopped
      }
      try {
        st.ctx.close();
      } catch {
        // already closed
      }
      state = null;
    },
  };
}
