// FR23 (live slider) wired to render/tunables.curvatureStrength.
// AB3: companion writes; render reads via subscribe.

import { t } from '@/companion/i18n';
import { curvatureStrength } from '@/render/tunables';
import { buildSlider } from '@/companion/sliders/slider';

export function buildCurvatureSlider(): HTMLElement {
  return buildSlider(curvatureStrength, {
    label: t().sliderCurvature,
    min: 0,
    max: 0.3,
    step: 0.01,
    format: (v) => v.toFixed(2),
  });
}
