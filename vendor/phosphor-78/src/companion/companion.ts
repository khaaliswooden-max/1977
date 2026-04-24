// Companion page content mount point. Story 5.6 added the long-form
// teaching prose (≥3000 words across 3 chapters); story 5.13 added
// Chinese translations and an in-page language toggle.

import { buildAudioPreview } from '@/companion/audio-preview';
import { lang, t } from '@/companion/i18n';
import { renderMarkdown } from '@/companion/markdown';
import { createMiniGame } from '@/companion/mini-game';
import { buildAdsrEditor } from '@/companion/sliders/adsr-editor';
import { buildCurvatureSlider } from '@/companion/sliders/curvature';
import { buildFilterCutoffSlider } from '@/companion/sliders/filter-cutoff';
import { buildHalationSlider } from '@/companion/sliders/halation';
import { buildPhosphorDecaySlider } from '@/companion/sliders/phosphor-decay';
import { buildScanlineDensitySlider } from '@/companion/sliders/scanline-density';
import { buildAudioClockViz } from '@/companion/visualizers/audio-clock';
import { buildWaveformScope } from '@/companion/visualizers/waveform';

import crtShaderEn from '@/companion/content/crt-shader.md?raw';
import crtShaderZh from '@/companion/content/crt-shader.zh.md?raw';
import chipSynthEn from '@/companion/content/chip-synth.md?raw';
import chipSynthZh from '@/companion/content/chip-synth.zh.md?raw';
import timingEn from '@/companion/content/timing.md?raw';
import timingZh from '@/companion/content/timing.zh.md?raw';

const PROSE = {
  en: { crt: crtShaderEn, chip: chipSynthEn, timing: timingEn },
  zh: { crt: crtShaderZh, chip: chipSynthZh, timing: timingZh },
} as const;

/**
 * Mount the three companion sections into `root`. Re-mounts whenever
 * the language signal changes — the entire content tree is rebuilt
 * because slider/preview/markdown text are all language-dependent.
 *
 * Subscribers are torn down on next call: each section's setup that
 * starts a rAF or sets a timer needs to be safe to abandon (the GC
 * cleans up the orphaned canvas / nodes once they leave the DOM).
 */
export function mountCompanionContent(root: HTMLElement): void {
  const render = (): void => {
    root.replaceChildren();
    root.appendChild(buildHeading());
    root.appendChild(buildCrtShaderSection());
    root.appendChild(buildChipSynthSection());
    root.appendChild(buildTimingSection());
    syncStaticChrome();
  };
  render();
  // First subscribe-call fires immediately with current value, so
  // skip that one to avoid a redundant double-render.
  let first = true;
  lang.subscribe(() => {
    if (first) {
      first = false;
      return;
    }
    render();
  });
}

/** Render the page-level h1 + lede that used to be in index.html. */
function buildHeading(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'page-heading';
  const h1 = document.createElement('h1');
  h1.textContent = t().behindHeading;
  const lede = document.createElement('p');
  lede.className = 'lede';
  lede.textContent = t().lede;
  wrap.append(h1, lede);
  return wrap;
}

/**
 * Update header / TOC / page title that live in index.html (outside
 * the #content mount point) so they also follow the language toggle.
 * Runs each render after the new content is in place.
 */
function syncStaticChrome(): void {
  const s = t();
  document.documentElement.lang = lang.value === 'zh' ? 'zh' : 'en';
  document.title = s.pageTitle;
  setText('.brand', s.brand);
  setText('.nav-link[data-nav="game"]', s.navGame);
  setText('.nav-link[data-nav="companion"]', s.navCompanion);
  setText('.toc h2', s.contentsHeading);
  setText('.toc a[href="#crt-shader"]', s.tocCrt);
  setText('.toc a[href="#chip-synth"]', s.tocChip);
  setText('.toc a[href="#timing"]', s.tocTiming);
  // Lang toggle highlight — see the companion-main.ts UI.
  document.querySelectorAll<HTMLButtonElement>('.lang-switch button').forEach(
    (btn) => {
      btn.classList.toggle('active', btn.dataset['lang'] === lang.value);
    },
  );
}

function setText(selector: string, value: string): void {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function buildCrtShaderSection(): HTMLElement {
  const section = document.createElement('section');
  section.id = 'crt-shader';

  const miniGameWrap = document.createElement('div');
  miniGameWrap.className = 'mini-game-wrap';
  const mini = createMiniGame();
  miniGameWrap.appendChild(mini.canvas);
  queueMicrotask(() => mini.start());

  const sliderGroup = document.createElement('div');
  sliderGroup.className = 'slider-group';
  sliderGroup.appendChild(buildPhosphorDecaySlider());
  sliderGroup.appendChild(buildScanlineDensitySlider());
  sliderGroup.appendChild(buildCurvatureSlider());
  sliderGroup.appendChild(buildHalationSlider());

  const prose = document.createElement('div');
  prose.className = 'prose';
  prose.innerHTML = renderMarkdown(PROSE[lang.value].crt);

  section.append(miniGameWrap, sliderGroup, prose);
  return section;
}

function buildChipSynthSection(): HTMLElement {
  const section = document.createElement('section');
  section.id = 'chip-synth';

  const sliderGroup = document.createElement('div');
  sliderGroup.className = 'slider-group';
  sliderGroup.appendChild(buildAdsrEditor());
  sliderGroup.appendChild(buildFilterCutoffSlider());

  const preview = buildAudioPreview();

  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = t().chipNote;

  const prose = document.createElement('div');
  prose.className = 'prose';
  prose.innerHTML = renderMarkdown(PROSE[lang.value].chip);

  section.append(sliderGroup, preview, note, prose);
  return section;
}

function buildTimingSection(): HTMLElement {
  const section = document.createElement('section');
  section.id = 'timing';

  const clockViz = buildAudioClockViz();
  queueMicrotask(() => clockViz.start());

  const waveform = buildWaveformScope();

  const prose = document.createElement('div');
  prose.className = 'prose';
  prose.innerHTML = renderMarkdown(PROSE[lang.value].timing);

  section.append(clockViz.element, waveform.element, prose);
  return section;
}
