// Story 5.13: companion-page i18n. The page now ships English and
// Chinese side by side; this module owns the language signal +
// strings table.
//
// Detection order on first visit:
//   1. localStorage saved choice (from prior session's toggle)
//   2. navigator.language starts with 'zh' → Chinese
//   3. fallback English
//
// Game-side modules never read this — only companion/* mounts.

import { signal, type Signal } from '@/util/signals';

export type Lang = 'en' | 'zh';

const LS_KEY = 'phosphor-78:companion-lang';

function detectInitialLang(): Lang {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LS_KEY);
      if (saved === 'en' || saved === 'zh') return saved;
    }
  } catch {
    // localStorage may throw under tight privacy settings; fall
    // through to the navigator check.
  }
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.language === 'string' &&
    navigator.language.toLowerCase().startsWith('zh')
  ) {
    return 'zh';
  }
  return 'en';
}

export const lang: Signal<Lang> = signal<Lang>(detectInitialLang());

lang.subscribe((l) => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LS_KEY, l);
  } catch {
    // Same as above — ignore storage failures.
  }
});

export interface Strings {
  // Header / nav / TOC
  readonly pageTitle: string;
  readonly brand: string;
  readonly navGame: string;
  readonly navCompanion: string;
  readonly contentsHeading: string;
  readonly tocCrt: string;
  readonly tocChip: string;
  readonly tocTiming: string;
  readonly behindHeading: string;
  readonly lede: string;
  readonly langSwitchAria: string;

  // CRT-shader sliders
  readonly sliderPhosphorDecay: string;
  readonly sliderScanlineDensity: string;
  readonly sliderCurvature: string;
  readonly sliderHalation: string;

  // Chip-synth section
  readonly adsrTitle: string;
  readonly adsrAttack: string;
  readonly adsrDecay: string;
  readonly adsrSustain: string;
  readonly adsrRelease: string;
  readonly filterCutoff: string;
  readonly tryItHeading: string;
  readonly previewShoot: string;
  readonly previewInvaderKilled: string;
  readonly previewPlayerExplosion: string;
  readonly previewUfoKilled: string;
  readonly previewToggleMarch: string;
  readonly previewToggleUfo: string;
  readonly chipNote: string;

  // Timing section
  readonly clockHeading: string;
  readonly clockWallTime: string;
  readonly clockAliens: string;
  readonly clockInterval: string;
  readonly clockPhase: string;
  readonly clockSliderLabel: string;
  readonly waveformHeading: string;
  readonly waveformHelp: string;
  readonly waveSquare: string;
  readonly waveSawtooth: string;
  readonly waveTriangle: string;
  readonly waveSine: string;
  readonly waveformPlaceholder: string;
}

const EN: Strings = {
  pageTitle: 'Phosphor 78 — Behind the Scenes',
  brand: 'Phosphor 78',
  navGame: 'Game',
  navCompanion: 'Behind the scenes',
  contentsHeading: 'Contents',
  tocCrt: 'CRT shader',
  tocChip: 'Chip synthesis',
  tocTiming: 'Audio-master timing',
  behindHeading: 'Behind the Scenes',
  lede:
    'Three pillars hold this project up: the WebGL2 CRT shader, ' +
    'the AudioWorklet chip-synth, and the audio-clock-master / ' +
    'frame-slave timing model. This page is where each is taken ' +
    'apart in public.',
  langSwitchAria: 'Switch language',

  sliderPhosphorDecay: 'Phosphor decay (0 = none, 1 = infinite trail)',
  sliderScanlineDensity: 'Scanline density (lines per pixel)',
  sliderCurvature: 'Curvature strength (0 = flat, 0.3 = strong barrel)',
  sliderHalation: 'Halation strength (bloom around bright pixels)',

  adsrTitle: 'ADSR envelope',
  adsrAttack: 'Attack (ms)',
  adsrDecay: 'Decay (ms)',
  adsrSustain: 'Sustain (0..1)',
  adsrRelease: 'Release (ms)',
  filterCutoff: 'Filter cutoff (Hz)',
  tryItHeading: 'Try it',
  previewShoot: 'Shoot',
  previewInvaderKilled: 'Invader killed',
  previewPlayerExplosion: 'Player explosion',
  previewUfoKilled: 'UFO killed',
  previewToggleMarch: 'Toggle march loop',
  previewToggleUfo: 'Toggle UFO drone',
  chipNote:
    "Note: ADSR / filter values are wired to audio/tunables signals " +
    "(story 3.6). Click a 'Try it' button after adjusting to hear " +
    "the new value.",

  clockHeading: 'Audio-master clock',
  clockWallTime: 'Wall time (s)',
  clockAliens: 'Remaining aliens N',
  clockInterval: 'Next-note interval (ms)',
  clockPhase: 'Current 4-step phase',
  clockSliderLabel:
    'Override remaining aliens (1-55) — drag to feel the tempo curve',
  waveformHeading: 'Live waveform',
  waveformHelp:
    'Pick a wave type below. The scope draws what the oscillator ' +
    'emits, sampled at 1024 points / frame.',
  waveSquare: 'square',
  waveSawtooth: 'sawtooth',
  waveTriangle: 'triangle',
  waveSine: 'sine',
  waveformPlaceholder: 'click a wave button to start the scope',
};

