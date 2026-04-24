// FR23 (live ADSR editor) wired to audio/tunables.
// 4 sliders bound to adsr{Attack,Decay,Sustain,Release} signals.

import {
  adsrAttackMs,
  adsrDecayMs,
  adsrReleaseMs,
  adsrSustain,
} from '@/audio/tunables';
import { t } from '@/companion/i18n';
import { buildSlider } from '@/companion/sliders/slider';

export function buildAdsrEditor(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'adsr-editor';
  const s = t();

  const title = document.createElement('h3');
  title.textContent = s.adsrTitle;
  title.className = 'sub-heading';
  wrap.appendChild(title);

  wrap.appendChild(
    buildSlider(adsrAttackMs, {
      label: s.adsrAttack,
      min: 0,
      max: 500,
      step: 1,
      format: (v) => `${v.toFixed(0)} ms`,
    }),
  );
  wrap.appendChild(
    buildSlider(adsrDecayMs, {
      label: s.adsrDecay,
      min: 0,
      max: 1000,
      step: 1,
      format: (v) => `${v.toFixed(0)} ms`,
    }),
  );
  wrap.appendChild(
    buildSlider(adsrSustain, {
      label: s.adsrSustain,
      min: 0,
      max: 1,
      step: 0.01,
      format: (v) => v.toFixed(2),
    }),
  );
  wrap.appendChild(
    buildSlider(adsrReleaseMs, {
      label: s.adsrRelease,
      min: 0,
      max: 2000,
      step: 1,
      format: (v) => `${v.toFixed(0)} ms`,
    }),
  );

  return wrap;
}
