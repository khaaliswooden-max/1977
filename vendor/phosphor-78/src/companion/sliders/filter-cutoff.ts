// FR23 (live slider) wired to audio/tunables.filterCutoffHz.
// AB3: companion writes; audio reads via subscribe.

import { t } from '@/companion/i18n';
import { filterCutoffHz } from '@/audio/tunables';
import { buildSlider } from '@/companion/sliders/slider';

export function buildFilterCutoffSlider(): HTMLElement {
  return buildSlider(filterCutoffHz, {
    label: t().filterCutoff,
    min: 100,
    max: 8000,
    step: 50,
    format: (v) => `${v.toFixed(0)} Hz`,
  });
}
