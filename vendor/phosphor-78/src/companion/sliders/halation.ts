// FR23 (live slider) wired to render/tunables.halationStrength.
// AB3: companion writes; render reads via subscribe.

import { t } from '@/companion/i18n';
import { halationStrength } from '@/render/tunables';
import { buildSlider } from '@/companion/sliders/slider';

export function buildHalationSlider(): HTMLElement {
  return buildSlider(halationStrength, {
    label: t().sliderHalation,
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => v.toFixed(2),
  });
}
