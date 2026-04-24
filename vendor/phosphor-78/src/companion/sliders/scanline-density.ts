// FR23 (live slider) wired to render/tunables.scanlineDensity.
// AB3: companion writes; render reads via subscribe.

import { t } from '@/companion/i18n';
import { scanlineDensity } from '@/render/tunables';
import { buildSlider } from '@/companion/sliders/slider';

export function buildScanlineDensitySlider(): HTMLElement {
  return buildSlider(scanlineDensity, {
    label: t().sliderScanlineDensity,
    min: 1,
    max: 8,
    step: 0.1,
    format: (v) => v.toFixed(2),
  });
}
