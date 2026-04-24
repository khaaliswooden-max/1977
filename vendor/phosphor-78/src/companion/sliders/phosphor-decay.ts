// FR23 (live slider) wired to render/tunables.phosphorDecay.
// AB3: companion writes; render reads via subscribe.

import { t } from '@/companion/i18n';
import { phosphorDecay } from '@/render/tunables';
import { buildSlider } from '@/companion/sliders/slider';

export function buildPhosphorDecaySlider(): HTMLElement {
  return buildSlider(phosphorDecay, {
    label: t().sliderPhosphorDecay,
    min: 0,
    max: 0.99,
    step: 0.01,
    format: (v) => v.toFixed(2),
  });
}