const ZH: Strings = {
  pageTitle: 'Phosphor 78 — 幕后',
  brand: 'Phosphor 78',
  navGame: '游戏',
  navCompanion: '幕后',
  contentsHeading: '目录',
  tocCrt: 'CRT 着色器',
  tocChip: '芯片合成音',
  tocTiming: '音频主时钟',
  behindHeading: '幕后',
  lede:
    '本项目由三根支柱撑起：WebGL2 CRT 着色器、AudioWorklet 芯片合成器，' +
    '以及音频主时钟 / 渲染从时钟的双时钟模型。这一页把它们一一拆开公示。',
  langSwitchAria: '切换语言',

  sliderPhosphorDecay: '荧光残留（0 = 无，1 = 无限拖尾）',
  sliderScanlineDensity: '扫描线密度（每像素行数）',
  sliderCurvature: '屏幕弧度（0 = 平面，0.3 = 强枕形）',
  sliderHalation: '光晕强度（亮像素周围的辉光）',

  adsrTitle: 'ADSR 包络',
  adsrAttack: 'Attack 起音（ms）',
  adsrDecay: 'Decay 衰减（ms）',
  adsrSustain: 'Sustain 持续（0..1）',
  adsrRelease: 'Release 释音（ms）',
  filterCutoff: '滤波截止频率（Hz）',
  tryItHeading: '试听',
  previewShoot: '玩家开火',
  previewInvaderKilled: '外星人被击毙',
  previewPlayerExplosion: '玩家爆炸',
  previewUfoKilled: 'UFO 被击毙',
  previewToggleMarch: '切换行进音循环',
  previewToggleUfo: '切换 UFO 持续音',
  chipNote:
    '说明：ADSR 与滤波值已与 audio/tunables 信号绑定（Story 3.6）。' +
    '调整后点击"试听"按钮即可听到新参数生效。',

  clockHeading: '音频主时钟',
  clockWallTime: '挂钟时间（秒）',
  clockAliens: '剩余外星人数 N',
  clockInterval: '下一拍间隔（毫秒）',
  clockPhase: '当前 4 步相位',
  clockSliderLabel: '覆盖剩余外星人数（1-55）—— 拖动感受节奏曲线',
  waveformHeading: '实时波形',
  waveformHelp: '选择下面的波形类型，示波器以每帧 1024 点采样画出振荡器的输出。',
  waveSquare: '方波',
  waveSawtooth: '锯齿波',
  waveTriangle: '三角波',
  waveSine: '正弦波',
  waveformPlaceholder: '点击波形按钮启动示波器',
};

export const STRINGS: Readonly<Record<Lang, Strings>> = { en: EN, zh: ZH };

/** Current strings table (snapshot — re-read after lang changes). */
export function t(): Strings {
  return STRINGS[lang.value];
}
